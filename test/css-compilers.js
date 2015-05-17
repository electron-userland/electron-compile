require('./support.js');

import fs from 'fs';
import path from 'path';

import LessCompiler from '../lib/css/less';
import ScssCompiler from '../lib/css/scss';

describe('The LESS Compiler', function() {
  it('should compile valid LESS', function() {
    let fixture = new LessCompiler();
    
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.less');
    let result = fixture.compile(fs.readFileSync(input, 'utf8'), input);
    
    expect(result.length > 0).to.be.ok;
  });
  
  it('should fail on invalid LESS', function() {
    let fixture = new LessCompiler();
    
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'invalid.less');
    
    let shouldDie = true;
    try {
      let result = fixture.compile(fs.readFileSync(input, 'utf8'), input);
      console.log(result);
    } catch (e) {
      shouldDie = false;
    }
    
    expect(shouldDie).not.to.be.ok;
  });
});

describe('The SCSS Compiler', function() {
  it('should compile valid SCSS', function() {
    let fixture = new ScssCompiler();
    
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.scss');
    let result = fixture.compile(fs.readFileSync(input, 'utf8'), input);
    
    expect(result.length > 0).to.be.ok;
  });
  
  it('should fail on invalid SCSS', function() {
    let fixture = new ScssCompiler();
    
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'invalid.scss');
    
    let shouldDie = true;
    try {
      let result = fixture.compile(fs.readFileSync(input, 'utf8'), input);
      console.log(result);
    } catch (e) {
      shouldDie = false;
    }
    
    expect(shouldDie).not.to.be.ok;
  });
});

describe('The Sass Compiler', function() {
  it('should compile valid Sass', function() {
    let fixture = new ScssCompiler();
    
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.sass');
    let result = fixture.compile(fs.readFileSync(input, 'utf8'), input);
    
    expect(result.length > 0).to.be.ok;
  });
  
  it('should fail on invalid Sass', function() {
    let fixture = new ScssCompiler();
    
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'invalid.sass');
    
    let shouldDie = true;
    try {
      let result = fixture.compile(fs.readFileSync(input, 'utf8'), input);
      console.log(result);
    } catch (e) {
      shouldDie = false;
    }
    
    expect(shouldDie).not.to.be.ok;
  });
});
