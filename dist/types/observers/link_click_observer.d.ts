import { Location } from "../core/location";
export interface LinkClickObserverDelegate {
    willFollowLinkToLocation(link: Element, location: Location): boolean;
    followedLinkToLocation(link: Element, location: Location): void;
}
export declare class LinkClickObserver {
    readonly delegate: LinkClickObserverDelegate;
    started: boolean;
    constructor(delegate: LinkClickObserverDelegate);
    start(): void;
    stop(): void;
    clickCaptured: () => void;
    clickBubbled: (event: MouseEvent) => void;
    clickEventIsSignificant(event: MouseEvent): boolean;
    findLinkFromClickTarget(target: EventTarget | null): Element | null | undefined;
    getLocationForLink(link: Element): Location;
}
