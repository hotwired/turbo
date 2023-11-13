import { toCacheKey } from "../url"

export class SnapshotCache {
  keys = []
  snapshots = {}

  constructor(size) {
    this.size = size
  }

  has(location) {
    return toCacheKey(location) in this.snapshots
  }

  get(location) {
    if (this.has(location)) {
      const snapshot = this.read(location)
      this.touch(location)
      return snapshot
    }
  }

  put(location, snapshot) {
    this.write(location, snapshot)
    this.touch(location)
    return snapshot
  }

  clear() {
    this.snapshots = {}
  }

  // Private

  read(location) {
    return this.snapshots[toCacheKey(location)]
  }

  write(location, snapshot) {
    this.snapshots[toCacheKey(location)] = snapshot
  }

  touch(location) {
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
