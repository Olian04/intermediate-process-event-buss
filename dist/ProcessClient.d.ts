import { EventContext } from './communication';
export declare class ProcessClient {
    private name;
    private eventHandler;
    constructor(name: string);
    on(eventName: string, handler: (ctx: EventContext) => void): void;
    off(eventName: string, handler: (ctx: EventContext) => void): void;
    emit(eventName: string, data: object): void;
}
