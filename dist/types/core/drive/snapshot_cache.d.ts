import { Snapshot } from "./snapshot";
export declare class SnapshotCache {
    readonly keys: string[];
    readonly size: number;
    snapshots: {
        [url: string]: Snapshot;
    };
    constructor(size: number);
    has(location: URL): boolean;
    get(location: URL): Snapshot | undefined;
    put(location: URL, snapshot: Snapshot): Snapshot;
    clear(): void;
    read(location: URL): Snapshot;
    write(location: URL, snapshot: Snapshot): void;
    touch(location: URL): void;
    trim(): void;
}
