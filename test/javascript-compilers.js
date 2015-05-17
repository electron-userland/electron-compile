require('./support.js');

import fs from 'fs';
import path from 'path';

import BabelCompiler from '../lib/js/babel';
import TypeScriptCompiler from '../lib/js/typescript';
import CoffeeScriptCompiler from '../lib/js/coffeescript';

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
    
    let input = require.resolve('../src/js/babel.js');
    let result = fixture.compile(fs.readFileSync(input, 'utf8'));
    
    expect(result.length > 0).to.be.ok;
  });
  
  it('should fail on bogus input', function() {
    let fixture = new BabelCompiler();
    
    let input = require.resolve('../src/js/babel.js');
    
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
