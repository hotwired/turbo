import { toCacheKey } from "../url"
import { LRUCache } from "../lru_cache"

export class SnapshotCache extends LRUCache {
  // Let pending writes detect explicit cache invalidation.
  generation = 0

  constructor(size) {
    super(size, toCacheKey)
  }

  get snapshots() {
    return this.entries
  }

  clear() {
    this.generation++
    super.clear()
  }
}
