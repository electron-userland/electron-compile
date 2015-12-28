import 'babel-polyfill';

import _ from 'lodash';
import mimeTypes from 'mime-types';

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

mimeTypes.types.ts = 'text/typescript';
mimeTypes.extensions['text/typescript'] = ['ts'];

mimeTypes.types.jade = 'text/jade';
mimeTypes.extensions['text/jade'] = ['jade'];

global.compilersByMimeType = _.reduce(allCompilerClasses, (acc,x) => {
  acc = acc || {};
  
  for (let type of x.getInputMimeTypes()) { acc[type] = x; }
  return acc;
}, {});
