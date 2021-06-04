import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class PingTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/ping.html")
  }

  async "test pinging happens in the background"() {
    this.clickSelector("#single-ping")
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
  }

  async "test pinging a single URL"() {
    this.clickSelector("#single-ping")

    await this.nextEventNamed("turbo:before-fetch-request")
    const request = await this.nextEventNamed("turbo:before-fetch-request")
    this.assert.equal(request.fetchOptions.method, "POST")

    const responses = []
    responses.push(await this.nextEventNamed("turbo:before-fetch-response"))
    responses.push(await this.nextEventNamed("turbo:before-fetch-response"))

    const response = responses.find((response) => response.fetchResponse.response.url == "http://localhost:9000/__turbo/messages")
    this.assert.ok(response)
  }

  async "test pinging several URLs at once"() {
    this.clickSelector("#double-ping")

    await this.nextEventNamed("turbo:before-fetch-request")
    const request1 = await this.nextEventNamed("turbo:before-fetch-request")
    const request2 = await this.nextEventNamed("turbo:before-fetch-request")
    this.assert.equal(request1.fetchOptions.method, "POST")
    this.assert.equal(request2.fetchOptions.method, "POST")

    const responses = []
    responses.push(await this.nextEventNamed("turbo:before-fetch-response"))
    responses.push(await this.nextEventNamed("turbo:before-fetch-response"))
    responses.push(await this.nextEventNamed("turbo:before-fetch-response"))

    const response1 = responses.find((response) => response.fetchResponse.response.url == "http://localhost:9000/__turbo/messages/1")
    const response2 = responses.find((response) => response.fetchResponse.response.url == "http://localhost:9000/__turbo/messages/2")

    this.assert.ok(response1)
    this.assert.ok(response2)
  }
}

PingTests.registerSuite()
