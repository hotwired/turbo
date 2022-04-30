import intern from "intern"
import Test from "intern/lib/Test"
import { Tests } from "intern/lib/interfaces/object"

export class InternTestCase {
  readonly internTest: Test

  static registerSuite() {
    return intern.getInterface("object").registerSuite(this.name, { tests: this.tests })
  }

  static get tests(): Tests {
    return this.testNames.reduce((tests, testName): Tests => {
      return { ...tests, [testName]: (internTest) => this.runTest(internTest) }
    }, {} as Tests)
  }

  static get testNames(): string[] {
    return this.testKeys.map((key) => key.slice(5))
  }

  static get testKeys(): string[] {
    return Object.getOwnPropertyNames(this.prototype).filter((key) => key.match(/^test /))
  }

  static runTest(internTest: Test): Promise<void> {
    const testCase = new this(internTest)
    return testCase.runTest()
  }

  constructor(internTest: Test) {
    this.internTest = internTest
  }

  get testName() {
    return this.internTest.name
  }

  async runTest() {
    try {
      await this.setup()
      await this.beforeTest()
      await this.test()
      await this.afterTest()
    } finally {
      await this.teardown()
    }
  }

  get assert() {
    return intern.getPlugin("chai").assert
  }

  async setup() {}

  async beforeTest() {}

  get test(): () => Promise<void> {
    const method = (this as any)[`test ${this.testName}`]
    if (method != null && typeof method == "function") {
      return method
    } else {
      throw new Error(`No such test "${this.testName}"`)
    }
  }

  async afterTest() {}

  async teardown() {}
}
