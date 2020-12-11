import { StreamMessage } from "./stream_message";
import { StreamSource } from "./types";
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
    handleMessage: (event: MessageEvent) => void;
}
//# sourceMappingURL=stream_observer.d.ts.map