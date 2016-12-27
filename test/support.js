const allCompilerClasses = require('electron-compilers');

let chai = require("chai");
let chaiAsPromised = require("chai-as-promised");

chai.should();
chai.use(chaiAsPromised);

global.chai = chai;
global.chaiAsPromised = chaiAsPromised;
global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;

require('../src/rig-mime-types').init();

global.compilersByMimeType = allCompilerClasses.reduce((acc,x) => {
  acc = acc || {};

  for (let type of x.getInputMimeTypes()) { acc[type] = x; }
  return acc;
}, {});

global.compilersByMimeType['text/css'] = global.compilersByMimeType['text/plain'];

const VueCompiler = global.compilersByMimeType['text/vue'];
class AutoCreatedVueCompiler extends VueCompiler {
  constructor() {
    let dummy = VueCompiler.createFromCompilers(Object.keys(global.compilersByMimeType).reduce((acc, x) => {
      if ('createFromCompilers' in global.compilersByMimeType[x]) return acc;

      acc[x] = new global.compilersByMimeType[x]();
      return acc;
    }, {}));

    super(dummy.asyncCompilers, dummy.syncCompilers);
  }
}

global.compilersByMimeType['text/vue'] = AutoCreatedVueCompiler;
