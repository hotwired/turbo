import { Request, Response, Router } from "express"
import multer from "multer"
import path from "path"
import url from "url"

const router = Router()
const streamResponses: Set<Response> = new Set

router.use(multer().none())

router.use((request, response, next) => {
  if (request.accepts(["text/html", "application/xhtml+xml"])) {
    next()
  } else {
    response.sendStatus(422)
  }
})

router.post("/redirect", (request, response) => {
  const { path, ...query } = request.body
  const pathname = path ?? "/src/tests/fixtures/one.html"
  const enctype = request.get("Content-Type")
  if (enctype) {
    query.enctype = enctype
  }
  response.redirect(303, url.format({ pathname, query }))
})

router.get("/redirect", (request, response) => {
  const { path, ...query } = request.query as any
  const pathname = path ?? "/src/tests/fixtures/one.html"
  const enctype = request.get("Content-Type")
  if (enctype) {
    query.enctype = enctype
  }
  response.redirect(301, url.format({ pathname, query }))
})

router.post("/reject", (request, response) => {
  const { status } = request.body
  const fixture = path.join(__dirname, `../../src/tests/fixtures/${status}.html`)

  response.status(parseInt(status || "422", 10)).sendFile(fixture)
})

router.post("/messages", (request, response) => {
  const { action, content, status, target, type } = request.body
  if (typeof content == "string") {
    receiveMessage(content, action, target)
    if (type == "stream" && acceptsStreams(request)) {
      response.type("text/vnd.turbo-stream.html; charset=utf-8")
      response.send(renderMessage(content, action, target))
    } else {
      response.sendStatus(parseInt(status || "201", 10))
    }
  } else {
    response.sendStatus(422)
  }
})

router.put("/messages/:id", (request, response) => {
  const { action, content, target, type } = request.body
  const { id } = request.params
  if (typeof content == "string") {
    receiveMessage(content, action, target, id)
    if (type == "stream" &&  acceptsStreams(request)) {
      response.type("text/vnd.turbo-stream.html; charset=utf-8")
      response.send(renderMessage(content, action, target, id))
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

function receiveMessage(content: string, action: string, target: string, id?: string) {
  const data = renderSSEData(renderMessage(content, action, target, id))
  for (const response of streamResponses) {
    intern.log("delivering message to stream", response.socket?.remotePort)
    response.write(data)
  }
}

function renderMessage(content: string, action: string, target: string, id?: string) {
  return `
    <turbo-stream action="${action}" target="${target}"><template>
      <div ${id ? `id="${id}"` : ""} class="message">${escapeHTML(content)}</div>
    </template></turbo-stream>
  `
}

function acceptsStreams(request: Request): boolean {
  return !!request.accepts("text/vnd.turbo-stream.html")
}

function renderSSEData(data: any) {
  return `${data}`.split("\n").map(line => "data:" + line).join("\n") + "\n\n"
}

function escapeHTML(html: string) {
  return html.replace(/&/g, "&amp;").replace(/</g, "&lt;")
}

export const TestServer = router
