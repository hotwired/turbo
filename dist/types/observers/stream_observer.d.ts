import { FetchResponse } from "../http/fetch_response";
import { StreamMessage } from "../core/streams/stream_message";
import { StreamSource } from "../core/types";
export interface StreamObserverDelegate {
    receivedMessageFromStream(message: StreamMessage): void;
}
export declare class StreamObserver {
    readonly delegate: StreamObserverDelegate;
    readonly sources: Set<StreamSource>;
    private started;
    constructor(delegate: StreamObserverDelegate);
    start(): void;
    stop(): void;
    connectStreamSource(source: StreamSource): void;
    disconnectStreamSource(source: StreamSource): void;
    streamSourceIsConnected(source: StreamSource): boolean;
    inspectFetchResponse: EventListener;
    receiveMessageEvent: (event: MessageEvent) => void;
    receiveMessageResponse(response: FetchResponse): Promise<void>;
    receiveMessageHTML(html: string): void;
}
