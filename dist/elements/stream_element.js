var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { StreamActions } from "../stream_actions";
// <turbo-stream action=replace target=id><template>...
var StreamElement = /** @class */ (function (_super) {
    __extends(StreamElement, _super);
    function StreamElement() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StreamElement.prototype.connectedCallback = function () {
        try {
            this.actionFunction.call(this);
        }
        catch (error) {
            console.error(error);
        }
        finally {
            try {
                this.remove();
            }
            catch (_a) { }
        }
    };
    Object.defineProperty(StreamElement.prototype, "actionFunction", {
        get: function () {
            if (this.action) {
                var actionFunction = StreamActions[this.action];
                if (actionFunction) {
                    return actionFunction;
                }
                this.raise("unknown action");
            }
            this.raise("action attribute is missing");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StreamElement.prototype, "targetElement", {
        get: function () {
            var _a;
            if (this.target) {
                var targetElement = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.getElementById(this.target);
                if (targetElement) {
                    return targetElement;
                }
                this.raise("can't find target element");
            }
            this.raise("target attribute is missing");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StreamElement.prototype, "templateContent", {
        get: function () {
            return this.templateElement.content;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StreamElement.prototype, "templateElement", {
        get: function () {
            if (this.firstElementChild instanceof HTMLTemplateElement) {
                return this.firstElementChild;
            }
            this.raise("first child element must be a <template> element");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StreamElement.prototype, "action", {
        get: function () {
            return this.getAttribute("action");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StreamElement.prototype, "target", {
        get: function () {
            return this.getAttribute("target");
        },
        enumerable: false,
        configurable: true
    });
    StreamElement.prototype.raise = function (message) {
        throw new Error(this.description + ": " + message);
    };
    Object.defineProperty(StreamElement.prototype, "description", {
        get: function () {
            var _a, _b;
            return (_b = ((_a = this.outerHTML.match(/<[^>]+>/)) !== null && _a !== void 0 ? _a : [])[0]) !== null && _b !== void 0 ? _b : "<turbo-stream>";
        },
        enumerable: false,
        configurable: true
    });
    return StreamElement;
}(HTMLElement));
export { StreamElement };
customElements.define("turbo-stream", StreamElement);
//# sourceMappingURL=stream_element.js.map