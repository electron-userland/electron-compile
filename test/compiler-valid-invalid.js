require('./support');

import pify from 'pify';
import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import mimeTypes from 'mime-types';

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

for (let mimeType of mimeTypesToTest) {
  let klass = global.compilersByMimeType[mimeType];
  
  describe(`The ${klass.name} class for ${mimeType}`, function() {
    beforeEach(function() {
      this.fixture = new klass();
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
      let expectedMimeType = (mimeType === 'text/less' ? 'text/css' : 'text/javascript');
      expect(result.mimeType).to.equal(expectedMimeType);

      let lines = result.code.split('\n');
      expect(_.any(lines, (x) => x.match(/sourceMappingURL=/))).to.be.ok;
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
