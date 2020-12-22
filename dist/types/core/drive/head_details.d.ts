declare type ElementDetailMap = {
    [outerHTML: string]: ElementDetails;
};
declare type ElementDetails = {
    type?: ElementType;
    tracked: boolean;
    elements: Element[];
};
declare type ElementType = "script" | "stylesheet";
export declare class HeadDetails {
    readonly detailsByOuterHTML: ElementDetailMap;
    static fromHeadElement(headElement: HTMLHeadElement | null): HeadDetails;
    constructor(children: Element[]);
    getTrackedElementSignature(): string;
    getScriptElementsNotInDetails(headDetails: HeadDetails): Element[];
    getStylesheetElementsNotInDetails(headDetails: HeadDetails): Element[];
    getElementsMatchingTypeNotInDetails(matchedType: ElementType, headDetails: HeadDetails): Element[];
    getProvisionalElements(): Element[];
    getMetaValue(name: string): string | null;
    findMetaElementByName(name: string): Element | undefined;
}
export {};
