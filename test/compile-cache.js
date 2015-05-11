require('./support.js');

import BabelCompiler from '../lib/babel';
import TypeScriptCompiler from '../lib/typescript';
import CoffeeScriptCompiler from '../lib/coffeescript';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';

describe('The CoffeeScript Compiler', function() {
  it('should compile valid CoffeeScript', function() {
    let fixture = new CoffeeScriptCompiler();
    
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.coffee');
    let result = fixture.compile(fs.readFileSync(input, 'utf8'));
    
    expect(result.length > 0).to.be.ok;
  });
  
  it('should fail on invalid CoffeeScript', function() {
    let fixture = new CoffeeScriptCompiler();
    
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'invalid.coffee');
    
    let shouldDie = true;
    try {
      let result = fixture.compile(fs.readFileSync(input, 'utf8'));
      console.log(result);
    } catch (e) {
      shouldDie = false;
    }
    
    expect(shouldDie).not.to.be.ok;
  });
});


describe('The Babel Compiler', function() {
  it('should compile itself', function() {
    let fixture = new BabelCompiler();
    
    let input = require.resolve('../src/babel.js');
    let result = fixture.compile(fs.readFileSync(input, 'utf8'));
    
    expect(result.length > 0).to.be.ok;
  });
  
  it('should fail on bogus input', function() {
    let fixture = new BabelCompiler();
    
    let input = require.resolve('../src/babel.js');
    
    let shouldDie = true;
    try {
      let result = fixture.compile(fs.readFileSync(input, 'utf8') + "\n\n!@!@!@!@!@!@!@!;");
      console.log(result);
    } catch (e) {
      shouldDie = false;
    }
    
    expect(shouldDie).not.to.be.ok;
  });
});

describe('The TypeScript Compiler', function() {
  it('should compile valid TypeScript', function() {
    let fixture = new TypeScriptCompiler();
    
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.ts');
    let result = fixture.compile(fs.readFileSync(input, 'utf8'));
    
    expect(result.length > 0).to.be.ok;
  });
  
  it('should fail on invalid TypeScript', function() {
    let fixture = new TypeScriptCompiler();
    
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'invalid.ts');
    
    let shouldDie = true;
    try {
      let result = fixture.compile(fs.readFileSync(input, 'utf8'));
      console.log(result);
    } catch (e) {
      shouldDie = false;
    }
    
    expect(shouldDie).not.to.be.ok;
  });
});

describe('The compile cache', function() {
  it('Should only call compile once for the same file', function() {
    let fixture = new BabelCompiler();
    
    spy.on(fixture, 'compile');
    
    let cacheDir = path.join(__dirname, 'cache-test');
    fixture.setCacheDirectory(cacheDir);
    
    try {
      let input = require.resolve('../src/babel.js');
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
