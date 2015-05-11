require('./support.js');

import BabelCompiler from '../lib/babel';
import TypeScriptCompiler from '../lib/typescript';
import fs from 'fs';
import path from 'path';

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
