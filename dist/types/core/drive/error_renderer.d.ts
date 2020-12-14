import { RenderCallback, RenderDelegate, Renderer } from "./renderer";
export declare class ErrorRenderer extends Renderer {
    readonly delegate: RenderDelegate;
    readonly htmlElement: HTMLHtmlElement;
    readonly newHead: HTMLHeadElement;
    readonly newBody: HTMLBodyElement;
    static render(delegate: RenderDelegate, callback: RenderCallback, html: string): void;
    constructor(delegate: RenderDelegate, html: string);
    render(callback: RenderCallback): void;
    replaceHeadAndBody(): void;
    activateBodyScriptElements(): void;
    getScriptElements(): HTMLScriptElement[];
}
