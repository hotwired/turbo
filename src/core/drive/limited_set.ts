export class LimitedSet<T> extends Set<T> {
  declare readonly maxSize: number

  constructor(maxSize: number) {
    super()
    this.maxSize = maxSize
  }

  // TODO(types): returns undefined at runtime, breaking Set#add's `this` contract (no chaining).
  // Declared as `this` so the emitted declarations stay valid for consumers.
  // @ts-expect-error -- see above
  override add(value: T): this {
    if (this.size >= this.maxSize) {
      const iterator = this.values()
      const oldestValue = iterator.next().value as T
      this.delete(oldestValue)
    }
    super.add(value)
  }
}
