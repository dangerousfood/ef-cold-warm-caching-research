import dotenv from 'dotenv';
dotenv.config();

import { processEpochCache } from './processEpochCache';
import CacheEpoch from './types/CacheEpoch';
import ContinuousCache from './types/ContinuousCache';
import DiscreteBlockCache from './types/DiscreteBlockCacheContainer';
import DiscreteEpochCache from './types/DiscreteEpochCacheContainer';
import DiscreteTransactionCache from './types/DiscreteTransactionCache';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const updateCachingAndTracking = (caches: ContinuousCache[], lastepoch: number) => {
  prisma.tracking.deleteMany()

  caches.forEach(async (cache) => {
    await cache.deleteCache(prisma)
    await cache.storeCache(prisma)
    await cache.storeReport(prisma)
  })
  prisma.tracking.create({
    data: {
      lastepoch: lastepoch
    }
  })
}
(async () => {

  const start = Date.now() / 1000
  console.log('start:', start);
  const startEpoch = parseInt(process.env.START_EPOCH)
  const endEpoch = parseInt(process.env.END_EPOCH)
  const restoreFromCache = process.env.RESTORE_FROM_CACHE === 'true'
  const simultaneousQueries = parseInt(process.env.SIMULTANEOUS_QUERIES)

  const caches: ContinuousCache[] = [
    new DiscreteTransactionCache(),
    new DiscreteBlockCache(),
    new DiscreteEpochCache(),
    new ContinuousCache(86400),
    new ContinuousCache(604800),
    new ContinuousCache(2629746),
    new ContinuousCache(162422400),
    new ContinuousCache(31536000),
  ]

  if(restoreFromCache) {
    caches.forEach(async (cache) => {
      await cache.loadCache(prisma)
    })
    const {lastepoch} = await prisma.tracking.findFirst()
  
    if(lastepoch < startEpoch || lastepoch > endEpoch) {
      throw new Error('Invalid lastepoch')
    }
  }


  for(let epoch = startEpoch; epoch <= endEpoch; epoch+=simultaneousQueries) {
    let epochEnd = simultaneousQueries;
    if(endEpoch - epoch < simultaneousQueries) {
      epochEnd = endEpoch - epoch
    }
    const cachedEpochs:CacheEpoch[] = [];
    for(let i = 0; i < epochEnd; i++) {
      const cacheEpoch = new CacheEpoch(epoch + i, process.env.NODE_URL, process.env.BEACON_API_URL)
      await cacheEpoch.create()
      cachedEpochs.push(cacheEpoch)
    }
    await Promise.all(cachedEpochs).then((epochs) => {
      epochs.forEach((epoch) => {
        console.log('storageAccesses:', epoch.storageAccesses.length);
        processEpochCache(epoch.storageAccesses, caches);
      })
    })
    updateCachingAndTracking(caches, epoch + epochEnd)
  }

  console.log('execution time:', (Date.now() / 1000) - start);
})();