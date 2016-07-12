import './support.js';

import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import pify from 'pify';

const validInputs = [
  'inline-valid.html',
  'inline-valid-2.html',
  'inline-valid-3.html'
];

const pfs = pify(fs);
const InlineHtmlCompiler = global.compilersByMimeType['text/html'];

const d = require('debug-electron')('test:inline-html-compiler');

describe('The inline HTML compiler', function() {
  beforeEach(function() {
    let compilers = Object.keys(global.compilersByMimeType).reduce((acc, x) => {
      let Klass = global.compilersByMimeType[x];
      acc[x] = new Klass();

      return acc;
    }, {});

    compilers['application/javascript'].compilerOptions = {
      "presets": ["stage-0", "es2015", "react"],
      "sourceMaps": "inline"
    };

    compilers['text/coffeescript'].compilerOptions = { sourceMap: true };

    this.fixture = InlineHtmlCompiler.createFromCompilers(compilers);
  });

  validInputs.forEach((inputFile) => {
    it('should compile the valid fixture ' + inputFile, async function() {
      let input = path.join(__dirname, '..', 'test', 'fixtures', inputFile);

      let cc = {};
      expect(await this.fixture.shouldCompileFile(input, cc)).to.be.ok;

      let code = await pfs.readFile(input, 'utf8');
      let df = await this.fixture.determineDependentFiles(input, code, cc);

      expect(df.length).to.equal(0);

      let result = await this.fixture.compile(code, input, cc);
      expect(result.mimeType).to.equal('text/html');

      let $ = cheerio.load(result.code);
      let tags = $('script');
      expect(tags.length > 0).to.be.ok;

      $('script').map((__, el) => {
        let text = $(el).text();
        if (!text || text.length < 2) return;

        if ($(el).attr('type').match(/handlebars/)) return;

        expect(text.split('\n').find((l) => l.match(/sourceMappingURL/))).to.be.ok;
      });
    });

    it('should compile the valid fixture ' + inputFile + ' synchronously', function() {
      let input = path.join(__dirname, '..', 'test', 'fixtures', inputFile);

      let cc = {};
      expect(this.fixture.shouldCompileFileSync(input, cc)).to.be.ok;

      let code = fs.readFileSync(input, 'utf8');
      let df = this.fixture.determineDependentFilesSync(input, code, cc);

      expect(df.length).to.equal(0);

      let result = this.fixture.compileSync(code, input, cc);
      expect(result.mimeType).to.equal('text/html');

      let $ = cheerio.load(result.code);
      let tags = $('script');
      expect(tags.length > 0).to.be.ok;

      $('script').map((__, el) => {
        let text = $(el).text();
        if (!text || text.length < 2) return;

        d($(el).attr('type'));
        if ($(el).attr('type').match(/handlebars/)) return;

        d(text);
        expect(text.split('\n').find((l) => l.match(/sourceMappingURL/))).to.be.ok;
      });
    });
  });

  it('should remove protocol-relative URLs because they are dumb', async function() {
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'roboto.html');

    let cc = {};
    expect(await this.fixture.shouldCompileFile(input, cc)).to.be.ok;

    let code = await pfs.readFile(input, 'utf8');
    let df = await this.fixture.determineDependentFiles(input, code, cc);

    expect(df.length).to.equal(0);

    let result = await this.fixture.compile(code, input, cc);

    expect(result.code.length > 0).to.be.ok;
    expect(result.mimeType).to.equal('text/html');

    let $ = cheerio.load(result.code);
    let tags = $('link');
    expect(tags.length === 1).to.be.ok;
    expect($(tags[0]).attr('href').match(/^https/i)).to.be.ok;
  });

  it('should canonicalize x-require paths', async function() {
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'x-require-valid.html');

    let cc = {};
    expect(await this.fixture.shouldCompileFile(input, cc)).to.be.ok;

    let code = await pfs.readFile(input, 'utf8');
    let df = await this.fixture.determineDependentFiles(input, code, cc);

    expect(df.length).to.equal(0);

    let result = await this.fixture.compile(code, input, cc);

    expect(result.code.length > 0).to.be.ok;
    expect(result.mimeType).to.equal('text/html');

    let $ = cheerio.load(result.code);
    let tags = $('x-require');
    expect(tags.length === 1).to.be.ok;

    $('x-require').map((__, el) => {
      let src = $(el).attr('src');
      expect(src.split(/[\\\/]/).find((x) => x === '.' || x === '..')).not.to.be.ok;
    });
  });
});
