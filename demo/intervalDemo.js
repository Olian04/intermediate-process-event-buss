const { ProcessClient } = require('../dist/api');
const processClient = new ProcessClient('interval demo');

let i = 0;
setInterval(() => console.log(i++), 1000);