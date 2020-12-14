var FormInterceptor = /** @class */ (function () {
    function FormInterceptor(delegate, element) {
        var _this = this;
        this.submitBubbled = function (event) {
            if (event.target instanceof HTMLFormElement) {
                var form = event.target;
                if (_this.delegate.shouldInterceptFormSubmission(form)) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    _this.delegate.formSubmissionIntercepted(form);
                }
            }
        };
        this.delegate = delegate;
        this.element = element;
    }
    FormInterceptor.prototype.start = function () {
        this.element.addEventListener("submit", this.submitBubbled);
    };
    FormInterceptor.prototype.stop = function () {
        this.element.removeEventListener("submit", this.submitBubbled);
    };
    return FormInterceptor;
}());
export { FormInterceptor };
//# sourceMappingURL=form_interceptor.js.map