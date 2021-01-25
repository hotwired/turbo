import { toCacheKey } from "../url"
import { PageSnapshot } from "./page_snapshot"

export class SnapshotCache {
  readonly keys: string[] = []
  readonly size: number
  snapshots: { [url: string]: PageSnapshot } = {}

  constructor(size: number) {
    this.size = size
  }

  has(location: URL) {
    return toCacheKey(location) in this.snapshots
  }

  get(location: URL): PageSnapshot | undefined {
    if (this.has(location)) {
      const snapshot = this.read(location)
      this.touch(location)
      return snapshot
    }
  }

  put(location: URL, snapshot: PageSnapshot) {
    this.write(location, snapshot)
    this.touch(location)
    return snapshot
  }

  clear() {
    this.snapshots = {}
  }

  // Private

  read(location: URL) {
    return this.snapshots[toCacheKey(location)]
  }

  write(location: URL, snapshot: PageSnapshot) {
    this.snapshots[toCacheKey(location)] = snapshot
  }

  touch(location: URL) {
    const key = toCacheKey(location)
    const index = this.keys.indexOf(key)
    if (index > -1) this.keys.splice(index, 1)
    this.keys.unshift(key)
    this.trim()
  }

  trim() {
    for (const key of this.keys.splice(this.size)) {
      delete this.snapshots[key]
    }
  }
}
