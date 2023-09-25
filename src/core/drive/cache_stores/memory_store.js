import { toCacheKey } from "../../url"

export class MemoryStore {
  keys = []
  snapshots = {}

  constructor(size) {
    this.size = size
  }

  async has(location) {
    return toCacheKey(location) in this.snapshots
  }

  async get(location) {
    if (await this.has(location)) {
      const snapshot = this.read(location)
      this.touch(location)
      return snapshot
    }
  }

  async put(location, snapshot) {
    this.write(location, snapshot)
    this.touch(location)
    return snapshot
  }

  async clear() {
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
