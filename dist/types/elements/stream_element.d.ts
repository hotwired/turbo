export declare class StreamElement extends HTMLElement {
    connectedCallback(): Promise<void>;
    private renderPromise?;
    render(): Promise<void>;
    disconnect(): void;
    get performAction(): (this: StreamElement) => void;
    get targetElement(): HTMLElement | null;
    get templateContent(): DocumentFragment;
    get templateElement(): HTMLTemplateElement;
    get action(): string | null;
    get target(): string | null;
    private raise;
    private get description();
    private get beforeRenderEvent();
}
