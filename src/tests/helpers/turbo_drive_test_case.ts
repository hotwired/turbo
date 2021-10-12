import { FunctionalTestCase } from "./functional_test_case"
import { RemoteChannel } from "./remote_channel"
import { Element } from "@theintern/leadfoot"

type EventLog = [string, any, string | null]
type MutationLog = [string, string | null, string | null]

export class TurboDriveTestCase extends FunctionalTestCase {
  eventLogChannel: RemoteChannel<EventLog> = new RemoteChannel(this.remote, "eventLogs")
  mutationLogChannel: RemoteChannel<MutationLog> = new RemoteChannel(this.remote, "mutationLogs")
  lastBody?: Element

  async beforeTest() {
    await this.drainEventLog()
    this.lastBody = await this.body
  }

  get nextWindowHandle(): Promise<string> {
    return (async (nextHandle?: string) => {
      do {
        const handle = await this.remote.getCurrentWindowHandle()
        const handles = await this.remote.getAllWindowHandles()
        nextHandle = handles[handles.indexOf(handle) + 1]
      } while (!nextHandle)
      return nextHandle
    })()
  }

  async nextEvent(): Promise<EventLog> {
    let record: EventLog | undefined
    while (!record) {
      [ record ] = await this.eventLogChannel.read(1)
    }
    return record
  }

  async nextEventNamed(eventName: string): Promise<any> {
    let record: EventLog | undefined
    while (!record) {
      const records = await this.eventLogChannel.read(1)
      record = records.find(([name]) => name == eventName)
    }
    return record[1]
  }

  async noNextEventNamed(eventName: string): Promise<boolean> {
    const records = await this.eventLogChannel.read(1)
    return !records.some(([name]) => name == eventName)
  }

  async nextEventOnTarget(elementId: string, eventName: string): Promise<any> {
    let record: EventLog | undefined
    while (!record) {
      const records = await this.eventLogChannel.read(1)
      record = records.find(([name, _, id]) => name == eventName && id == elementId)
    }
    return record[1]
  }

  async nextAttributeMutationNamed(elementId: string, attributeName: string): Promise<string | null> {
    let record: MutationLog | undefined
    while (!record) {
      const records = await this.mutationLogChannel.read(1)
      record = records.find(([name, id]) => name == attributeName && id == elementId)
    }
    const attributeValue = record[2]
    return attributeValue
  }

  get nextBody(): Promise<Element> {
    return (async () => {
      let body
      do body = await this.changedBody
      while (!body)
      return this.lastBody = body
    })()
  }

  get changedBody(): Promise<Element | undefined> {
    return (async () => {
      const body = await this.body
      if (!this.lastBody || this.lastBody.elementId != body.elementId) {
        return body
      }
    })()
  }

  get visitAction(): Promise<string> {
    return this.evaluate(() => {
      try {
        return window.Turbo.navigator.currentVisit!.action
      } catch (error) {
        return "load"
      }
    })
  }

  drainEventLog() {
    return this.eventLogChannel.drain()
  }
}
