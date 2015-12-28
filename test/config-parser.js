import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import pify from 'pify';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';

import {createCompilers, createCompilerHostFromConfiguration} from '../lib/config-parser';

const d = require('debug')('test:config-parser');
const pfs = pify(fs);

let testCount = 0;

describe('the configuration parser module', function() {
  describe('the createCompilers method', function() {
    it('should return compilers', function() {
      let result = createCompilers();
      expect(Object.keys(result).length > 0).to.be.ok;
    });

    it('should definitely have these compilers', function() {
      let result = createCompilers();

      expect(result['application/javascript']).to.be.ok;
      expect(result['text/less']).to.be.ok;
    });
  });
  
  describe('the createCompilerHostFromConfiguration method', function() {
    beforeEach(function() {
      this.tempCacheDir = path.join(__dirname, `__create_compiler_host_${testCount++}`);
      mkdirp.sync(this.tempCacheDir);
    });
    
    afterEach(function() {
      rimraf.sync(this.tempCacheDir);
    });
      
    it.only('respects suppressing source maps (scenario test)', async function() {
      let fixtureDir = path.join(__dirname, '..', 'test', 'fixtures');
      
      let result = createCompilerHostFromConfiguration({
        appRoot: fixtureDir,
        rootCacheDir: this.tempCacheDir,
        options: {
          'text/javascript': {
            "presets": ["stage-0", "es2015"],
            "sourceMaps": false
          }
        }
      });
      
      let compileInfo = await result.compile(path.join(fixtureDir, 'valid.js'));
      d(JSON.stringify(compileInfo));
      
      expect(compileInfo.mimeType).to.equal('text/javascript');
      
      let lines = compileInfo.code.split('\n');
      expect(lines.length > 5).to.be.ok;
      expect(_.any(lines, (x) => x.match(/sourceMappingURL=/))).not.to.be.ok;
    });
  });
});
