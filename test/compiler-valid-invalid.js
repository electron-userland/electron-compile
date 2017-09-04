import './support';

import pify from 'pify';
import fs from 'fs';
import path from 'path';
import mimeTypes from '@paulcbetts/mime-types';

const pfs = pify(fs);

let fixtureDir = path.join(__dirname, '..', 'test', 'fixtures');
let allFixtureFiles = fs.readdirSync(fixtureDir)
  .filter((x) => x.match(/invalid\./i));

let mimeTypesToTest = allFixtureFiles.reduce((acc,x) => {
  if (global.compilersByMimeType[mimeTypes.lookup(x) || '__nope__']) {
    acc.push(mimeTypes.lookup(x));
  }

  return acc;
}, []);

const expectedMimeTypeSpecialCases = {
  'text/less': 'text/css',
  'text/jade': 'text/html',
  'text/cson': 'application/json',
  'text/css': 'text/css',
  'text/stylus': 'text/css',
  'text/scss': 'text/css',
  'text/sass': 'text/css',
  'text/vue': 'application/javascript'
};

const mimeTypesWithoutSourceMapSupport = [
  'text/jade',
  'text/cson',
  'text/css',
  'text/sass',
  'text/scss',
  'text/elm',
  'text/graphql'
];

const compilerOptionsForMimeType = {
  'application/javascript': {
    "presets": ["es2016-node5"],
    "plugins": ["transform-async-to-generator"],
    "sourceMaps": "inline"
  },

  'text/jsx': {
    "presets": ["es2016-node5", "react"],
    "plugins": ["transform-async-to-generator"],
    "sourceMaps": "inline"
  },

  'text/stylus': {
    'import': ['nib'],
    'sourcemap': 'inline'
  }
};

const mimeTypesWithDependentFilesSupport = [
  'text/scss',
  'text/sass',
  'text/less',
  'text/stylus',
];

for (let mimeType of mimeTypesToTest) {
  let klass = global.compilersByMimeType[mimeType];

  describe(`The ${klass.name} class for ${mimeType}`, function() {
    beforeEach(function() {
      if ('createFromCompilers' in klass) {
        let innerCompilers = Object.keys(global.compilersByMimeType).reduce((acc, x) => {
          if ('createFromCompilers' in global.compilersByMimeType[x]) return acc;

          acc[x] = new global.compilersByMimeType[x]();
          if (x in compilerOptionsForMimeType) acc[x].compilerOptions = compilerOptionsForMimeType[x];
          return acc;
        }, {});

        this.fixture = klass.createFromCompilers(innerCompilers);
      } else {
        this.fixture = new klass();
      }

      if (mimeType in compilerOptionsForMimeType) {
        this.fixture.compilerOptions = compilerOptionsForMimeType[mimeType];
      }
    });

    it(`should compile the valid ${mimeType} file`, async function() {
      let ext = mimeTypes.extension(mimeType);
      let input = path.join(__dirname, '..', 'test', 'fixtures', `valid.${ext}`);

      let ctx = {};
      let shouldCompile = await this.fixture.shouldCompileFile(input, ctx);
      expect(shouldCompile).to.be.ok;

      let source = await pfs.readFile(input, 'utf8');
      // let dependentFiles = await this.fixture.determineDependentFiles(source, input, ctx);
      // expect(dependentFiles.length).to.equal(0);

      let result = await this.fixture.compile(source, input, ctx);
      let expectedMimeType = expectedMimeTypeSpecialCases[mimeType] || 'application/javascript';

      expect(result.mimeType).to.equal(expectedMimeType);

      // NB: Some compilers don't do source maps
      if (!mimeTypesWithoutSourceMapSupport.includes(mimeType)) {
        let lines = result.code.split('\n');
        expect(lines.find((x) => x.match(/sourceMappingURL=/))).to.be.ok;
      }

      expect(typeof(result.code)).to.equal('string');
    });

    it(`should fail the invalid ${mimeType} file`, async function() {
      let ext = mimeTypes.extension(mimeType);
      let input = path.join(__dirname, '..', 'test', 'fixtures', `invalid.${ext}`);

      let ctx = {};
      let shouldCompile = await this.fixture.shouldCompileFile(input, ctx);
      expect(shouldCompile).to.be.ok;

      let source = await pfs.readFile(input, 'utf8');
      // let dependentFiles = await this.fixture.determineDependentFiles(source, input, ctx);
      // expect(dependentFiles.length).to.equal(0);

      let result = this.fixture.compile(source, input, ctx);
      expect(result).to.eventually.throw();
    });

    if (mimeTypesWithDependentFilesSupport.includes(mimeType)) {
      it(`should return a non-empty array of dependent files if a file has dependencies`, async function() {
        let ext = mimeTypes.extension(mimeType);
        let input = path.join(__dirname, '..', 'test', 'fixtures', `file-with-dependencies.${ext}`);

        let ctx = {};
        let source = await pfs.readFile(input, 'utf8');
        let dependentFiles = await this.fixture.determineDependentFiles(source, input, ctx);
        expect(dependentFiles).to.have.length.above(0);
      });
    }
  });
}
