import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case";
export declare class NavigationTests extends TurboDriveTestCase {
    setup(): Promise<void>;
    "test after loading the page"(): Promise<void>;
    "test following a same-origin unannotated link"(): Promise<void>;
    "test following a same-origin data-turbo-action=replace link"(): Promise<void>;
    "test following a same-origin data-turbo=false link"(): Promise<void>;
    "test following a same-origin unannotated link inside a data-turbo=false container"(): Promise<void>;
    "test following a same-origin data-turbo=true link inside a data-turbo=false container"(): Promise<void>;
    "test following a same-origin anchored link"(): Promise<void>;
    "test following a same-origin link to a named anchor"(): Promise<void>;
    "test following a cross-origin unannotated link"(): Promise<void>;
    "test following a same-origin [target] link"(): Promise<void>;
    "test following a same-origin [download] link"(): Promise<void>;
    "test following a same-origin link inside an SVG element"(): Promise<void>;
    "test following a cross-origin link inside an SVG element"(): Promise<void>;
    "test clicking the back button"(): Promise<void>;
    "test clicking the forward button"(): Promise<void>;
}
