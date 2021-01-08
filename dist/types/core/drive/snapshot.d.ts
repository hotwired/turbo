import { HeadDetails } from "./head_details";
export declare class Snapshot {
    static wrap(value: Snapshot | string | HTMLHtmlElement): Snapshot;
    static fromHTMLString(html: string): Snapshot;
    static fromHTMLElement(htmlElement: HTMLHtmlElement): Snapshot;
    readonly headDetails: HeadDetails;
    readonly bodyElement: HTMLBodyElement;
    constructor(headDetails: HeadDetails, bodyElement: HTMLBodyElement);
    clone(): Snapshot;
    getRootLocation(): URL;
    getCacheControlValue(): string | undefined;
    getElementForAnchor(anchor: string): Element | null;
    getPermanentElements(): Element[];
    getPermanentElementById(id: string): Element | null;
    getPermanentElementsPresentInSnapshot(snapshot: Snapshot): Element[];
    findFirstAutofocusableElement(): Element | null;
    hasAnchor(anchor: string): boolean;
    isPreviewable(): boolean;
    isCacheable(): boolean;
    isVisitable(): boolean;
    getSetting(name: string): string | undefined;
    getSetting(name: string, defaultValue: string): string;
}
