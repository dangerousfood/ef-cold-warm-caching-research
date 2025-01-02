import { PrismaClient } from "@prisma/client";
import ICache from "../interfaces/ICache";
import { EventMap, StorageAccess } from "./types";
import { Report } from "./types";

class ContinuousCache implements ICache, EventMap {
  cache: Map<string, number>;
  reports: Map<number, Report>;
  ttl: number;

  constructor(ttl: number) {
    this.cache = new Map<string, number>();
    this.reports = new Map<number, Report>();
    this.ttl = ttl;
    
  }
  processBlock(blockNumber: number, blockTimestamp: number) {
    this.initializeReport(blockNumber)
    this.clearCache(blockTimestamp)
  }

  initializeReport(blockNumber: number): void {
    this.reports.set(blockNumber, {
      hit: 0,
      hitRate: 0,
      miss: 0,
      missRate: 0,
      cacheSize: 0,
      unusedCacheSize: 0,
      unusedCacheRate: 0
    })
  }

  processEpoch(epoch: number): void {}
  processTransaction( transaction: StorageAccess) {
    if(this.cache.has(transaction.cacheKey)) {
      this.reports.get(transaction.blockNumber).hit += transaction.accessCount
    }
    else {
      this.reports.get(transaction.blockNumber).miss ++;
      this.reports.get(transaction.blockNumber).hit += (transaction.accessCount - 1)
    }
    
    this.cache.set(transaction.cacheKey, transaction.blockTimestamp + this.ttl)
    this.reports.get(transaction.blockNumber).cacheSize += 32
  }
  clearCache(blockTimestamp: number): void {
    this.cache.forEach((value, key) => {
      if(value < blockTimestamp) {
        this.cache.delete(key)
      }
    })
  }
  
  getTtl(): string {
    return (this.ttl) ? this.ttl.toString() : this.constructor.name
  }

  async deleteCache(prisma: PrismaClient): Promise<void> {
    const ttl = this.getTtl()
    await prisma.cache.deleteMany({
      where: {
        ttl: ttl,
      }
    })
  }

  async storeCache(prisma: PrismaClient): Promise<void> {
    const ttl = this.getTtl()
    this.cache.forEach((value, key) => {
      prisma.cache.create({
        data: {
          ttl: ttl,
          slot: key,
          accesscount: value
        }
      })
    })
  }

  async loadCache(prisma: PrismaClient): Promise<void> {
    const ttl = this.getTtl()
    const cache = await prisma.cache.findMany({
      where: {
        ttl: ttl,
      }
    })
    cache.forEach((item) => {
      this.cache.set(item.slot, item.accesscount)
    })
  }

  async storeReport(prisma: PrismaClient): Promise<void> {
    Promise.all(Array.from(this.reports.entries()).map(([key, value]) => {
      prisma.report.create({
        data: {
          ttl: this.getTtl(),
          blocknumber: key,
          hit: value.hit,
          miss: value.miss,
          cachesize: value.cacheSize,
          unusedcachesize: value.unusedCacheSize
        }
      })
    })).then(() => {
      this.reports.clear()
    })
  }
}

export default ContinuousCache;