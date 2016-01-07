if ('type' in process) {
  require('babel-polyfill');
  const init = require('../src/config-parser').init;

  init(__dirname + '/..', './electron-smoke-test-app');
}

/*
const path = require('path');
const app = require('electron').app;

const createCompilerHostFromProjectRootSync = require('../src/config-parser').createCompilerHostFromProjectRootSync;

const registerRequireExtension = require('../src/require-hook').default;
const initializeProtocolHook = require('../src/protocol-hook').initializeProtocolHook;

let compilerHost = createCompilerHostFromProjectRootSync(path.join(__dirname, '..'));
registerRequireExtension(compilerHost);

let protoify = function() { initializeProtocolHook(compilerHost); };
if (app.isReady()) {
  protoify();
} else {
  app.on('ready', protoify);
}

require('./electron-smoke-test-app');
*/
