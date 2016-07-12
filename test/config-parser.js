import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';

import {
  createCompilers, 
  createCompilerHostFromConfiguration, 
  createCompilerHostFromConfigFile,
  createCompilerHostFromBabelRc
} from '../src/config-parser';

const d = require('debug-electron')('test:config-parser');

let testCount = 0;

describe('the configuration parser module', function() {
  this.timeout(10 * 1000);

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
      
    it('respects suppressing source maps (scenario test)', async function() {
      let fixtureDir = path.join(__dirname, '..', 'test', 'fixtures');
      
      let result = createCompilerHostFromConfiguration({
        appRoot: fixtureDir,
        rootCacheDir: this.tempCacheDir,
        options: {
          'application/javascript': {
            "presets": ["stage-0", "es2015"],
            "sourceMaps": false
          }
        }
      });
      
      let compileInfo = await result.compile(path.join(fixtureDir, 'valid.js'));
      d(JSON.stringify(compileInfo));
      
      expect(compileInfo.mimeType).to.equal('application/javascript');
      
      let lines = compileInfo.code.split('\n');
      expect(lines.length > 5).to.be.ok;
      expect(lines.find((x) => x.match(/sourceMappingURL=/))).not.to.be.ok;
    });
    
    it('creates a no-op compiler when passthrough is set for a mime type', async function() {
      let fixtureDir = path.join(__dirname, '..', 'test', 'fixtures');

      let sourceFilePath = path.join(fixtureDir, 'valid.js');
      let sourceFile = fs.readFileSync(sourceFilePath);

      let result = await createCompilerHostFromConfigFile(path.join(fixtureDir, 'compilerc-passthrough'));

      let compileInfo = await result.compile(sourceFilePath);
      d(JSON.stringify(compileInfo));

      expect(compileInfo.mimeType).to.equal('application/javascript');
      
      if (compileInfo.code) {
        expect(compileInfo.code).to.deep.equal(sourceFile.toString());
      } else {
        expect(compileInfo.binaryData).to.equal(sourceFile);
      }
    });
  });

  describe('the createCompilerHostFromBabelRc method', function() {
    beforeEach(function() {
      this.tempCacheDir = path.join(__dirname, `__create_compiler_host_${testCount++}`);
      mkdirp.sync(this.tempCacheDir);
    });
    
    afterEach(function() {
      rimraf.sync(this.tempCacheDir);
      if ('BABEL_ENV' in process.env) {
        delete process.env.ELECTRON_COMPILE_ENV;
      }
    });
      
    it('reads from an environment-free file', async function() {
      let fixtureDir = path.join(__dirname, '..', 'test', 'fixtures');
      
      let result = await createCompilerHostFromBabelRc(path.join(fixtureDir, 'babelrc-noenv'));
      
      let compileInfo = await result.compile(path.join(fixtureDir, 'valid.js'));
      d(JSON.stringify(compileInfo));
      
      expect(compileInfo.mimeType).to.equal('application/javascript');
      
      let lines = compileInfo.code.split('\n');
      expect(lines.length > 5).to.be.ok;
      expect(lines.find((x) => x.match(/sourceMappingURL=/))).to.be.ok;
    });
    
    it('uses the development env when env is unset', async function() {
      let fixtureDir = path.join(__dirname, '..', 'test', 'fixtures');
      
      let result = await createCompilerHostFromBabelRc(path.join(fixtureDir, 'babelrc-production'));
      
      let compileInfo = await result.compile(path.join(fixtureDir, 'valid.js'));
      d(JSON.stringify(compileInfo));
      
      expect(compileInfo.mimeType).to.equal('application/javascript');
      
      let lines = compileInfo.code.split('\n');
      expect(lines.length > 5).to.be.ok;
      expect(lines.find((x) => x.match(/sourceMappingURL=/))).to.be.ok;
    });
    
    it('uses the production env when env is set', async function() {
      process.env.BABEL_ENV = 'production';
      let fixtureDir = path.join(__dirname, '..', 'test', 'fixtures');
      
      let result = await createCompilerHostFromBabelRc(path.join(fixtureDir, 'babelrc-production'));
      
      let compileInfo = await result.compile(path.join(fixtureDir, 'valid.js'));
      d(JSON.stringify(compileInfo));
      
      expect(compileInfo.mimeType).to.equal('application/javascript');
      
      let lines = compileInfo.code.split('\n');
      expect(lines.length > 5).to.be.ok;
      expect(lines.find((x) => x.match(/sourceMappingURL=/))).not.to.be.ok;
    });  
  });
  
  describe('the createCompilerHostFromConfigFile method', function() {
    beforeEach(function() {
      this.tempCacheDir = path.join(__dirname, `__create_compiler_host_${testCount++}`);
      mkdirp.sync(this.tempCacheDir);
    });
    
    afterEach(function() {
      rimraf.sync(this.tempCacheDir);
      if ('ELECTRON_COMPILE_ENV' in process.env) {
        delete process.env.ELECTRON_COMPILE_ENV;
      }
    });
      
    it('reads from an environment-free file', async function() {
      let fixtureDir = path.join(__dirname, '..', 'test', 'fixtures');
      
      let result = await createCompilerHostFromConfigFile(path.join(fixtureDir, 'compilerc-noenv'));
      
      let compileInfo = await result.compile(path.join(fixtureDir, 'valid.js'));
      d(JSON.stringify(compileInfo));
      
      expect(compileInfo.mimeType).to.equal('application/javascript');
      
      let lines = compileInfo.code.split('\n');
      expect(lines.length > 5).to.be.ok;
      expect(lines.find((x) => x.match(/sourceMappingURL=/))).to.be.ok;
    });
    
    it('uses the development env when env is unset', async function() {
      let fixtureDir = path.join(__dirname, '..', 'test', 'fixtures');
      
      let result = await createCompilerHostFromConfigFile(path.join(fixtureDir, 'compilerc-production'));
      
      let compileInfo = await result.compile(path.join(fixtureDir, 'valid.js'));
      d(JSON.stringify(compileInfo));
      
      expect(compileInfo.mimeType).to.equal('application/javascript');
      
      let lines = compileInfo.code.split('\n');
      expect(lines.length > 5).to.be.ok;
      expect(lines.find((x) => x.match(/sourceMappingURL=/))).to.be.ok;
    });
    
    it('uses the production env when env is set', async function() {
      process.env.ELECTRON_COMPILE_ENV = 'production';
      let fixtureDir = path.join(__dirname, '..', 'test', 'fixtures');
      
      let result = await createCompilerHostFromConfigFile(path.join(fixtureDir, 'compilerc-production'));
      
      let compileInfo = await result.compile(path.join(fixtureDir, 'valid.js'));
      d(JSON.stringify(compileInfo));
      
      expect(compileInfo.mimeType).to.equal('application/javascript');
      
      let lines = compileInfo.code.split('\n');
      expect(lines.length > 5).to.be.ok;
      expect(lines.find((x) => x.match(/sourceMappingURL=/))).not.to.be.ok;
    });  
  });
});
