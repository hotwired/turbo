import { FormInterceptor } from "./form_interceptor";
import { FrameElement } from "./elements/frame_element";
import { LinkInterceptor } from "./link_interceptor";
var FrameRedirector = /** @class */ (function () {
    function FrameRedirector(element) {
        this.element = element;
        this.linkInterceptor = new LinkInterceptor(this, element);
        this.formInterceptor = new FormInterceptor(this, element);
    }
    FrameRedirector.prototype.start = function () {
        this.linkInterceptor.start();
        this.formInterceptor.start();
    };
    FrameRedirector.prototype.stop = function () {
        this.linkInterceptor.stop();
        this.formInterceptor.stop();
    };
    FrameRedirector.prototype.shouldInterceptLinkClick = function (element, url) {
        return this.shouldRedirect(element);
    };
    FrameRedirector.prototype.linkClickIntercepted = function (element, url) {
        var frame = this.findFrameElement(element);
        if (frame) {
            frame.src = url;
        }
    };
    FrameRedirector.prototype.shouldInterceptFormSubmission = function (element, submitter) {
        return this.shouldRedirect(element, submitter);
    };
    FrameRedirector.prototype.formSubmissionIntercepted = function (element, submitter) {
        var frame = this.findFrameElement(element, submitter);
        if (frame) {
            frame.formSubmissionIntercepted(element, submitter);
        }
    };
    FrameRedirector.prototype.shouldRedirect = function (element, submitter) {
        var frame = this.findFrameElement(element, submitter);
        return frame ? frame != element.closest("turbo-frame") : false;
    };
    FrameRedirector.prototype.findFrameElement = function (element, submitter) {
        var id = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("data-turbo-frame")) || element.getAttribute("data-turbo-frame");
        if (id && id != "top") {
            var frame = this.element.querySelector("#" + id + ":not([disabled])");
            if (frame instanceof FrameElement) {
                return frame;
            }
        }
    };
    return FrameRedirector;
}());
export { FrameRedirector };
//# sourceMappingURL=frame_redirector.js.map