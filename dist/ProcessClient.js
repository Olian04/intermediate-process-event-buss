"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const path = require("path");
class ProcessClient {
    constructor(name) {
        this.name = name;
        this.eventHandler = new events_1.EventEmitter();
        if (!process.send) {
            throw new Error(`${path.basename(process.argv[1])} is an IPEB program and relies on functionality provided by the Intermediate Process Event Buss library.`);
        }
        process.send({
            status: 'establishing connection',
            name: this.name,
        });
        process.once('message', (message) => {
            if (message.status !== 'connection established') {
                throw new Error('Failed to establish connection to process hub.');
            }
        });
        process.addListener('message', (message) => {
            this.eventHandler.emit(message.eventName, message);
        });
    }
    on(eventName, handler) {
        this.eventHandler.addListener(eventName, handler);
    }
    off(eventName, handler) {
        this.eventHandler.removeListener(eventName, handler);
    }
    emit(eventName, data) {
        process.send({
            eventName,
            data,
        }, (err) => err ? console.error(err) : null);
    }
}
exports.ProcessClient = ProcessClient;
//# sourceMappingURL=ProcessClient.js.map