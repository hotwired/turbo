import { FetchResponse } from "./fetch_response";
import { Location } from "../core/location";
export interface FetchRequestDelegate {
    additionalHeadersForRequest?(request: FetchRequest): {
        [header: string]: string;
    };
    requestStarted(request: FetchRequest): void;
    requestPreventedHandlingResponse(request: FetchRequest, response: FetchResponse): void;
    requestSucceededWithResponse(request: FetchRequest, response: FetchResponse): void;
    requestFailedWithResponse(request: FetchRequest, response: FetchResponse): void;
    requestErrored(request: FetchRequest, error: Error): void;
    requestFinished(request: FetchRequest): void;
}
export declare enum FetchMethod {
    get = 0,
    post = 1,
    put = 2,
    patch = 3,
    delete = 4
}
export declare function fetchMethodFromString(method: string): FetchMethod | undefined;
export declare type FetchRequestBody = FormData;
export declare type FetchRequestHeaders = {
    [header: string]: string;
};
export interface FetchRequestOptions {
    headers: FetchRequestHeaders;
    body: FetchRequestBody;
    followRedirects: boolean;
}
export declare class FetchRequest {
    readonly delegate: FetchRequestDelegate;
    readonly method: FetchMethod;
    readonly location: Location;
    readonly body?: FetchRequestBody;
    readonly abortController: AbortController;
    constructor(delegate: FetchRequestDelegate, method: FetchMethod, location: Location, body?: FetchRequestBody);
    get url(): string;
    get params(): URLSearchParams;
    get entries(): [string, FormDataEntryValue][];
    cancel(): void;
    perform(): Promise<FetchResponse>;
    receive(response: Response): Promise<FetchResponse>;
    get fetchOptions(): RequestInit;
    get isIdempotent(): boolean;
    get headers(): {
        Accept: string;
    };
    get additionalHeaders(): {
        [header: string]: string;
    };
    get abortSignal(): AbortSignal;
}
