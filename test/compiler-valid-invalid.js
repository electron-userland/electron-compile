import './support';

import pify from 'pify';
import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import mimeTypes from '@paulcbetts/mime-types';

const pfs = pify(fs);

let allFixtureFiles = _.filter(
  fs.readdirSync(path.join(__dirname, '..', 'test', 'fixtures')),
  (x) => x.match(/invalid\./i));

let mimeTypesToTest = _.reduce(allFixtureFiles, (acc,x) => {
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
  'text/stylus': 'text/css'
};

const mimeTypesWithoutSourceMapSupport = [
  'text/jade',
  'text/cson',
  'text/css'
];

const compilerOptionsForMimeType = {
  'application/javascript': {
    "presets": ["stage-0", "es2015"],
    "plugins": ["transform-runtime"],
    "sourceMaps": "inline"
  },

  'text/jsx': {
    "presets": ["react", "stage-0", "es2015"],
    "plugins": ["transform-runtime"],
    "sourceMaps": "inline"
  }
};

for (let mimeType of mimeTypesToTest) {
  let klass = global.compilersByMimeType[mimeType];

  describe(`The ${klass.name} class for ${mimeType}`, function() {
    beforeEach(function() {
      this.fixture = new klass();

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
      let dependentFiles = await this.fixture.determineDependentFiles(source, input, ctx);
      expect(dependentFiles.length).to.equal(0);

      let result = await this.fixture.compile(source, input, ctx);
      let expectedMimeType = expectedMimeTypeSpecialCases[mimeType] || 'application/javascript';

      expect(result.mimeType).to.equal(expectedMimeType);

      // NB: Some compilers don't do source maps
      if (!mimeTypesWithoutSourceMapSupport.includes(mimeType)) {
        let lines = result.code.split('\n');
        expect(_.any(lines, (x) => x.match(/sourceMappingURL=/))).to.be.ok;
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
      let dependentFiles = await this.fixture.determineDependentFiles(source, input, ctx);
      expect(dependentFiles.length).to.equal(0);

      let result = this.fixture.compile(source, input, ctx);
      expect(result).to.eventually.throw();
    });
  });
}
