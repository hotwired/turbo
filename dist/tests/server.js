'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var express = require('express');

const router = express.Router();
const streamResponses = new Set;
router.post("/messages", (request, response) => {
    const { content } = request.body;
    if (typeof content == "string") {
        receiveMessage(content);
        response.sendStatus(201);
    }
    else {
        response.sendStatus(422);
    }
});
router.get("/messages", (request, response) => {
    response.set({
        "Cache-Control": "no-cache",
        "Content-Type": "text/event-stream",
        "Connection": "keep-alive"
    });
    response.on("close", () => {
        streamResponses.delete(response);
        response.end();
    });
    response.flushHeaders();
    response.write("data:\n\n");
    streamResponses.add(response);
});
function receiveMessage(content) {
    var _a;
    const data = renderSSEData(renderMessage(content));
    for (const response of streamResponses) {
        intern.log("delivering message to stream", (_a = response.socket) === null || _a === void 0 ? void 0 : _a.remotePort);
        response.write(data);
    }
}
function renderMessage(content) {
    return `
    <turbo-stream action="append" target="messages"><template>
      <div class="message">${escapeHTML(content)}</div>
    </template></turbo-stream>
  `;
}
function renderSSEData(data) {
    return `${data}`.split("\n").map(line => "data:" + line).join("\n") + "\n\n";
}
function escapeHTML(html) {
    return html.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}
const TestServer = router;

exports.TestServer = TestServer;
//# sourceMappingURL=server.js.map
