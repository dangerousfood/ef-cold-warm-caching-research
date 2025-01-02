import { ExecutionPayload } from '@ethereumjs/block';

export type CacheMap = Map<string, StorageAccess>;

export type TTL = 'transaction' | 'block' | 'epoch' | 'day' | 'week' | 'month' | 'sixMonth' | 'year'
export type Container = {
  ttl: TTL;
  cache: Map<string, number>;
  reports: Map<number, Report>;
}

export type EventMap = {
  processBlock(blockNumber: number, blockTimestamp: number): void;
  processEpoch(epoch: number): void;
  processTransaction(transaction: StorageAccess):void;
};

export type Report = {
  hit: number;
  hitRate: number;
  miss: number;
  missRate: number;
  cacheSize: number;
  unusedCacheSize: number;
  unusedCacheRate: number;
}

export type Opcode = 'SLOAD' | 'SSTORE'

// epoch, blockNumber, blockTimestamp, txHash, opcode, address, slot, isWarm, accessCount
export type StorageAccess = {
  cacheKey: string;
  epoch: number;
  blockNumber: number;
  blockTimestamp: number;
  txHash: string;
  opcode: Opcode;
  address: string;
  slot: string;
  isWarm: boolean;
  accessCount: number;
}

export interface BeaconBlockResponse {
  version: string;
  data: {
    root: string; // beacon block root
    message: {
      slot: string;
      body: {
        execution_payload: ExecutionPayload;
      }
      // ... other fields
    };
  };
}