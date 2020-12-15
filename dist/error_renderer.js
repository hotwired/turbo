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
import { Renderer } from "./renderer";
import { array } from "./util";
var ErrorRenderer = /** @class */ (function (_super) {
    __extends(ErrorRenderer, _super);
    function ErrorRenderer(delegate, html) {
        var _this = _super.call(this) || this;
        _this.delegate = delegate;
        _this.htmlElement = (function () {
            var htmlElement = document.createElement("html");
            htmlElement.innerHTML = html;
            return htmlElement;
        })();
        _this.newHead = _this.htmlElement.querySelector("head") || document.createElement("head");
        _this.newBody = _this.htmlElement.querySelector("body") || document.createElement("body");
        return _this;
    }
    ErrorRenderer.render = function (delegate, callback, html) {
        return new this(delegate, html).render(callback);
    };
    ErrorRenderer.prototype.render = function (callback) {
        var _this = this;
        this.renderView(function () {
            _this.replaceHeadAndBody();
            _this.activateBodyScriptElements();
            callback();
        });
    };
    ErrorRenderer.prototype.replaceHeadAndBody = function () {
        var documentElement = document.documentElement, head = document.head, body = document.body;
        documentElement.replaceChild(this.newHead, head);
        documentElement.replaceChild(this.newBody, body);
    };
    ErrorRenderer.prototype.activateBodyScriptElements = function () {
        for (var _i = 0, _a = this.getScriptElements(); _i < _a.length; _i++) {
            var replaceableElement = _a[_i];
            var parentNode = replaceableElement.parentNode;
            if (parentNode) {
                var element = this.createScriptElement(replaceableElement);
                parentNode.replaceChild(element, replaceableElement);
            }
        }
    };
    ErrorRenderer.prototype.getScriptElements = function () {
        return array(document.documentElement.querySelectorAll("script"));
    };
    return ErrorRenderer;
}(Renderer));
export { ErrorRenderer };
//# sourceMappingURL=error_renderer.js.map