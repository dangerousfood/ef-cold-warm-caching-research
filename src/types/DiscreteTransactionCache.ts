import ContinuousCache from "./ContinuousCache";
import DiscreteBlockCache from "./DiscreteBlockCacheContainer";
import { StorageAccess } from "./types";

class DiscreteTransactionCache extends DiscreteBlockCache {

  processTransaction(transaction: StorageAccess): void {
    this.clearCache(0)
    super.processTransaction(transaction)
  }
}
export default DiscreteTransactionCache;