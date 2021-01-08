export declare class FetchResponse {
    readonly response: Response;
    constructor(response: Response);
    get succeeded(): boolean;
    get failed(): boolean;
    get clientError(): boolean;
    get serverError(): boolean;
    get redirected(): boolean;
    get location(): URL;
    get isHTML(): "" | RegExpMatchArray | null;
    get statusCode(): number;
    get contentType(): string | null;
    get responseText(): Promise<string>;
    get responseHTML(): Promise<string | undefined>;
    header(name: string): string | null;
}
