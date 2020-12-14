export declare type Locatable = Location | string;
export declare class Location {
    static get currentLocation(): Location;
    static wrap(locatable: Locatable): Location;
    static wrap(locatable?: Locatable | null): Location | undefined;
    readonly absoluteURL: string;
    readonly requestURL: string;
    readonly anchor?: string;
    constructor(url: string);
    getOrigin(): string;
    getPath(): string;
    getPathComponents(): string[];
    getLastPathComponent(): string;
    getExtension(): string;
    isHTML(): boolean;
    isPrefixedBy(location: Location): boolean;
    isEqualTo(location?: Location): boolean | undefined;
    toCacheKey(): string;
    toJSON(): string;
    toString(): string;
    valueOf(): string;
}
