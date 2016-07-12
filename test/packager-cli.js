import './support.js';

import sfs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';

import {packagerMain} from '../src/packager-cli';

const d = require('debug-electron')('test:packager-cli');

let testCount = 0;

function statSyncNoException(fsPath) {
  if ('statSyncNoException' in sfs) {
    return sfs.statSyncNoException(fsPath);
  }

  try {
    return sfs.statSync(fsPath);
  } catch (e) {
    return null;
  }
}

describe('the packager CLI', function() {
  this.timeout(60 * 1000);

  beforeEach(function() {
    this.tempCacheDir = path.join(__dirname, `__packager_cli_${testCount++}`);
    mkdirp.sync(this.tempCacheDir);
  });

  afterEach(function() {
    rimraf.sync(this.tempCacheDir);
  });

  it('should do the basics of electron-packager', async function() {
    let inputApp = path.resolve(__dirname, 'electron-app');

    // NB: The first two elements are dummies to fake out what would normally
    // be the path to node and the path to the script
    await packagerMain(['', '', '--platform', 'win32', '--arch', 'all', '--out', this.tempCacheDir, inputApp]);

    const toFind = ['node.dll', 'resources', 'resources/app/src/main.coffee'];
    let cacheDir = this.tempCacheDir;

    toFind.forEach((name) => {
      let file = path.resolve(cacheDir, 'mp3-encoder-demo-win32-ia32', name);

      d(`Looking for ${file}`);
      expect(sfs.statSync(file)).to.be.ok;
    });
  });

  it('should run electron-compile', async function() {
    let inputApp = path.resolve(__dirname, 'electron-app');

    // NB: The first two elements are dummies to fake out what would normally
    // be the path to node and the path to the script
    await packagerMain(['', '', '--platform', 'win32', '--arch', 'x64', '--out', this.tempCacheDir, inputApp]);

    const toFind = ['resources/app/.cache', 'resources/app/.compilerc'];
    let cacheDir = this.tempCacheDir;

    toFind.forEach((name) => {
      let file = path.resolve(cacheDir, 'mp3-encoder-demo-win32-x64', name);

      d(`Looking for ${file}`);
      expect(sfs.statSync(file)).to.be.ok;
    });
  });

  it('should replace the init script with es6-shim', async function() {
    let inputApp = path.resolve(__dirname, 'electron-app');

    // NB: The first two elements are dummies to fake out what would normally
    // be the path to node and the path to the script
    await packagerMain(['', '', '--platform', 'win32', '--arch', 'x64', '--out', this.tempCacheDir, inputApp]);

    const toFind = ['resources/app/package.json', 'resources/app/es6-shim.js'];
    let cacheDir = this.tempCacheDir;

    toFind.forEach((name) => {
      let file = path.resolve(cacheDir, 'mp3-encoder-demo-win32-x64', name);

      d(`Looking for ${file}`);
      expect(sfs.statSync(file)).to.be.ok;
    });

    let packageJson = require(
      path.join(cacheDir, 'mp3-encoder-demo-win32-x64', 'resources', 'app', 'package.json'));

    expect(packageJson.originalMain).to.equal('main.js');
    expect(packageJson.main).to.equal('es6-shim.js');
  });

  it('should ASAR archive', async function() {
    let inputApp = path.resolve(__dirname, 'electron-app');

    // NB: The first two elements are dummies to fake out what would normally
    // be the path to node and the path to the script
    await packagerMain(['', '', '--platform', 'win32', '--arch', 'x64', '--asar', '--out', this.tempCacheDir, inputApp]);

    const toFind = ['resources/app.asar'];
    let cacheDir = this.tempCacheDir;

    toFind.forEach((name) => {
      let file = path.resolve(cacheDir, 'mp3-encoder-demo-win32-x64', name);

      d(`Looking for ${file}`);
      expect(statSyncNoException(file)).to.be.ok;
    });

    const toNotFind = ['resources/app'];
    toNotFind.forEach((name) => {
      let file = path.resolve(cacheDir, 'mp3-encoder-demo-win32-x64', name);

      d(`Looking for ${file}`);
      expect(statSyncNoException(file)).not.to.be.ok;
    });
  });
});
