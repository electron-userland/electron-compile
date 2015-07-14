import _ from 'lodash';
import allCompilerClasses from 'electron-compilers';

global.Promise = global.Promise || require('promise');
let chai = require("chai");
let chaiAsPromised = require("chai-as-promised");

require('babel-core/polyfill');

chai.should();
chai.use(chaiAsPromised);
chai.use(require('chai-spies'));

global.chai = chai;
global.chaiAsPromised = chaiAsPromised;
global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;
global.spy = chai.spy;

global.importCompilerByExtension = (ext) => {
  return _.find(allCompilerClasses, (Klass) => {
    return _.any(Klass.getExtensions(), (x) => ext === x);
  });
};
