export var StreamActions = {
    append: function () {
        this.targetElement.append(this.templateContent);
    },
    prepend: function () {
        this.targetElement.prepend(this.templateContent);
    },
    replace: function () {
        this.targetElement.replaceWith(this.templateContent);
    },
    update: function () {
        this.targetElement.innerHTML = "";
        this.targetElement.append(this.templateContent);
    },
    remove: function () {
        this.targetElement.remove();
    }
};
//# sourceMappingURL=stream_actions.js.map