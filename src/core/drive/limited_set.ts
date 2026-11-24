export class LimitedSet<T> extends Set<T> {
  declare maxSize: number

  constructor(maxSize: number) {
    super()
    this.maxSize = maxSize
  }

  // TODO(types): returns undefined at runtime, so it breaks Set#add's `this` contract (no chaining)
  // @ts-expect-error -- see above
  add(value: T): void {
    if (this.size >= this.maxSize) {
      const iterator = this.values()
      const oldestValue = iterator.next().value as T
      this.delete(oldestValue)
    }
    super.add(value)
  }
}
