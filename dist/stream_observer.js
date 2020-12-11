import { StreamMessage } from "./stream_message";
var StreamObserver = /** @class */ (function () {
    function StreamObserver(delegate) {
        var _this = this;
        this.sources = new Set;
        this.started = false;
        this.handleMessage = function (event) {
            if (_this.started && typeof event.data == "string") {
                var message = new StreamMessage(event.data);
                _this.delegate.receivedMessageFromStream(message);
            }
        };
        this.delegate = delegate;
    }
    StreamObserver.prototype.start = function () {
        this.started = true;
    };
    StreamObserver.prototype.stop = function () {
        this.started = false;
    };
    StreamObserver.prototype.connectStreamSource = function (source) {
        if (!this.streamSourceIsConnected(source)) {
            this.sources.add(source);
            source.addEventListener("message", this.handleMessage, false);
        }
    };
    StreamObserver.prototype.disconnectStreamSource = function (source) {
        if (this.streamSourceIsConnected(source)) {
            this.sources.delete(source);
            source.removeEventListener("message", this.handleMessage, false);
        }
    };
    StreamObserver.prototype.streamSourceIsConnected = function (source) {
        return this.sources.has(source);
    };
    return StreamObserver;
}());
export { StreamObserver };
//# sourceMappingURL=stream_observer.js.map