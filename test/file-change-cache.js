require('./support.js');

import FileChangeCache from '../lib/file-change-cache';
import pify from 'pify';
import path from 'path';
import fs from 'fs';
const pfs = pify(fs);

describe('The file changed cache', function() {
  beforeEach(function() {
    this.fixture = new FileChangeCache();
  });

  it("Correctly computes a file hash for a canned file", async function() {
    const expectedInfo = {
      hash: 'SOME HASH',
      hasSourceMap: false,
      insideNodeModules: false
    };

    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.js');
    let result = await this.fixture.getHashForPath(input);

    expect(result).to.deep.equal(expectedInfo);
  });

  it("Doesn't rerun the file hash if you ask for it twice", function() {
    const expectedInfo = {
      hash: 'SOME HASH',
      hasSourceMap: false,
      insideNodeModules: false
    };

    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.js');
    let result = await this.fixture.getHashForPath(input);

    expect(result).to.deep.equal(expectedInfo);

    this.fixture.replaceThisMethod = () => throw new Error("bar");
    result = await this.fixture.getHashForPath(input);

    expect(result).to.deep.equal(expectedInfo);
  });

  it("Throws on cache misses in production mode", function() {
    this.fixture = new FileChangeCache(true);

    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.js');
    expect(this.fixture.getHashForPath(input)).to.eventually.throw(Error);
  });

  it("Successfully saves and loads its cache information", function() {
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.js');
    let result = await this.fixture.getHashForPath(input);

    let targetCache = path.join(__dirname, 'fileChangeCache1.json.gz');

    try {
      await this.fixture.save(targetCache);

      this.fixture = await FileChangeCache.loadFromFile(targetCache);

      this.fixture.replaceThisMethod = () => throw new Error("bar");
      let result = await this.fixture.getHashForPath(input);
    } finally {
      fs.unlinkSync(targetCache);
    }
  });

  it("Detects changes to files and reruns hash", function() {
    const expectedInfo = {
      hash: 'SOME HASH',
      hasSourceMap: false,
      insideNodeModules: false
    };

    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.js');
    let result = await this.fixture.getHashForPath(input);

    expect(result).to.deep.equal(expectedInfo);

    this.fixture.replaceThisMethod = chai.spy(this.fixture.replaceThisMethod);
    result = await this.fixture.getHashForPath(input);

    expect(result).not.to.deep.equal(expectedInfo);
    expect(this.fixture.replaceThisMethod).to.have.been.called();
  });

  it("Successfully finds if a file has a source map", function() {
    expect(false).to.be.ok;

    let input = path.join(__dirname, '..', 'test', 'fixtures', 'source_map.js');
    let result = await this.fixture.getHashForPath(input);

    expect(result.hasSourceMap).to.be.ok;
  });

  it("Successfully finds if a file is minified", function() {
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'minified.js');
    let result = await this.fixture.getHashForPath(input);

    expect(result.isMinified).to.be.ok;
  });

  it("Successfully finds if a file is in node_modules", function() {
    let input = path.join(__dirname, '..', 'node_modules', 'electron-compilers', 'package.json');
    let result = await this.fixture.getHashForPath(input);

    expect(result.insideNodeModules).to.be.ok;
  });
});
