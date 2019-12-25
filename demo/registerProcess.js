// @ts-check

const betterLogging = require('better-logging').default;
betterLogging((console));
const { ProcessHub } = require('../dist/api');
const path = require('path');

const processHub = new ProcessHub(process);
processHub.spawn(path.join(__dirname, 'intervalDemo.js'));
processHub.spawn(path.join(__dirname, 'messageDemo1.js'));
processHub.spawn(path.join(__dirname, 'messageDemo2.js'));
