import { Location } from "../location"
import { Snapshot } from "./snapshot"

export class SnapshotCache {
  readonly keys: string[] = []
  readonly size: number
  snapshots: { [url: string]: Snapshot } = {}

  constructor(size: number) {
    this.size = size
  }

  has(location: Location) {
    return location.toCacheKey() in this.snapshots
  }

  get(location: Location): Snapshot | undefined {
    if (this.has(location)) {
      const snapshot = this.read(location)
      this.touch(location)
      return snapshot
    }
  }

  put(location: Location, snapshot: Snapshot) {
    this.write(location, snapshot)
    this.touch(location)
    return snapshot
  }

  clear() {
    this.snapshots = {}
  }

  // Private

  read(location: Location) {
    return this.snapshots[location.toCacheKey()]
  }

  write(location: Location, snapshot: Snapshot) {
    this.snapshots[location.toCacheKey()] = snapshot
  }

  touch(location: Location) {
    const key = location.toCacheKey()
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
