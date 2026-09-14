const identity = key => key

export class LRUCache {
  keys = []
  entries = {}
  #toCacheKey

  constructor(size, toCacheKey = identity) {
    this.size = size
    this.#toCacheKey = toCacheKey
  }

  has(key) {
    return this.#toCacheKey(key) in this.entries
  }

  get(key) {
    if (this.has(key)) {
      const entry = this.read(key)
      this.touch(key)
      return entry
    }
  }

  put(key, entry) {
    this.write(key, entry)
    this.touch(key)
    return entry
  }

  clear() {
    for (const key of Object.keys(this.entries)) {
      this.evict(key)
    }
  }

  // Private

  read(key) {
    return this.entries[this.#toCacheKey(key)]
  }

  write(key, entry) {
    this.entries[this.#toCacheKey(key)] = entry
  }

  touch(key) {
    key = this.#toCacheKey(key)
    const index = this.keys.indexOf(key)
    if (index > -1) this.keys.splice(index, 1)
    this.keys.unshift(key)
    this.trim()
  }

  trim() {
    for (const key of this.keys.splice(this.size)) {
      this.evict(key)
    }
  }

  evict(key) {
    delete this.entries[key]
  }
}
