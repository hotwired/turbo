import { toCacheKey } from "../url"
import { LRUCache } from "../lru_cache"

export class SnapshotCache extends LRUCache {
  constructor(size) {
    super(size, toCacheKey)
  }

  get snapshots() {
    return this.entries
  }
}
