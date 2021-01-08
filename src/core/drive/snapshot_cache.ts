import { toCacheKey } from "../url"
import { Snapshot } from "./snapshot"

export class SnapshotCache {
  readonly keys: string[] = []
  readonly size: number
  snapshots: { [url: string]: Snapshot } = {}

  constructor(size: number) {
    this.size = size
  }

  has(location: URL) {
    return toCacheKey(location) in this.snapshots
  }

  get(location: URL): Snapshot | undefined {
    if (this.has(location)) {
      const snapshot = this.read(location)
      this.touch(location)
      return snapshot
    }
  }

  put(location: URL, snapshot: Snapshot) {
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

  write(location: URL, snapshot: Snapshot) {
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
