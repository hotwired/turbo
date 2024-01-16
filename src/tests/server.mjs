import express, { Router } from "express"
import bodyParser from "body-parser"
import multer from "multer"
import path from "path"
import url, { fileURLToPath } from "url"
import fs from "fs"
import { Eta } from "eta"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { json, urlencoded } = bodyParser

const router = Router()
const streamResponses = new Set()
const templateRenderer = new Eta({ views: path.join(__dirname, "templates") })

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

router.get("/posts", async (request, response) => {
  const { worker_id } = request.query

  const posts = await getPosts(worker_id)

  const res = templateRenderer.render("./posts", { posts, worker_id })

  response.type("html").status(200).send(res)
})

router.post("/posts", async (request, response) => {
  const { title, body, worker_id } = request.body

  await addPost(title, body, worker_id)

  response.redirect(303, `/__turbo/posts?worker_id=${worker_id}`)
})

router.get("/posts/:id/", async (request, response) => {
  const { worker_id } = request.query
  const { id } = request.params

  const posts = await getPosts(worker_id)
  const post = posts.find((post) => post.id == id)

  if (post) {
    const res = templateRenderer.render("./post", { post, worker_id })

    response.type("html").status(200).send(res)
  } else {
    response.sendStatus(404)
  }
})

router.post("/posts/:id", async (request, response) => {
  if (request.body._method == "delete") {
    const { worker_id } = request.body
    const { id } = request.params

    await deletePost(id, worker_id)
    response.redirect(303, `/__turbo/posts?worker_id=${worker_id}`)
  } else {
    response.sendStatus(422)
  }
})

router.post("/posts/:post_id/comments", async (request, response) => {
  const { post_id } = request.params
  const { worker_id } = request.body
  const { body } = request.body.comment

  const post = await getPost(post_id, worker_id)

  if (post) {
    await addComment(post_id, body, worker_id)

    response.redirect(303, `/__turbo/posts/${post_id}?worker_id=${worker_id}`)
  } else {
    response.sendStatus(404)
  }
})

const postsDatabaseName = (worker_id) => {
  return `src/tests/fixtures/volatile_posts_database_${worker_id}.json`
}

const ensureDatabase = async (worker_id) => {
  if (worker_id == null || worker_id == undefined) {
    throw new Error("worker_id is required")
  }

  if (!fs.existsSync(postsDatabaseName(worker_id))) {
    fs.writeFileSync(postsDatabaseName(worker_id), "[]")
  }
}

const getPosts = async (worker_id) => {
  await ensureDatabase(worker_id)

  return JSON.parse(fs.readFileSync(postsDatabaseName(worker_id)).toString())
}

const addPost = async (title, body, worker_id) => {
  await ensureDatabase(worker_id)
  const posts = await getPosts(worker_id)

  const id = posts.length + 1

  posts.push({ id, title, body })

  return fs.writeFileSync(postsDatabaseName(worker_id), JSON.stringify(posts))
}

const getPost = async (id, worker_id) => {
  await ensureDatabase(worker_id)
  const posts = await getPosts(worker_id)

  return posts.find((post) => post.id == id)
}

const deletePost = async (id, worker_id) => {
  await ensureDatabase(worker_id)
  const posts = await getPosts(worker_id)
  const newPosts = posts.filter((post) => post.id != id)

  return fs.writeFileSync(postsDatabaseName(worker_id), JSON.stringify(newPosts))
}

const addComment = async (postId, body, worker_id) => {
  await ensureDatabase(worker_id)
  const posts = await getPosts(worker_id)
  const post = posts.find((post) => post.id == postId)
  const comments = post.comments || []
  const id = comments.length + 1

  post.comments = comments
  post.comments.push({ id, body })

  return fs.writeFileSync(postsDatabaseName(worker_id), JSON.stringify(posts))
}

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
app.use(express.static("."))
app.use(/\/__turbo/, router)

const port = parseInt(process.env.PORT || "9000")

app.listen(port, () => {
  console.log(`Test server listening on port ${port}`)
})

export const TestServer = router
