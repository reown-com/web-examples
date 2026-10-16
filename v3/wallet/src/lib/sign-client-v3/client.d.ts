import { EventEmitter } from "events";
import type { EngineTypes, PairingTypes, SessionTypes, SignClientTypes } from "@walletconnect/types";
export declare const SIGN_V3_DEFAULT_RELAY = "https://pool-1.dev-relay.walletconnect.com";
export interface SignClientV3Options extends SignClientTypes.Options {
    jwtAudience?: string;
}
export declare class SignV3Error extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
export declare class SignClient {
    private readonly opts;
    readonly protocol = "wc";
    readonly version = 3;
    readonly name: string;
    readonly metadata: SignClientTypes.Metadata;
    readonly events: EventEmitter<[never]>;
    private wasm;
    private readonly sessions;
    private readonly proposals;
    private readonly approvals;
    readonly session: {
        getAll: () => SessionTypes.Struct[];
        get: (topic: string) => SessionTypes.Struct;
        readonly keys: string[];
    };
    readonly core: {
        crypto: {
            getClientId: () => Promise<string>;
        };
    };
    static init(opts: SignClientV3Options): Promise<SignClient>;
    private constructor();
    on: <E extends SignClientTypes.Event>(name: E, listener: (args: SignClientTypes.EventArguments[E]) => void) => EventEmitter<[never]>;
    once: <E extends SignClientTypes.Event>(name: E, listener: (args: SignClientTypes.EventArguments[E]) => void) => EventEmitter<[never]>;
    off: <E extends SignClientTypes.Event>(name: E, listener: (args: SignClientTypes.EventArguments[E]) => void) => EventEmitter<[never]>;
    removeListener: <E extends SignClientTypes.Event>(name: E, listener: (args: SignClientTypes.EventArguments[E]) => void) => EventEmitter<[never]>;
    private dispatch;
    connect: (params: EngineTypes.ConnectParams) => Promise<{
        uri?: string;
        approval: () => Promise<SessionTypes.Struct>;
    }>;
    pair: (params: {
        uri: string;
    }) => Promise<PairingTypes.Struct>;
    approve: (params: EngineTypes.ApproveParams) => Promise<{
        topic: string;
        acknowledged: () => Promise<SessionTypes.Struct>;
    }>;
    reject: (params: EngineTypes.RejectParams) => Promise<void>;
    request: <T = unknown>(params: EngineTypes.RequestParams) => Promise<T>;
    respond: (params: EngineTypes.RespondParams) => Promise<void>;
    emit: (params: EngineTypes.EmitParams) => Promise<void>;
    ping: (params: EngineTypes.PingParams) => Promise<void>;
    update: (params: EngineTypes.UpdateParams) => EngineTypes.AcknowledgedPromise;
    extend: (params: EngineTypes.ExtendParams) => EngineTypes.AcknowledgedPromise;
    disconnect: (params: EngineTypes.DisconnectParams) => Promise<void>;
    private initialize;
    private call;
    private proposalTopic;
    private keep;
    private refreshSessions;
    private settle;
    private onV3Event;
}
