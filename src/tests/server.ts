import { Response, Router } from "express"
import multer from "multer"
import path from "path"

const router = Router()
const streamResponses: Set<Response> = new Set

router.use(multer().none())

router.post("/redirect", (request, response) => {
  const path = request.body.path ?? "/src/tests/fixtures/one.html"
  response.redirect(303, path)
})

router.post("/reject", (request, response) => {
  const { status } = request.body
  const fixture = path.join(__dirname, `../../src/tests/fixtures/${status}.html`)

  response.status(parseInt(status || "422", 10)).sendFile(fixture)
})

router.post("/messages", (request, response) => {
  const { content, type } = request.body
  if (typeof content == "string") {
    receiveMessage(content)
    if (type == "stream") {
      response.type("application/vnd.turbo.stream.html; charset=utf-8") // the charset parameter should not be sent, but let's be liberal in what we accept
      response.send(renderMessage(content))
    } else {
      response.sendStatus(201)
    }
  } else {
    response.sendStatus(422)
  }
})

router.put("/messages/:id", (request, response) => {
  const { content, type } = request.body
  const { id } = request.params
  if (typeof content == "string") {
    receiveMessage(content)
    if (type == "stream") {
      response.type("application/vnd.turbo.stream.html")
      response.send(renderMessage(id + ": " + content))
    } else {
      response.sendStatus(200)
    }
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
