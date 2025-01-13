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

const updateCachingAndTracking = async (caches: ContinuousCache[], lastepoch: number) => {
  
  const promises: Promise<any>[] = caches.map(async (cache) => {
    await cache.deleteCache(prisma)
    await cache.storeCache(prisma)
    await cache.storeReport(prisma)
  })
  promises.push(prisma.tracking.deleteMany())
  await Promise.all(promises)
  await prisma.tracking.create({
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
    console.log('restoring from cache')
    caches.forEach(async (cache) => {
      await cache.loadCache(prisma)
    })
    const {lastepoch} = await prisma.tracking.findFirst()
  
    if(lastepoch < startEpoch || lastepoch > endEpoch) {
      throw new Error('Invalid lastepoch')
    }
  }


  for(let currentEpoch = startEpoch; currentEpoch <= endEpoch; currentEpoch+=simultaneousQueries) {
    let end = simultaneousQueries;
    if(endEpoch - currentEpoch < simultaneousQueries) {
      end = endEpoch - currentEpoch
    }
    console.log('currentEpoch:', currentEpoch, 'end:', end, 'endEpoch:', endEpoch, 'startEpoch:', startEpoch)
    const cachedEpochs:CacheEpoch[] = [];
    for(let i = currentEpoch; i < currentEpoch + end; i++) {
      const cacheEpoch = new CacheEpoch(currentEpoch, process.env.NODE_URL, process.env.BEACON_API_URL)
      await cacheEpoch.create()
      cachedEpochs.push(cacheEpoch)
    }
    await Promise.all(cachedEpochs).then((epochs) => {
      epochs.forEach((epoch) => {
        console.log('storageAccesses:', epoch.storageAccesses.length);
        processEpochCache(epoch.storageAccesses, caches);
      })
    })
    await updateCachingAndTracking(caches, currentEpoch + end)
  }

  console.log('execution time:', (Date.now() / 1000) - start);
})();