/// <reference types="node" />
import { ChildProcess as NodeChildProcess } from "child_process";
import { PassThrough, Readable, Writable } from 'stream';
import { EventContext } from './communication';
export declare type EventHandler = (ctx: EventContext) => void;
interface ChildProcess {
    name: string;
    process: NodeChildProcess;
}
export declare class ProcessHub {
    private __onMessage;
    private childProcesses;
    private combinedStdin;
    private combinedStdout;
    private combinedStderr;
    constructor(stdio?: {
        stdin: Readable;
        stdout: Writable;
        stderr: Writable;
    });
    private handleExit;
    spawn(pathToFile: string): void;
    private removeChildProcess;
    private spawnJavascriptProcess;
    sendMessage(message: Omit<EventContext, 'to'> & {
        to?: string;
    }): void;
    onMessage(handler: (message: EventContext) => void): void;
    get stdin(): PassThrough;
    get stdout(): PassThrough;
    get stderr(): PassThrough;
    get processes(): ChildProcess[];
}
export {};
