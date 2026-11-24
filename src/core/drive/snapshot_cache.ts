import { toCacheKey } from "../url"
import { LRUCache } from "../lru_cache"
import type { PageSnapshot } from "./page_snapshot"

export class SnapshotCache extends LRUCache<URL, PageSnapshot, string> {
  // Let pending writes detect explicit cache invalidation.
  generation = 0

  constructor(size: number) {
    super(size, toCacheKey)
  }

  get snapshots(): Partial<Record<string, PageSnapshot>> {
    return this.entries
  }

  override clear(): void {
    this.generation++
    super.clear()
  }
}
