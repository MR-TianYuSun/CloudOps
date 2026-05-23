declare module '@novnc/novnc/core/rfb' {
  export default class RFB {
    constructor(target: HTMLElement, url: string, options?: RFBOptions);
    disconnect(): void;
    sendCredentials(credentials: { password?: string }): void;
    sendCtrlAltDel(): void;
    sendKey(keysym: number, code: string, down?: boolean): void;
    focus(): void;
    blur(): void;
    machineShutdown(): void;
    machineReboot(): void;
    machineReset(): void;
    clipViewport: boolean;
    scaleViewport: boolean;
    resizeSession: boolean;
    showDotCursor: boolean;
    viewOnly: boolean;
    focusOnClick: boolean;
    viewportDrag: boolean;
    qualityLevel: number;
    compressionLevel: number;
    readonly connected: boolean;
    readonly desktopName: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addEventListener(event: string, handler: (e: any) => void): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    removeEventListener(event: string, handler: (e: any) => void): void;
  }

  interface RFBOptions {
    shared?: boolean;
    credentials?: { password?: string; username?: string };
    repeaterID?: string;
    wsProtocols?: string[];
  }
}

declare module '@novnc/novnc/core/util/element' {
  export function isTouchDevice(): boolean;
}
