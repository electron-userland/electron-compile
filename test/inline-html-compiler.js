require('./support.js');

import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';

const LessCompiler = global.importCompilerByExtension('less');
const BabelCompiler = global.importCompilerByExtension('js');
const CoffeescriptCompiler = global.importCompilerByExtension('coffee');
const InlineHtmlCompiler = global.importCompilerByExtension('html');

describe('The inline HTML compiler', function() {
  it('should compile the valid fixture', function() {
    let compilers = _.map([LessCompiler, BabelCompiler, CoffeescriptCompiler], (Klass) => {
      let ret = new Klass();
      ret.setCacheDirectory(null);
      return ret;
    });
    
    let fixture = new InlineHtmlCompiler((sourceCode, filePath) => {
      let compiler = _.find(compilers, (x) => x.shouldCompileFile(filePath, sourceCode));
      if (!compiler) {
        throw new Error("Couldn't find a compiler for " + filePath);
      }
      
      return compiler.loadFile(null, filePath, true, sourceCode);
    });
    
    fixture.setCacheDirectory(null);
    
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'inline-valid.html');
    let result = fixture.loadFile(null, input, true);
        
    console.log(result);
    expect(result.length > 0).to.be.ok;
    
    let $ = cheerio.load(result);
    let tags = $('script');
    expect(tags.length === 3).to.be.ok
    
    $('script').map((__, el) => {
      let text = $(el).text();
      if (!text || text.length < 2) return;
      
      expect(_.find(text.split('\n'), (l) => l.match(/sourceMappingURL/))).to.be.ok;
    });
  });
});
