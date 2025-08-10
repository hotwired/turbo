import express, { Router } from "express"
import bodyParser from "body-parser"
import multer from "multer"
import path from "path"
import url, { fileURLToPath } from "url"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { json, urlencoded } = bodyParser

const router = Router()
const streamResponses = new Set()

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
  const { path, ...query } = request.query
  const pathname = path ?? "/src/tests/fixtures/one.html"
  const enctype = request.get("Content-Type")
  if (enctype) {
    query.enctype = enctype
  }
  response.redirect(301, url.format({ pathname, query }))
})

router.post("/refresh", (request, response) => {
  const { sleep } = request.body
  setTimeout(() => response.redirect("back"), parseInt(sleep || "0", 10))
})

router.post("/reject/tall", (request, response) => {
  const { status } = request.body
  const fixture = path.join(__dirname, `../../src/tests/fixtures/422_tall.html`)

  response.status(parseInt(status || "422", 10)).sendFile(fixture)
})

router.post("/reject/morph", (request, response) => {
  const { status } = request.body
  const fixture = path.join(__dirname, `../../src/tests/fixtures/422_morph.html`)

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
  const { status } = request.query
  const fixture = path.join(__dirname, "../../src/tests/fixtures/one.html")
  setTimeout(() => response.status(parseInt(status || "200")).sendFile(fixture), 1000)
})

router.post("/messages", (request, response) => {
  const params = { ...request.body, ...request.query }
  const { content, id, status, type, target, targets } = params
  if (typeof content == "string") {
    receiveMessage(content, id, target)
    if (type == "stream" && acceptsStreams(request)) {
      response.type("text/vnd.turbo-stream.html; charset=utf-8")
      response.send(targets ? renderMessageForTargets(content, id, targets) : renderMessage(content, id, target))
    } else {
      response.sendStatus(parseInt(status || "201", 10))
    }
  } else {
    response.sendStatus(422)
  }
})

router.post("/refreshes", (request, response) => {
  const params = { ...request.body, ...request.query }
  const { requestId } = params

  if(acceptsStreams(request)){
    response.type("text/vnd.turbo-stream.html; charset=utf-8")
    response.send(renderPageRefresh(requestId))
  } else {
    response.sendStatus(201)
  }
})

router.get("/request_id_header", (request, response) => {
  const turboRequestHeader = request.get("X-Turbo-Request-Id")

  if (turboRequestHeader) {
    response.send(turboRequestHeader);
  } else {
    response.status(404).send("X-Turbo-Request header not found")
  }
})

router.post("/notfound", (request, response) => {
  response.type("html").status(404).send("<html><body><h1>Not found</h1></body></html>")
})

router.get("/stream-response", (request, response) => {
  const params = { ...request.body, ...request.query }
  const { content, target, targets } = params
  if (acceptsStreams(request)) {
    response.type("text/vnd.turbo-stream.html; charset=utf-8")
    response.send(targets ? renderMessageForTargets(content, null, targets) : renderMessage(content, target))
  } else {
    response.sendStatus(422)
  }
})

router.put("/messages/:id", (request, response) => {
  const { content, type } = request.body
  const { id } = request.params
  if (typeof content == "string") {
    receiveMessage(content, id)
    if (type == "stream" && acceptsStreams(request)) {
      response.type("text/vnd.turbo-stream.html; charset=utf-8")
      response.send(renderMessage(id + ": " + content, id))
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

router.get("/file.unknown_svg", (request, response) => {
  response.set({
    "Content-Type": "image/svg+xml"
  })
  response.sendFile(path.join(__dirname, "../../src/tests/fixtures/svg.svg"))
})

router.get("/file.unknown_html", (request, response) => {
  response.set({
    "Content-Type": "text/html"
  })
  response.sendFile(path.join(__dirname, "../../src/tests/fixtures/visit.html"))
})

function receiveMessage(content, id, target) {
  const data = renderSSEData(renderMessage(content, id, target))
  for (const response of streamResponses) {
    console.log("delivering message to stream", response.socket?.remotePort)
    response.write(data)
  }
}

function renderMessage(content, id, target = "messages") {
  return `
    <turbo-stream id="${id}" action="append" target="${target}"><template>
      <div class="message">${escapeHTML(content)}</div>
    </template></turbo-stream>
  `
}

function renderMessageForTargets(content, id, targets) {
  return `
    <turbo-stream id="${id}" action="append" targets="${targets}"><template>
      <div class="message">${escapeHTML(content)}</div>
    </template></turbo-stream>
  `
}

function renderPageRefresh(requestId) {
  return `
    <turbo-stream action="refresh" request-id="${requestId}"></turbo-stream>
  `
}

function acceptsStreams(request) {
  return !!request.accepts("text/vnd.turbo-stream.html")
}

function renderSSEData(data) {
  return (
    `${data}`
      .split("\n")
      .map((line) => "data:" + line)
      .join("\n") + "\n\n"
  )
}

function escapeHTML(html) {
  return html.replace(/&/g, "&amp;").replace(/</g, "&lt;")
}
const app = express()

app.use(json({ limit: "1mb" }), urlencoded({ extended: true }))
app.use(express.static(".", {
  setHeaders: (res, path) => {
    // Allow service workers from any subfolder to control the entire domain
    if (path.endsWith(".js") && path.includes("service_worker")) {
      res.set("Service-Worker-Allowed", "/")
    }
  }
}))
app.use(/\/__turbo/, router)

const port = parseInt(process.env.PORT || "9000")

app.listen(port, () => {
  console.log(`Test server listening on port ${port}`)
})

export const TestServer = router
