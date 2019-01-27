// A simple test to verify a visible window is opened with a title
const Application = require('spectron').Application;
const assert = require('assert');
const path = require('path');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

let electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron');

if (process.platform === 'win32') {
  electronPath += '.cmd';
}

var appPath = path.join(__dirname, 'run.tests.js');


global.before(function () {
  chai.should();
  chai.use(chaiAsPromised);
});

describe('Test Example', function () {
  var app = new Application({
    path: electronPath,
    args: [appPath]
  });
  beforeEach(function () {
      return app.start();
  });

  afterEach(function () {
      return app.stop();
  });

  it('opens a window', function () {
    return app.client.waitUntilWindowLoaded()
      .getWindowCount().should.eventually.equal(1);
  });

  it('tests the text', function () {
    return app.client.$('fill-me').waitUntilWindowLoaded().than(().getText().should.eventually.equal('Hello World!');
  });
});
