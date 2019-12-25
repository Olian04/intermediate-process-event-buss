import { EventEmitter } from 'events';
import { EventContext } from './communication';
import * as path from 'path';

export class ProcessClient {
  private eventHandler = new EventEmitter();
  constructor(private name: string) {
    if (!process.send) {
      throw new Error(`${path.basename(process.argv[1])} is an IPEB program and relies on functionality provided by the Intermediate Process Event Buss library.`);
    }
    process.send({
      status: 'establishing connection',
      name: this.name,
    });
    process.once('message', (message: { status: string; }) => {
      if (message.status !== 'connection established') {
        throw new Error('Failed to establish connection to process hub.');
      }
    });
    process.addListener('message', (message: EventContext) => {
      this.eventHandler.emit(message.eventName, message);
    });
  }

  public on(eventName: string, handler: (ctx: EventContext) => void) {
    this.eventHandler.addListener(eventName, handler);
  }

  public off(eventName: string, handler: (ctx: EventContext) => void) {
    this.eventHandler.removeListener(eventName, handler);
  }

  public emit(eventName: string, data: object) {
    process.send({
      eventName,
      data,
    }, (err) => err ? console.error(err) : null);
  }
}