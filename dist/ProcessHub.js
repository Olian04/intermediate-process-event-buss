"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const constants_1 = require("constants");
const stream_1 = require("stream");
const idTag = (processID, name) => {
    const body = name ? `${name} (${processID})` : `${processID}`;
    //@ts-ignore
    if (console.color) {
        // If the user is using better-logging
        //@ts-ignore
        const { STAMP_COLOR, RESET } = console.color;
        return `${STAMP_COLOR}[${body}]${RESET}`;
    }
    return `[${body}]`;
};
class ProcessHub {
    constructor(stdio) {
        this.childProcesses = [];
        this.combinedStdin = new stream_1.PassThrough();
        this.combinedStdout = new stream_1.PassThrough();
        this.combinedStderr = new stream_1.PassThrough();
        if (stdio) {
            // Bind the combined stdio to the provided stdio
            stdio.stdin.pipe(this.combinedStdin);
            this.combinedStdout.pipe(stdio.stdout);
            this.combinedStderr.pipe(stdio.stderr);
        }
        process.on('SIGINT', () => {
            console.info(`\n${idTag(process.pid, 'main process')} Received interrupt signal`);
            this.handleExit(constants_1.SIGINT);
        });
        process.on('SIGTERM', () => {
            console.info(`\n${idTag(process.pid, 'main process')} Received termination signal`);
            this.handleExit(constants_1.SIGTERM);
        });
        process.on('beforeExit', this.handleExit.bind(this));
    }
    handleExit(exitCode) {
        this.childProcesses.forEach(childProcess => {
            if (childProcess.process.killed)
                return;
            childProcess.process.kill('SIGINT');
            console.info(`${idTag(process.pid, 'main process')} Terminated child process: ${childProcess.name} (${childProcess.process.pid})`);
        });
        console.info(`${idTag(process.pid, 'main process')} Main process exited with code ${exitCode}.`);
        process.exit();
    }
    spawn(pathToFile) {
        const childProcess = this.spawnJavascriptProcess(pathToFile);
        this.childProcesses.push({
            name: 'TBD',
            process: childProcess,
        });
        console.info(`${idTag(process.pid, 'main process')} Establishing connection with process: ${childProcess.pid}`);
        childProcess.once('message', (message) => {
            if (message.status !== 'establishing connection') {
                console.error(`${idTag(process.pid, 'main process')} Failed to establish connection with process: ${childProcess.pid}`);
                this.removeChildProcess(childProcess);
                return;
            }
            const config = {
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
            childProcess.stdout.addListener('data', (buff) => {
                this.combinedStdout.write(`${idTag(childProcess.pid, config.name)} ${buff.toString()}`);
            });
            childProcess.stderr.addListener('data', (buff) => {
                this.combinedStderr.write(`${idTag(childProcess.pid, config.name)} ${buff.toString()}`);
            });
            this.combinedStdin.pipe(childProcess.stdin);
            childProcess.addListener('message', (message) => this.sendMessage(Object.assign(Object.assign({}, message), { from: config.name })));
            console.info(`${idTag(process.pid, 'main process')} Successfully established connection with process: ${config.name} (${childProcess.pid})`);
            childProcess.send({
                status: 'connection established',
            });
        });
    }
    removeChildProcess(childProcess) {
        try {
            console.info(`${idTag(process.pid, 'main process')} Terminating process: ${childProcess.pid}`);
            childProcess.kill();
            console.info(`${idTag(process.pid, 'main process')} Process terminated: ${childProcess.pid}`);
        }
        catch (err) {
            console.error(`${idTag(process.pid, 'main process')} Failed to terminate process: ${childProcess.pid}`);
        }
        this.childProcesses = this.childProcesses.filter(child => child.process.pid !== childProcess.pid);
    }
    spawnJavascriptProcess(path) {
        return child_process_1.fork(path, [], {
            stdio: 'pipe'
        });
    }
    sendMessage(message) {
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
    onMessage(handler) {
        this.__onMessage = handler;
    }
    get stdin() {
        return this.combinedStdin;
    }
    get stdout() {
        return this.combinedStdout;
    }
    get stderr() {
        return this.combinedStderr;
    }
    get processes() {
        return [...this.childProcesses];
    }
}
exports.ProcessHub = ProcessHub;
//# sourceMappingURL=ProcessHub.js.map