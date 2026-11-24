const identity = <K>(key: K): K => key

export class LRUCache<K, V, C extends PropertyKey = PropertyKey> {
  keys: C[] = []
  entries: Partial<Record<C, V>> = {}
  #toCacheKey: (key: K) => C
  declare size: number

  constructor(size: number, toCacheKey: (key: K) => C = identity as (key: K) => C) {
    this.size = size
    this.#toCacheKey = toCacheKey
  }

  has(key: K): boolean {
    return this.#toCacheKey(key) in this.entries
  }

  get(key: K): V | undefined {
    if (this.has(key)) {
      const entry = this.read(key)
      this.touch(key)
      return entry
    }
  }

  put(key: K, entry: V): V {
    this.write(key, entry)
    this.touch(key)
    return entry
  }

  clear(): void {
    for (const key of Object.keys(this.entries) as C[]) {
      this.evict(key)
    }
  }

  // Private

  read(key: K): V | undefined {
    return this.entries[this.#toCacheKey(key)]
  }

  write(key: K, entry: V): void {
    this.entries[this.#toCacheKey(key)] = entry
  }

  touch(key: K): void {
    const cacheKey = this.#toCacheKey(key)
    const index = this.keys.indexOf(cacheKey)
    if (index > -1) this.keys.splice(index, 1)
    this.keys.unshift(cacheKey)
    this.trim()
  }

  trim(): void {
    for (const key of this.keys.splice(this.size)) {
      this.evict(key)
    }
  }

  evict(key: C): void {
    delete this.entries[key]
  }
}
