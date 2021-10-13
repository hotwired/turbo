import { toCacheKey } from "../url"
import { PageSnapshot } from "./page_snapshot"

const PERSISTENCE_KEY = '@hotwired/turbo/snapshots'

export class SnapshotCache {
  readonly keys: string[] = []
  readonly size: number
  readonly shouldPersist: boolean
  snapshots: { [url: string]: PageSnapshot } = {}

  constructor(size: number, shouldPersist = true) {
    this.size = size
    this.shouldPersist = shouldPersist
    this.hydrate()
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
    this.persist()
    return snapshot
  }

  clear() {
    this.snapshots = {}
    localStorage.removeItem(PERSISTENCE_KEY)
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
    const overflow = this.keys.splice(this.size);
    for (const key of overflow) {
      delete this.snapshots[key]
    }
    if(overflow.length > 0){
      this.persist()
    }
  }

  persist() {
    if(!this.shouldPersist) {
      return
    }
    const serializableSnapshots: {[key: string]: string} = {}
    this.keys.forEach((key) => {
      serializableSnapshots[key] = this.snapshots[key].toString()
    })
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(serializableSnapshots))
  }

  hydrate() {
    const serializedSnapshots = localStorage.getItem(PERSISTENCE_KEY)
    if(!serializedSnapshots || !this.shouldPersist) {
      return
    }
    const deserializedSnapshots: {[key: string]: string} = JSON.parse(serializedSnapshots)
    Object.keys(deserializedSnapshots).forEach((key) => {
      this.snapshots[key] = PageSnapshot.fromHTMLString(deserializedSnapshots[key])
    })
  }
}
