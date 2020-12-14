import { Adapter } from "./adapter";
import { FormSubmitObserver } from "./form_submit_observer";
import { FrameRedirector } from "./frame_redirector";
import { History } from "./history";
import { LinkClickObserver } from "./link_click_observer";
import { Location, Locatable } from "./location";
import { Navigator, NavigatorDelegate } from "./navigator";
import { PageObserver } from "./page_observer";
import { ScrollObserver } from "./scroll_observer";
import { StreamMessage } from "./stream_message";
import { StreamObserver } from "./stream_observer";
import { Action, Position, StreamSource } from "./types";
import { View } from "./view";
import { Visit, VisitOptions } from "./visit";
export declare type TimingData = {};
export declare class Controller implements NavigatorDelegate {
    adapter: Adapter;
    readonly navigator: Navigator;
    readonly history: History;
    readonly view: View;
    readonly pageObserver: PageObserver;
    readonly linkClickObserver: LinkClickObserver;
    readonly formSubmitObserver: FormSubmitObserver;
    readonly scrollObserver: ScrollObserver;
    readonly streamObserver: StreamObserver;
    readonly frameRedirector: FrameRedirector;
    enabled: boolean;
    progressBarDelay: number;
    started: boolean;
    start(): void;
    disable(): void;
    stop(): void;
    registerAdapter(adapter: Adapter): void;
    visit(location: Locatable, options?: Partial<VisitOptions>): void;
    startVisitToLocation(location: Locatable, restorationIdentifier: string, options?: Partial<VisitOptions>): void;
    connectStreamSource(source: StreamSource): void;
    disconnectStreamSource(source: StreamSource): void;
    renderStreamMessage(message: StreamMessage | string): void;
    clearCache(): void;
    setProgressBarDelay(delay: number): void;
    get location(): Location;
    get restorationIdentifier(): string;
    historyPoppedToLocationWithRestorationIdentifier(location: Location): void;
    scrollPositionChanged(position: Position): void;
    willFollowLinkToLocation(link: Element, location: Location): boolean;
    followedLinkToLocation(link: Element, location: Location): void;
    allowsVisitingLocation(location: Location): boolean;
    visitProposedToLocation(location: Location, options: Partial<VisitOptions>): void;
    visitStarted(visit: Visit): void;
    visitCompleted(visit: Visit): void;
    willSubmitForm(form: HTMLFormElement): boolean;
    formSubmitted(form: HTMLFormElement): void;
    pageBecameInteractive(): void;
    pageLoaded(): void;
    pageInvalidated(): void;
    receivedMessageFromStream(message: StreamMessage): void;
    viewWillRender(newBody: HTMLBodyElement): void;
    viewRendered(): void;
    viewInvalidated(): void;
    viewWillCacheSnapshot(): void;
    applicationAllowsFollowingLinkToLocation(link: Element, location: Location): boolean;
    applicationAllowsVisitingLocation(location: Location): boolean;
    notifyApplicationAfterClickingLinkToLocation(link: Element, location: Location): Event & {
        data: any;
    };
    notifyApplicationBeforeVisitingLocation(location: Location): Event & {
        data: any;
    };
    notifyApplicationAfterVisitingLocation(location: Location): Event & {
        data: any;
    };
    notifyApplicationBeforeCachingSnapshot(): Event & {
        data: any;
    };
    notifyApplicationBeforeRender(newBody: HTMLBodyElement): Event & {
        data: any;
    };
    notifyApplicationAfterRender(): Event & {
        data: any;
    };
    notifyApplicationAfterPageLoad(timing?: TimingData): Event & {
        data: any;
    };
    getActionForLink(link: Element): Action;
    turboDriveIsEnabled(link: Element): boolean;
    locationIsVisitable(location: Location): boolean;
}
//# sourceMappingURL=controller.d.ts.map