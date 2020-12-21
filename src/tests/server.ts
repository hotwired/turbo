import { Response, Router } from "express"

const router = Router()
const streamResponses: Set<Response> = new Set

router.post("/messages", (request, response) => {
  const { content } = request.body
  if (typeof content == "string") {
    receiveMessage(content)
    response.sendStatus(201)
  } else {
    response.sendStatus(422)
  }
})

router.get("/messages", (request, response) => {
  response.set({
    "Cache-Control": "no-cache",
    "Content-Type": "text/event-stream",
    "Connection": "keep-alive"
  })

  response.on("close", () => {
    streamResponses.delete(response)
    response.end()
  })

  response.flushHeaders()
  response.write("data:\n\n")
  streamResponses.add(response)
})

function receiveMessage(content: string) {
  const data = renderSSEData(renderMessage(content))
  for (const response of streamResponses) {
    intern.log("delivering message to stream", response.socket?.remotePort)
    response.write(data)
  }
}

function renderMessage(content: string) {
  return `
    <turbo-stream action="append" target="messages"><template>
      <div class="message">${escapeHTML(content)}</div>
    </template></turbo-stream>
  `
}

function renderSSEData(data: any) {
  return `${data}`.split("\n").map(line => "data:" + line).join("\n") + "\n\n"
}

function escapeHTML(html: string) {
  return html.replace(/&/g, "&amp;").replace(/</g, "&lt;")
}

export const TestServer = router
