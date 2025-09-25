export class LimitedMap extends Map {
  constructor(maxSize) {
    super()
    this.maxSize = maxSize
  }

  set(key, value) {
    if (!this.has(key) && this.size >= this.maxSize) {
      const firstKey = this.keys().next().value
      this.delete(firstKey)
    }
    return super.set(key, value)
  }
}
