import { Block, JsonRpcBlock } from "@ethereumjs/block"
import axios from "axios"
import { BeaconBlockResponse, CacheMap, Opcode, StorageAccess } from "./types"
import { AccessListBytes, Chain, Common } from "@ethereumjs/common"
import { loadKZG } from "kzg-wasm"
import { RPCBlockChain, RPCStateManager } from "@ethereumjs/statemanager"
import { TransactionType } from "@ethereumjs/tx"
import { SLOTS_PER_EPOCH } from "../constants"
import { VM } from "@ethereumjs/vm"

class CacheEpoch {

  epoch: number
  rpcUrl: string
  beaconUrl: string
  storageAccesses: StorageAccess[]
  constructor(
    epoch: number,
    rpcUrl: string,
    beaconUrl: string,
  ) {
    this.epoch = epoch
    this.rpcUrl = rpcUrl
    this.beaconUrl = beaconUrl
  }

  async getExecutionLayerBlockBySlot(
    beaconApiUrl: string,
    slot: number
  ): Promise<Block> {
    try {
      const response = await axios.get<BeaconBlockResponse>(
        `${beaconApiUrl}/eth/v2/beacon/blocks/${slot}`
      );
      // @ts-ignore
      console.log('response:', response.status);
      // @ts-ignore
      const blockNumber = response.data.data.message.body.execution_payload?.block_number;
      console.log('blockNumber:', blockNumber);
      if(!blockNumber || blockNumber === '0') {
        return null
      }
  
      const jsonRpcBlock = await this.getJsonRpcBlock(blockNumber)
      const common = await this.getCommonByJsonRpcBlock(jsonRpcBlock)
  
      return Block.fromRPC(jsonRpcBlock, [],{ common });
    } catch (error) {
      console.error('Error fetching block:', error);
      throw error;
    }
  }

  // Function to fetch a block from the Ethereum node
  async getJsonRpcBlock(blockNumber: string): Promise<JsonRpcBlock> {
    const payload = {
      jsonrpc: '2.0',
      method: 'eth_getBlockByNumber',
      params: ['0x' + BigInt(blockNumber).toString(16), true],
      id: 1,
    };

    try {
      const response = await axios.post(this.rpcUrl, payload);
      
      return response.data.result;
    } catch (error) {
      console.error('Error fetching block:', error);
      throw error;
    }
  }

  async getCommonByJsonRpcBlock (block: JsonRpcBlock):Promise<Common> {
    const kzg = await loadKZG();
    const common = new Common({
      chain: Chain.Mainnet,
      // @ts-ignore
      customCrypto: { kzg },
    });

    const hardfork = common.getHardforkBy({
      timestamp: block.timestamp,
      blockNumber: block.number
    })
    common.setHardfork(hardfork)
    return common
  }

  // Function to execute a block and log SLOAD operations
  async executeBlockWithLogging (beaconSlot: number, block: Block, blockchain: RPCBlockChain): Promise<StorageAccess[]> {
    const stateManager = new RPCStateManager({ provider: this.rpcUrl, blockTag: block.header.number - 1n, common: block.common })
    // @ts-ignore
    const vm = await VM.create({ common: block.common, stateManager, blockchain });

  let txHash = '';
  let accessList: AccessListBytes;
  vm.events.on('beforeTx', (tx) => {
    txHash = `0x${Buffer.from(tx.hash()).toString('hex')}`;
    accessList = tx[TransactionType.AccessListEIP2930].accessList as AccessListBytes;
  })

  const blockCache: CacheMap = new Map<string, StorageAccess>()
  // Subscribe to the `step` event to track each opcode
  vm.evm.events.on('step', (step) => {
    if (step.opcode.name === 'SLOAD' || step.opcode.name === 'SSTORE') {
      const address = step.address?.toString() || 'unknown';
      const slot = `0x${step.stack[step.stack.length - 1].toString(16)}`;

      const blockCacheKey = this.getGenericCacheIndexCombined(txHash, address, slot, step.opcode.name);

      const value = blockCache.get(blockCacheKey);
      if(value) {
        value.accessCount ++
      } else {
        blockCache.set(blockCacheKey, {
          cacheKey: blockCacheKey,
          epoch: Math.floor(beaconSlot / SLOTS_PER_EPOCH),
          blockNumber: Number(block.header.number),
          blockTimestamp: Number(block.header.timestamp),
          txHash: txHash,
          opcode: step.opcode.name,
          address: address,
          slot: slot,
          isWarm: false,
          accessCount: 1
        });
      }
    }
  });
  
  try {
    await vm.runBlock({
      block,
      clearCache: false,
      generate: true,
      skipBlockValidation: true,
      skipHeaderValidation: true,
      skipNonce: true,
      
    });
  } catch (error) {
    console.error(`Error executing block ${block.header.number}:`, error);
  }

  return Array.from(blockCache.values())
}

  getGenericCacheIndexCombined (txHash: string, address: string, slot: string, opcode: Opcode) {
    return `${txHash}-${address}-${slot}-${opcode}`
  }

  async create() {
    const startSlot = this.epoch * SLOTS_PER_EPOCH
    const blockchain = new RPCBlockChain(this.rpcUrl)
    const promises: Promise<StorageAccess[]>[] = []
    for(let slot = startSlot; slot < startSlot + SLOTS_PER_EPOCH; slot++) {
      const block = await this.getExecutionLayerBlockBySlot(this.beaconUrl, slot)
      if(!block) {
        continue
      }
      promises.push(this.executeBlockWithLogging(slot, block, blockchain))
    }
    this.storageAccesses = await Promise.all(promises).then((results) => {
      return results.flat()
    })
  }
}

export default CacheEpoch;