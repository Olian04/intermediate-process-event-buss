import { ChildProcess as NodeChildProcess, fork } from "child_process";
import { SIGINT, SIGTERM } from "constants";
import { PassThrough, Readable, Writable } from 'stream';
import { EventContext } from './communication';

export type EventHandler = (ctx: EventContext) => void;

interface SpawnConfig {
  name: string;
  pathToFile: string;
}

interface ChildProcess {
  name: string;
  process: NodeChildProcess;
}

const idTag = (processID: number, name?: string) => {
  const body = name ? `${name} (${processID})` : `${processID}`;
  //@ts-ignore
  if (console.color) {
    // If the user is using better-logging
    //@ts-ignore
    const { STAMP_COLOR, RESET } = console.color;
    return `${STAMP_COLOR}[${body}]${RESET}`;
  }
  return `[${body}]`;
}

export class ProcessHub {
  private __onMessage: (message: any) => void;
  private childProcesses: ChildProcess[];
  private combinedStdin: PassThrough;
  private combinedStdout: PassThrough;
  private combinedStderr: PassThrough;

  constructor(stdio?: { stdin: Readable, stdout: Writable, stderr: Writable }) {
    this.childProcesses = [];
    this.combinedStdin = new PassThrough();
    this.combinedStdout = new PassThrough();
    this.combinedStderr = new PassThrough();

    if (stdio) {
      // Bind the combined stdio to the provided stdio
      stdio.stdin.pipe(this.combinedStdin);
      this.combinedStdout.pipe(stdio.stdout);
      this.combinedStderr.pipe(stdio.stderr);
    }

    process.on('SIGINT', () => {
      console.info(`\n${idTag(process.pid, 'main process')} Received interrupt signal`);
      this.handleExit(SIGINT);
    });
    process.on('SIGTERM', () => {
      console.info(`\n${idTag(process.pid, 'main process')} Received termination signal`);
      this.handleExit(SIGTERM);
    });
    process.on('beforeExit', this.handleExit.bind(this));
  }

  private handleExit(exitCode: number) {
    this.childProcesses.forEach(childProcess => {
      if (childProcess.process.killed) return;

      childProcess.process.kill('SIGINT');
      console.info(`${idTag(process.pid, 'main process')} Terminated child process: ${childProcess.name} (${childProcess.process.pid})`);
    });

    console.info(`${idTag(process.pid, 'main process')} Main process exited with code ${exitCode}.`);
    process.exit();
  }

  public spawn(pathToFile: string) {
    const childProcess = this.spawnJavascriptProcess(pathToFile);
    this.childProcesses.push({
      name: 'TBD',
      process: childProcess,
    });
    console.info(`${idTag(process.pid, 'main process')} Establishing connection with process: ${childProcess.pid}`);
    childProcess.once('message', (message: { status: string; name: string; }) => {
      if (message.status !== 'establishing connection') {
        console.error(`${idTag(process.pid, 'main process')} Failed to establish connection with process: ${childProcess.pid}`);
        this.removeChildProcess(childProcess);
        return;
      }
      const config: SpawnConfig = {
        pathToFile,
        name: message.name,
      };

      // Update process name in childProcesses
      this.childProcesses.find(child => child.process.pid === childProcess.pid).name = config.name;
  
      childProcess.addListener('exit', (exitCode) => {
        console.info(`${idTag(childProcess.pid, config.name)} Process exited with code ${exitCode}`);
        this.removeChildProcess(childProcess);
      });
      childProcess.addListener('disconnect', () => {
        console.info(`${idTag(childProcess.pid, config.name)} Process disconnected`);
        this.removeChildProcess(childProcess);
      });
      childProcess.addListener('close', (exitCode) => {
        console.info(`${idTag(childProcess.pid, config.name)} Process closed with code ${exitCode}`);
        this.removeChildProcess(childProcess);
      });
      childProcess.addListener('error', (err) => {
        console.info(`${idTag(childProcess.pid, config.name)} An error occurred in child process: ${err}`);
        this.removeChildProcess(childProcess);
      });
  
      childProcess.stdout.addListener('data', (buff: Buffer) => {
        this.combinedStdout.write(`${idTag(childProcess.pid, config.name)} ${buff.toString()}`);
      });
      childProcess.stderr.addListener('data', (buff: Buffer) => {
        this.combinedStderr.write(`${idTag(childProcess.pid, config.name)} ${buff.toString()}`);
      });
  
      this.combinedStdin.pipe(childProcess.stdin);
  
      childProcess.addListener('message', (message: Pick<EventContext, 'data' | 'eventName'>) => this.sendMessage({
        ...message,
        from: config.name,
      }));

      console.info(`${idTag(process.pid, 'main process')} Successfully established connection with process: ${config.name} (${childProcess.pid})`);
      childProcess.send({
        status: 'connection established',
      });
    });
  }


  private removeChildProcess(childProcess: NodeChildProcess) {
    try {
      console.info(`${idTag(process.pid, 'main process')} Terminating process: ${childProcess.pid}`);
      childProcess.kill();
      console.info(`${idTag(process.pid, 'main process')} Process terminated: ${childProcess.pid}`);
    } catch (err) {
      console.error(`${idTag(process.pid, 'main process')} Failed to terminate process: ${childProcess.pid}`);
    }
    this.childProcesses =  this.childProcesses.filter(child => child.process.pid !== childProcess.pid);
  }

  private spawnJavascriptProcess(path: string): NodeChildProcess {
    return fork(path, [], {
      stdio: 'pipe'
    });
  }

  public sendMessage(message:  Omit<EventContext, 'to'> & { to?: string }) {
    if (this.__onMessage) {
      // None blocking message handling
      new Promise((resolve) => resolve(this.__onMessage(message)));
    }
    this.childProcesses
      .filter(child => {
        if (message.to) {
          return child.name === message.to;
        }
        return true;
      })
      .forEach(child => {
        child.process.send({
          from: message.from,
          to: child.name,
          data: message.data,
          eventName: message.eventName,
        });
      });
  }

  public onMessage(handler: (message: EventContext) => void) {
    this.__onMessage = handler;
  }

  public get stdin() {
    return this.combinedStdin;
  }
  public get stdout() {
    return this.combinedStdout;
  }
  public get stderr() {
    return this.combinedStderr;
  }

  public get processes() {
    return [...this.childProcesses];
  }
}
