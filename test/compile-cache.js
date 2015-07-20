require('./support.js');

import path from 'path';
import rimraf from 'rimraf';
import fs from 'fs';

const BabelCompiler = global.importCompilerByExtension('js');
const TypeScriptCompiler = global.importCompilerByExtension('ts');

describe('The compile cache', function() {
  it('Should only call compile once for the same file', function() {
    let fixture = new BabelCompiler();
    
    spy.on(fixture, 'compile');
    
    let cacheDir = path.join(__dirname, 'cache-test');
    fixture.setCacheDirectory(cacheDir);
    
    try {
      let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.js');
      let result = fixture.loadFile(module, input, true);
      
      expect(result.length > 0).to.be.ok;
      expect(fixture.compile).to.have.been.called.once;
      
      // Calling loadFile > 1x with same content == no compiling
      result = fixture.loadFile(module, input, true);
      expect(result.length > 0).to.be.ok;
      expect(fixture.compile).to.have.been.called.once;
    } finally {
      rimraf.sync(cacheDir);
    }
  });
  
  it('should work even when filePath isnt a real file', function() {
    let fixture = new BabelCompiler();
    
    spy.on(fixture, 'compile');
    
    let cacheDir = path.join(__dirname, 'cache-test-2');
    fixture.setCacheDirectory(cacheDir);
    
    try {
      let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.js');
      let code = fs.readFileSync(input, 'utf8');
      let result = fixture.loadFile(null, input + ":inline.js", true, code);
      
      expect(result.length > 0).to.be.ok;
      expect(fixture.compile).to.have.been.called.once;
      
      // Calling loadFile > 1x with same content == no compiling
      result = fixture.loadFile(null, input + ":inline.js", true, code);
      expect(result.length > 0).to.be.ok;
      expect(fixture.compile).to.have.been.called.once;
    } finally {
      rimraf.sync(cacheDir);
    }
  });
  
  it('Shouldnt cache compile failures', function() {
    let fixture = new TypeScriptCompiler();
    
    spy.on(fixture, 'compile');
    
    let cacheDir = path.join(__dirname, 'cache-test');
    fixture.setCacheDirectory(cacheDir);
    
    try {
      let input = path.join(__dirname, '..', 'test', 'fixtures', 'invalid.ts');
      let result = null;
      let shouldDie = true;
      
      try {
        result = fixture.loadFile(module, input, true);
      } catch (e) {
        shouldDie = false;
      }
      
      expect(shouldDie).not.to.be.ok;
      expect(fixture.compile).to.have.been.called.once;
      
      // Calling loadFile > 1x with same content == no compiling
      shouldDie = true;
      try {
        result = fixture.loadFile(module, input, true);
      } catch (e) {
        shouldDie = false;
      }
      
      expect(shouldDie).not.to.be.ok;
      expect(fixture.compile).to.have.been.called.twice;
    } finally {
      rimraf.sync(cacheDir);
    }
  });
});
