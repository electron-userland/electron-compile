require('./support');

import pify from 'pify';
import fs from 'fs';
import path from 'path';
import _ from 'lodash';

const pfs = pify(fs);

import allCompilers from 'electron-compilers';
const CoffeeScriptCompilerNext = _.find(allCompilers, (x) => x.name === "CoffeeScriptCompilerNext");

describe.only('The new Coffeescript compiler', function() {
  beforeEach(function() {
    this.fixture = new CoffeeScriptCompilerNext();
  });

  it('should compile the valid coffeescript file', async function() {
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.coffee');

    let ctx = {};
    let shouldCompile = await this.fixture.shouldCompileFile(input, ctx);
    expect(shouldCompile).to.be.ok;

    let source = await pfs.readFile(input, 'utf8');
    let dependentFiles = await this.fixture.determineDependentFiles(source, input, ctx);
    expect(dependentFiles.length).to.equal(0);

    let result = await this.fixture.compile(source, input, ctx);
    expect(result.mimeType).to.equal('text/javascript');

    let lines = result.code.split('\n');
    expect(_.any(lines, (x) => x.match(/sourceMappingURL=/))).to.be.ok;
  });

  it('should fail the invalid coffeescript file', async function() {
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'invalid.coffee');

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
