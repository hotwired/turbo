export declare type Locatable = URL | string;
export declare function expandPath(pathOrUrl: string | URL): URL;
export declare function anchor(url: URL): string;
export declare function getExtension(location: URL): string;
export declare function isHTML(location: URL): boolean;
export declare function isPrefixedBy(location: URL, prefix: URL): boolean;
export declare function toCacheKey(url: URL): string;
