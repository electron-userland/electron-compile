require('./support.js');

import _ from 'lodash';
import path from 'path';
import rimraf from 'rimraf';

const TypeScriptCompiler = global.importCompilerByExtension('ts');
const LessCompiler = global.importCompilerByExtension('less');

import forAllFiles from '../lib/for-all-files';
import {compile, compileAll, createAllCompilers} from '../lib/main';

describe('exports for this library', function() {
  describe('the compile method', function() {
    beforeEach(function() {
      this.compilers = [
        new TypeScriptCompiler(),
        new LessCompiler()
      ];

      // Disable caching on compilers
      _.each(this.compilers, (x) => x.setCacheDirectory(null));
    });

    it('should compile a LESS file', function() {
      let result = compile(path.resolve(__dirname, '..', 'test', 'fixtures', 'valid.less'), this.compilers);
      expect(result.length > 10).to.be.ok;
    });

    it('should passthrough files it doesnt recognize', function() {
      let result = compile(path.resolve(__dirname, '..', '.gitignore'), this.compilers);
      expect(result.length > 10).to.be.ok;
    });

    it('should blow up on bad input', function() {
      let shouldDie = true;
      try {
        compile(path.resolve(__dirname, '..', 'test', 'fixtures', 'invalid.ts'), this.compilers);
      } catch (e) {
        shouldDie = false;
      }

      expect(shouldDie).not.to.be.ok;
    });
  });

  describe('the compileAll method', function() {
    it('should create a cache directory for our sources folder', function() {
      let source = path.join(__dirname, '..', 'src');
      let targetDir = path.join(__dirname, 'compileAllCacheTest');

      try {
        let compilers = createAllCompilers();
        _.each(compilers, (x) => x.setCacheDirectory(targetDir));

        expect(compilers).to.be.ok;

        compileAll(source, compilers);

        let sourceFileCount = 0;
        forAllFiles(source, () => sourceFileCount++);

        let targetFileCount = 0;
        forAllFiles(targetDir, () => targetFileCount++);

        //console.log(`compileAll: ${sourceFileCount} files in source, ${targetFileCount} in target`);
        expect(sourceFileCount === targetFileCount).to.be.ok;
        expect(sourceFileCount !== 0).to.be.ok;
      } finally {
        //rimraf.sync(targetDir);
      }
    });

    it('should fail when files have errors', function() {
      let source = path.join(__dirname, '..', 'test', 'fixtures');
      let targetDir = path.join(__dirname, 'compileAllFailCacheTest');

      let shouldDie = true;
      try {
        let compilers = createAllCompilers();
        _.each(compilers, (x) => x.setCacheDirectory(targetDir));

        expect(compilers).to.be.ok;

        compileAll(source, compilers);
      } catch (e) {
        shouldDie = false;
      } finally {
        rimraf.sync(targetDir);
      }

      expect(shouldDie).not.to.be.ok;
    });
  });

  describe('The createAllCompilers method', function() {
    it('should create a bunch of compilers', function() {
      let result = createAllCompilers();
      _.each(result, (x) => x.setCacheDirectory(null));

      let extensions = _.map(result, (x) => x.getCompilerInformation().extensions);

      expect(_.find(extensions, (x) => x[0] === 'js')).to.be.ok;
      expect(_.find(extensions, (x) => x[0] === 'less')).to.be.ok;
    });

    it('should accept compile options', function() {
      // First with comments on
      let opts = {
        js: { comments: true, sourceMaps: false }
      };

      let result = createAllCompilers(opts);
      _.each(result, (x) => x.setCacheDirectory(null));

      let output = compile(path.resolve(__dirname, '..', 'test', 'fixtures', 'valid.js'), result);
      expect(_.find(output.split("\n"), (x) => x.match(/\/\//))).to.be.ok;

      // Run it again with comments off
      opts = {
        js: { comments: false, sourceMaps: false }
      };

      result = createAllCompilers(opts);
      _.each(result, (x) => x.setCacheDirectory(null));

      output = compile(path.resolve(__dirname, '..', 'test', 'fixtures', 'valid.js'), result);
      expect(_.find(output.split("\n"), (x) => x.match(/\/\//))).not.to.be.ok;
    });
  });
});
