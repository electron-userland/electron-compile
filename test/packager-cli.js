import './support.js';

import _ from 'lodash';
import sfs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';

import {main} from '../src/packager-cli';

const d = require('debug')('test:packager-cli');

let testCount = 0;

describe.only('the packager CLI', function() {
  this.timeout(30 * 1000);

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
    await main(['', '', '--platform', 'win32', '--arch', 'ia32', '--out', this.tempCacheDir, inputApp]);

    const toFind = ['node.dll', 'resources', 'resources/app/src/main.coffee'];
    let cacheDir = this.tempCacheDir;

    _.each(toFind, (name) => {
      let file = path.resolve(cacheDir, 'mp3-encoder-demo-win32-ia32', name);

      d(`Looking for ${file}`);
      expect(sfs.statSync(file)).to.be.ok;
    });
  });
});
