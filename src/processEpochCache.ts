import AsyncEventEmitter from 'async-eventemitter';
import { StorageAccess, EventMap } from './types/types';
import ContinuousCache from './types/ContinuousCache';

// Update the processContinuousCache function to use the typed event emitter
export const processEpochCache = async (storageAccesses: StorageAccess[], caches: ContinuousCache[]) => {
  const blockNumbers = storageAccesses.reduce((acc, storageAccess) => {
    acc.add(storageAccess.blockNumber);
    return acc;
  }, new Set<number>());

  const orderedBlockNumbers = Array.from(blockNumbers.values()).sort();

  let epoch = 0;
  for (const blockNumber of orderedBlockNumbers) {
    const transactions = storageAccesses.filter((storageAccess) => storageAccess.blockNumber === blockNumber);

    // Emit process block event
    await caches.forEach(async (cache) => {
      cache.processBlock(blockNumber, transactions[0].blockTimestamp)
    })

    if (transactions[0].epoch !== epoch) {
      // Emit process epoch event
      epoch = transactions[0].epoch;
      await caches.forEach(async (cache) => {
        cache.processEpoch(transactions[0].epoch)
      })
    }
    for (const transaction of transactions) {
      // Emit process transaction event
      await caches.forEach(async (cache) => {
        cache.processTransaction(transaction)
      })
    }
  }
}