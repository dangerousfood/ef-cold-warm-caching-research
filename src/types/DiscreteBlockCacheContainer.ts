import ContinuousCache from "./ContinuousCache";

class DiscreteBlockCache extends ContinuousCache {

  constructor() {
    super(0);
  }

  clearCache(blockTimestamp: number): void {
    this.cache.clear()
  }
}

export default DiscreteBlockCache;