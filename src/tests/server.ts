import { Request, Response, Router } from "express"
import multer from "multer"
import path from "path"
import url from "url"
import fs from "fs"

const router = Router()
const streamResponses: Set<Response> = new Set()

router.use(multer().none())

router.use((request, response, next) => {
  if (request.accepts(["text/html", "application/xhtml+xml", "text/event-stream"])) {
    next()
  } else {
    response.sendStatus(422)
  }
})

router.post("/redirect", (request, response) => {
  const { path, sleep, ...query } = request.body
  const { pathname, query: searchParams } = url.parse(
    path ?? request.query.path ?? "/src/tests/fixtures/one.html",
    true
  )
  const enctype = request.get("Content-Type")
  if (enctype) {
    query.enctype = enctype
  }
  setTimeout(
    () => response.redirect(303, url.format({ pathname, query: { ...query, ...searchParams } })),
    parseInt(sleep || "0", 10)
  )
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

router.post("/reject/tall", (request, response) => {
  const { status } = request.body
  const fixture = path.join(__dirname, `../../src/tests/fixtures/422_tall.html`)

  response.status(parseInt(status || "422", 10)).sendFile(fixture)
})

router.post("/reject", (request, response) => {
  const { status } = request.body
  const fixture = path.join(__dirname, `../../src/tests/fixtures/${status}.html`)

  response.status(parseInt(status || "422", 10)).sendFile(fixture)
})

router.get("/headers", (request, response) => {
  const template = fs.readFileSync("src/tests/fixtures/headers.html").toString()
  response
    .type("html")
    .status(200)
    .send(template.replace("$HEADERS", JSON.stringify(request.headers, null, 4)))
})

router.get("/delayed_response", (request, response) => {
  const fixture = path.join(__dirname, "../../src/tests/fixtures/one.html")
  setTimeout(() => response.status(200).sendFile(fixture), 1000)
})

router.post("/messages", (request, response) => {
  const params = { ...request.body, ...request.query }
  const { content, status, type, target, targets } = params
  if (typeof content == "string") {
    receiveMessage(content, target)
    if (type == "stream" && acceptsStreams(request)) {
      response.type("text/vnd.turbo-stream.html; charset=utf-8")
      response.send(targets ? renderMessageForTargets(content, targets) : renderMessage(content, target))
    } else {
      response.sendStatus(parseInt(status || "201", 10))
    }
  } else {
    response.sendStatus(422)
  }
})

router.get("/stream-response", (request, response) => {
  const params = { ...request.body, ...request.query }
  const { content, target, targets } = params
  if (acceptsStreams(request)) {
    response.type("text/vnd.turbo-stream.html; charset=utf-8")
    response.send(targets ? renderMessageForTargets(content, targets) : renderMessage(content, target))
  } else {
    response.sendStatus(422)
  }
})

router.put("/messages/:id", (request, response) => {
  const { content, type } = request.body
  const { id } = request.params
  if (typeof content == "string") {
    receiveMessage(content)
    if (type == "stream" && acceptsStreams(request)) {
      response.type("text/vnd.turbo-stream.html; charset=utf-8")
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
    Connection: "keep-alive",
  })

  response.on("close", () => {
    streamResponses.delete(response)
    response.end()
  })

  response.flushHeaders()
  response.write("data:\n\n")
  streamResponses.add(response)
})

function receiveMessage(content: string, target?: string) {
  const data = renderSSEData(renderMessage(content, target))
  for (const response of streamResponses) {
    intern.log("delivering message to stream", response.socket?.remotePort)
    response.write(data)
  }
}

function renderMessage(content: string, target = "messages") {
  return `
    <turbo-stream action="append" target="${target}"><template>
      <div class="message">${escapeHTML(content)}</div>
    </template></turbo-stream>
  `
}

function renderMessageForTargets(content: string, targets: string) {
  return `
    <turbo-stream action="append" targets="${targets}"><template>
      <div class="message">${escapeHTML(content)}</div>
    </template></turbo-stream>
  `
}

function acceptsStreams(request: Request): boolean {
  return !!request.accepts("text/vnd.turbo-stream.html")
}

function renderSSEData(data: any) {
  return (
    `${data}`
      .split("\n")
      .map((line) => "data:" + line)
      .join("\n") + "\n\n"
  )
}

function escapeHTML(html: string) {
  return html.replace(/&/g, "&amp;").replace(/</g, "&lt;")
}

export const TestServer = router
