require('./support.js');

import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import pify from 'pify';
import _ from 'lodash';
import mimeTypes from 'mime-types';

const validInputs = [
  'inline-valid.html',
  'inline-valid-2.html'
];

const pfs = pify(fs);
const InlineHtmlCompiler = global.compilersByMimeType['text/html'];

describe('The inline HTML compiler', function() {
  beforeEach(function() {
    let compileCount = 0;

    this.fixture = new InlineHtmlCompiler((sourceCode, filePath, mimeType, tag) => {
      let realType = mimeType;
      if (!mimeType && tag === 'script') realType = 'text/javascript';

      if (!realType) return sourceCode;

      let Klass = global.compilersByMimeType[realType];
      let compiler = new Klass();

      if (!compiler) return sourceCode;

      let ext = mimeTypes.extension(realType);
      let fakeFile = `${filePath}:inline_${compileCount++}.${ext}`;

      let cc = {};
      if (!compiler.shouldCompileFileSync(fakeFile, cc)) return sourceCode;
      return compiler.compileSync(sourceCode, fakeFile, cc).code;
    });
  });

  _.each(validInputs, (inputFile) => {
    it('should compile the valid fixture ' + inputFile, async function() {
      let input = path.join(__dirname, '..', 'test', 'fixtures', inputFile);

      let cc = {};
      expect(await this.fixture.shouldCompileFile(input, cc)).to.be.ok;

      let code = await pfs.readFile(input, 'utf8');
      let df = await this.fixture.determineDependentFiles(input, code, cc);

      expect(df.length).to.equal(0);

      let result = await this.fixture.compile(code, input, cc);

      let $ = cheerio.load(result.code);
      let tags = $('script');
      expect(tags.length > 0).to.be.ok;

      $('script').map((__, el) => {
        let text = $(el).text();
        if (!text || text.length < 2) return;

        expect(_.find(text.split('\n'), (l) => l.match(/sourceMappingURL/))).to.be.ok;
      });
    });
  });

  it('should remove protocol-relative URLs because they are dumb', function() {
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

    let input = path.join(__dirname, '..', 'test', 'fixtures', 'roboto.html');
    let result = fixture.loadFile(null, input, true);

    expect(result.length > 0).to.be.ok;

    let $ = cheerio.load(result);
    let tags = $('link');
    expect(tags.length === 1).to.be.ok;
    expect($(tags[0]).attr('href').match(/^https/i)).to.be.ok;
  });

  it('should canonicalize x-require paths', function() {
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

    let input = path.join(__dirname, '..', 'test', 'fixtures', 'x-require-valid.html');
    let result = fixture.loadFile(null, input, true);

    expect(result.length > 0).to.be.ok;

    let $ = cheerio.load(result);
    let tags = $('x-require');
    expect(tags.length === 1).to.be.ok;

    $('x-require').map((__, el) => {
      let src = $(el).attr('src');
      expect(_.find(src.split(/[\\\/]/), (x) => x === '.' || x === '..')).not.to.be.ok;
    });
  });
});
