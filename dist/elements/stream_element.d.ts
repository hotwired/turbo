export declare class StreamElement extends HTMLElement {
    connectedCallback(): void;
    get actionFunction(): (this: StreamElement) => void;
    get targetElement(): HTMLElement;
    get templateContent(): DocumentFragment;
    get templateElement(): HTMLTemplateElement;
    get action(): string | null;
    get target(): string | null;
    private raise;
    private get description();
}
//# sourceMappingURL=stream_element.d.ts.map