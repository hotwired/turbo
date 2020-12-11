var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var StreamMessage = /** @class */ (function () {
    function StreamMessage(html) {
        this.templateElement = document.createElement("template");
        this.templateElement.innerHTML = html;
    }
    StreamMessage.wrap = function (message) {
        if (typeof message == "string") {
            return new this(message);
        }
        else {
            return message;
        }
    };
    Object.defineProperty(StreamMessage.prototype, "fragment", {
        get: function () {
            var fragment = document.createDocumentFragment();
            for (var _i = 0, _a = this.foreignElements; _i < _a.length; _i++) {
                var element = _a[_i];
                fragment.appendChild(document.importNode(element, true));
            }
            return fragment;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StreamMessage.prototype, "foreignElements", {
        get: function () {
            return this.templateChildren.reduce(function (streamElements, child) {
                if (child.tagName.toLowerCase() == "turbo-stream") {
                    return __spreadArrays(streamElements, [child]);
                }
                else {
                    return streamElements;
                }
            }, []);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StreamMessage.prototype, "templateChildren", {
        get: function () {
            return Array.from(this.templateElement.content.children);
        },
        enumerable: false,
        configurable: true
    });
    return StreamMessage;
}());
export { StreamMessage };
//# sourceMappingURL=stream_message.js.map