import { Location } from "../location";
import { Snapshot } from "./snapshot";
export declare class SnapshotCache {
    readonly keys: string[];
    readonly size: number;
    snapshots: {
        [url: string]: Snapshot;
    };
    constructor(size: number);
    has(location: Location): boolean;
    get(location: Location): Snapshot | undefined;
    put(location: Location, snapshot: Snapshot): Snapshot;
    clear(): void;
    read(location: Location): Snapshot;
    write(location: Location, snapshot: Snapshot): void;
    touch(location: Location): void;
    trim(): void;
}
