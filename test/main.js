require('./support.js');

import {compile} from '../lib/main';
import path from 'path';

describe('exports for this library', function() {
  describe('the compile method', function() {
    it('should compile a LESS file', function() {
      let result = compile(path.resolve(__dirname, 'fixtures', 'valid.less'));
      expect(result.length > 10).to.be.ok;
    });
    
    it('should passthrough files it doesnt recognize', function() {
      let result = compile(path.resolve(__dirname, '..', '.gitignore'));
      expect(result.length > 10).to.be.ok;
    });
    
    it('should blow up on bad input', function() {
      let shouldDie = true;
      try {
        compile(path.resolve(__dirname, 'fixtures', 'invalid.ts'));
      } catch (e) {
        shouldDie = false;
      }
      
      expect(shouldDie).not.to.be.ok;
    });
  });
});
