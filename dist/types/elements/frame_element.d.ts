import { FetchResponse } from "../http/fetch_response";
import { FrameController } from "../core/frames/frame_controller";
export declare enum FrameLoadingStyle {
    eager = "eager",
    lazy = "lazy"
}
export declare class FrameElement extends HTMLElement {
    loaded: Promise<FetchResponse | void>;
    readonly controller: FrameController;
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string): void;
    formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement): void;
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
