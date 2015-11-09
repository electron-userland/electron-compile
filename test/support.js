import _ from 'lodash';
import allCompilerClasses from 'electron-compilers';

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

require('../lib/regenerator');

global.importCompilerByExtension = (ext) => {
  return _.find(allCompilerClasses, (Klass) => {
    // This is a new-style compiler, don't look for getExtensions
    if (!('getExtensions' in Klass)) {
      return false;
    }
    return _.any(Klass.getExtensions(), (x) => ext === x);
  });
};
