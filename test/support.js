import 'babel-polyfill';

import _ from 'lodash';

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

require('../lib/rig-mime-types').init();

global.compilersByMimeType = _.reduce(allCompilerClasses, (acc,x) => {
  acc = acc || {};
  
  for (let type of x.getInputMimeTypes()) { acc[type] = x; }
  return acc;
}, {});
