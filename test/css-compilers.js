require('./support.js');

import fs from 'fs';
import path from 'path';

import LessCompiler from '../lib/css/less';

describe('The LESS Compiler', function() {
  it('should compile valid LESS', function() {
    let fixture = new LessCompiler();
    
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.less');
    let result = fixture.compile(fs.readFileSync(input, 'utf8'));
    
    expect(result.length > 0).to.be.ok;
  });
  
  it('should fail on invalid LESS', function() {
    let fixture = new LessCompiler();
    
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'invalid.less');
    
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
