var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
import { unindent } from "./util";
var ProgressBar = /** @class */ (function () {
    function ProgressBar() {
        var _this = this;
        this.hiding = false;
        this.value = 0;
        this.visible = false;
        this.trickle = function () {
            _this.setValue(_this.value + Math.random() / 100);
        };
        this.stylesheetElement = this.createStylesheetElement();
        this.progressElement = this.createProgressElement();
        this.installStylesheetElement();
        this.setValue(0);
    }
    Object.defineProperty(ProgressBar, "defaultCSS", {
        get: function () {
            return unindent(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      .turbo-progress-bar {\n        position: fixed;\n        display: block;\n        top: 0;\n        left: 0;\n        height: 3px;\n        background: #0076ff;\n        z-index: 9999;\n        transition:\n          width ", "ms ease-out,\n          opacity ", "ms ", "ms ease-in;\n        transform: translate3d(0, 0, 0);\n      }\n    "], ["\n      .turbo-progress-bar {\n        position: fixed;\n        display: block;\n        top: 0;\n        left: 0;\n        height: 3px;\n        background: #0076ff;\n        z-index: 9999;\n        transition:\n          width ", "ms ease-out,\n          opacity ", "ms ", "ms ease-in;\n        transform: translate3d(0, 0, 0);\n      }\n    "])), ProgressBar.animationDuration, ProgressBar.animationDuration / 2, ProgressBar.animationDuration / 2);
        },
        enumerable: false,
        configurable: true
    });
    ProgressBar.prototype.show = function () {
        if (!this.visible) {
            this.visible = true;
            this.installProgressElement();
            this.startTrickling();
        }
    };
    ProgressBar.prototype.hide = function () {
        var _this = this;
        if (this.visible && !this.hiding) {
            this.hiding = true;
            this.fadeProgressElement(function () {
                _this.uninstallProgressElement();
                _this.stopTrickling();
                _this.visible = false;
                _this.hiding = false;
            });
        }
    };
    ProgressBar.prototype.setValue = function (value) {
        this.value = value;
        this.refresh();
    };
    // Private
    ProgressBar.prototype.installStylesheetElement = function () {
        document.head.insertBefore(this.stylesheetElement, document.head.firstChild);
    };
    ProgressBar.prototype.installProgressElement = function () {
        this.progressElement.style.width = "0";
        this.progressElement.style.opacity = "1";
        document.documentElement.insertBefore(this.progressElement, document.body);
        this.refresh();
    };
    ProgressBar.prototype.fadeProgressElement = function (callback) {
        this.progressElement.style.opacity = "0";
        setTimeout(callback, ProgressBar.animationDuration * 1.5);
    };
    ProgressBar.prototype.uninstallProgressElement = function () {
        if (this.progressElement.parentNode) {
            document.documentElement.removeChild(this.progressElement);
        }
    };
    ProgressBar.prototype.startTrickling = function () {
        if (!this.trickleInterval) {
            this.trickleInterval = window.setInterval(this.trickle, ProgressBar.animationDuration);
        }
    };
    ProgressBar.prototype.stopTrickling = function () {
        window.clearInterval(this.trickleInterval);
        delete this.trickleInterval;
    };
    ProgressBar.prototype.refresh = function () {
        var _this = this;
        requestAnimationFrame(function () {
            _this.progressElement.style.width = 10 + (_this.value * 90) + "%";
        });
    };
    ProgressBar.prototype.createStylesheetElement = function () {
        var element = document.createElement("style");
        element.type = "text/css";
        element.textContent = ProgressBar.defaultCSS;
        return element;
    };
    ProgressBar.prototype.createProgressElement = function () {
        var element = document.createElement("div");
        element.className = "turbo-progress-bar";
        return element;
    };
    ProgressBar.animationDuration = 300; /*ms*/
    return ProgressBar;
}());
export { ProgressBar };
var templateObject_1;
//# sourceMappingURL=progress_bar.js.map