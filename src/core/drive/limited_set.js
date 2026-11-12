export class LimitedSet extends Set {
  constructor(maxSize) {
    super()
    this.maxSize = maxSize
  }

  add(value) {
    if (this.size >= this.maxSize) {
      const iterator = this.values()
      const oldestValue = iterator.next().value
      this.delete(oldestValue)
    }
    super.add(value)
  }
}
