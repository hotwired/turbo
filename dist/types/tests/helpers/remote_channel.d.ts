import { Remote } from "intern/lib/executors/Node";
export declare class RemoteChannel<T> {
    readonly remote: Remote;
    readonly identifier: string;
    private index;
    constructor(remote: Remote, identifier: string);
    read(length?: number): Promise<T[]>;
    drain(): Promise<void>;
    private get newRecords();
}
