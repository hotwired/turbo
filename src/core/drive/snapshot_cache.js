import { DiskStore } from "./cache_stores/disk_store"
import { MemoryStore } from "./cache_stores/memory_store"

export class SnapshotCache {
  static currentStore = new MemoryStore(10)

  static setStore(storeName) {
    switch (storeName) {
      case "memory":
        SnapshotCache.currentStore = new MemoryStore(10)
        break
      case "disk":
        SnapshotCache.currentStore = new DiskStore()
        break
      default:
        throw new Error(`Invalid store name: ${storeName}`)
    }
  }

  has(location) {
    return SnapshotCache.currentStore.has(location)
  }

  get(location) {
    return SnapshotCache.currentStore.get(location)
  }

  put(location, snapshot) {
    return SnapshotCache.currentStore.put(location, snapshot)
  }

  clear() {
    return SnapshotCache.currentStore.clear()
  }
}
