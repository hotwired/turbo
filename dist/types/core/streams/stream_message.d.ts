import { StreamElement } from "../../elements/stream_element";
export declare class StreamMessage {
    readonly templateElement: HTMLTemplateElement;
    static wrap(message: StreamMessage | string): StreamMessage;
    constructor(html: string);
    get fragment(): DocumentFragment;
    get foreignElements(): StreamElement[];
    get templateChildren(): Element[];
}
