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
import { FrameController } from "../frame_controller";
var FrameElement = /** @class */ (function (_super) {
    __extends(FrameElement, _super);
    function FrameElement() {
        var _this = _super.call(this) || this;
        _this.controller = new FrameController(_this);
        return _this;
    }
    Object.defineProperty(FrameElement, "observedAttributes", {
        get: function () {
            return ["src"];
        },
        enumerable: false,
        configurable: true
    });
    FrameElement.prototype.connectedCallback = function () {
        this.controller.connect();
    };
    FrameElement.prototype.disconnectedCallback = function () {
        this.controller.disconnect();
    };
    FrameElement.prototype.attributeChangedCallback = function () {
        if (this.src && this.isActive) {
            var value = this.controller.visit(this.src);
            Object.defineProperty(this, "loaded", { value: value, configurable: true });
        }
    };
    FrameElement.prototype.formSubmissionIntercepted = function (element) {
        this.controller.formSubmissionIntercepted(element);
    };
    Object.defineProperty(FrameElement.prototype, "src", {
        get: function () {
            return this.getAttribute("src");
        },
        set: function (value) {
            if (value) {
                this.setAttribute("src", value);
            }
            else {
                this.removeAttribute("src");
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FrameElement.prototype, "loaded", {
        get: function () {
            return Promise.resolve(undefined);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FrameElement.prototype, "disabled", {
        get: function () {
            return this.hasAttribute("disabled");
        },
        set: function (value) {
            if (value) {
                this.setAttribute("disabled", "");
            }
            else {
                this.removeAttribute("disabled");
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FrameElement.prototype, "autoscroll", {
        get: function () {
            return this.hasAttribute("autoscroll");
        },
        set: function (value) {
            if (value) {
                this.setAttribute("autoscroll", "");
            }
            else {
                this.removeAttribute("autoscroll");
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FrameElement.prototype, "isActive", {
        get: function () {
            return this.ownerDocument === document && !this.isPreview;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FrameElement.prototype, "isPreview", {
        get: function () {
            var _a, _b;
            return (_b = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.documentElement) === null || _b === void 0 ? void 0 : _b.hasAttribute("data-turbo-preview");
        },
        enumerable: false,
        configurable: true
    });
    return FrameElement;
}(HTMLElement));
export { FrameElement };
customElements.define("turbo-frame", FrameElement);
//# sourceMappingURL=frame_element.js.map