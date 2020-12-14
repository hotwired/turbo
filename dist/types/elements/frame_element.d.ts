import { FetchResponse } from "../fetch_response";
import { FrameController } from "../frame_controller";
export declare class FrameElement extends HTMLElement {
    readonly controller: FrameController;
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement): void;
    get src(): string | null;
    set src(value: string | null);
    get loaded(): Promise<FetchResponse | undefined>;
    get disabled(): boolean;
    set disabled(value: boolean);
    get autoscroll(): boolean;
    set autoscroll(value: boolean);
    get isActive(): boolean;
    get isPreview(): boolean;
}
