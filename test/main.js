require('./support.js');

import _ from 'lodash';
import {compile} from '../lib/main';
import path from 'path';
import TypeScriptCompiler from '../lib/js/typescript';
import LessCompiler from '../lib/css/less';

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
});
