import { FetchResponse } from "../http/fetch_response";
export declare enum FrameLoadingStyle {
    eager = "eager",
    lazy = "lazy"
}
export interface FrameElementDelegate {
    connect(): void;
    disconnect(): void;
    loadingStyleChanged(): void;
    sourceURLChanged(): void;
    formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement): void;
    loadResponse(response: FetchResponse): void;
    isLoading: boolean;
}
export declare class FrameElement extends HTMLElement {
    static delegateConstructor: new (element: FrameElement) => FrameElementDelegate;
    loaded: Promise<FetchResponse | void>;
    readonly delegate: FrameElementDelegate;
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string): void;
    get src(): string | null;
    set src(value: string | null);
    get loading(): FrameLoadingStyle;
    set loading(value: FrameLoadingStyle);
    get disabled(): boolean;
    set disabled(value: boolean);
    get autoscroll(): boolean;
    set autoscroll(value: boolean);
    get complete(): boolean;
    get isActive(): boolean;
    get isPreview(): boolean;
}
