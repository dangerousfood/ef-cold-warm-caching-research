import ContinuousCache from "./ContinuousCache";

class DiscreteEpochCache extends ContinuousCache {

  constructor() {
    super(0);
  }

  processEpoch(epoch: number) {
    this.cache.clear()
  }

  processBlock(blockNumber: number, blockTimestamp: number) {
    this.initializeReport(blockNumber)
  }
}

export default DiscreteEpochCache;