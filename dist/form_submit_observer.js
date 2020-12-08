var FormSubmitObserver = /** @class */ (function () {
    function FormSubmitObserver(delegate) {
        var _this = this;
        this.started = false;
        this.submitCaptured = function () {
            removeEventListener("submit", _this.submitBubbled, false);
            addEventListener("submit", _this.submitBubbled, false);
        };
        this.submitBubbled = function (event) {
            if (!event.defaultPrevented) {
                var form = event.target instanceof HTMLFormElement ? event.target : undefined;
                if (form) {
                    if (_this.delegate.willSubmitForm(form)) {
                        event.preventDefault();
                        _this.delegate.formSubmitted(form);
                    }
                }
            }
        };
        this.delegate = delegate;
    }
    FormSubmitObserver.prototype.start = function () {
        if (!this.started) {
            addEventListener("submit", this.submitCaptured, true);
            this.started = true;
        }
    };
    FormSubmitObserver.prototype.stop = function () {
        if (this.started) {
            removeEventListener("submit", this.submitCaptured, true);
            this.started = false;
        }
    };
    return FormSubmitObserver;
}());
export { FormSubmitObserver };
//# sourceMappingURL=form_submit_observer.js.map