import './support.js';

import FileChangeCache from '../src/file-change-cache';
import path from 'path';
import fs from 'fs';
import pify from 'pify';

const pfs = pify(fs);

describe('The file changed cache', function() {
  beforeEach(function() {
    this.fixture = new FileChangeCache(null);
  });

  it("Correctly computes a file hash for a canned file", async function() {
    const expectedInfo = {
      hash: '4a92e95074156e8b46869519c43ddf10b59299a4',
      hasSourceMap: false,
      isInNodeModules: false,
      isMinified: false,
      isFileBinary: false
    };

    let input = path.resolve(__dirname, '..', 'test', 'fixtures', 'valid.js');
    let result = await this.fixture.getHashForPath(input);

    expect(result.sourceCode).to.be.ok;
    delete result.sourceCode;
    expect(result).to.deep.equal(expectedInfo);
  });

  it("Correctly handles binary files", async function() {
    const expectedInfo = {
      hash: '83af4f2b5a3e2dda1a322ac75799eee337d569a5',
      hasSourceMap: false,
      isInNodeModules: false,
      isMinified: false,
      isFileBinary: true
    };

    let input = path.resolve(__dirname, '..', 'test', 'fixtures', 'binaryfile.zip');
    let result = await this.fixture.getHashForPath(input);
    expect(result.binaryData).to.be.ok;
    expect(result.binaryData.length > 16).to.be.ok;
    delete result.binaryData;
    expect(result).to.deep.equal(expectedInfo);
  });

  it("Correctly handles webp binary files", async function() {
    const expectedInfo = {
      hash: '9018bd399fab0dd21f33b23813dad941461cf3cd',
      hasSourceMap: false,
      isInNodeModules: false,
      isMinified: false,
      isFileBinary: true
    };

    let input = path.resolve(__dirname, '..', 'test', 'fixtures', 'alsobinary.webp');
    let result = await this.fixture.getHashForPath(input);

    expect(result.binaryData).to.be.ok;
    expect(result.binaryData.length > 16).to.be.ok;
    delete result.binaryData;
    expect(result).to.deep.equal(expectedInfo);
  });


  it("Correctly computes a file hash for a canned file syncronously", function() {
    const expectedInfo = {
      hash: '4a92e95074156e8b46869519c43ddf10b59299a4',
      hasSourceMap: false,
      isInNodeModules: false,
      isMinified: false,
      isFileBinary: false
    };

    let input = path.resolve(__dirname, '..', 'test', 'fixtures', 'valid.js');
    let result = this.fixture.getHashForPathSync(input);

    expect(result.sourceCode).to.be.ok;
    delete result.sourceCode;
    expect(result).to.deep.equal(expectedInfo);
  });

  it("Doesn't rerun the file hash if you ask for it twice", async function() {
    const expectedInfo = {
      hash: '4a92e95074156e8b46869519c43ddf10b59299a4',
      hasSourceMap: false,
      isInNodeModules: false,
      isMinified: false,
      isFileBinary: false
    };

    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.js');
    let result = await this.fixture.getHashForPath(input);

    expect(result.sourceCode).to.be.ok;
    delete result.sourceCode;
    expect(result).to.deep.equal(expectedInfo);

    this.fixture.calculateHashForFile = () => Promise.reject(new Error("Didn't work"));
    result = await this.fixture.getHashForPath(input);

    // NB: The file hash cache itself shouldn't hold onto file contents, it should
    // only opportunistically return it if it had to read the contents anyways
    expect(result.sourceCode).to.be.not.ok;
    expect(result).to.deep.equal(expectedInfo);
  });

  it("Throws on cache misses in production mode", function() {
    this.fixture = new FileChangeCache(null, true);

    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.js');
    expect(this.fixture.getHashForPath(input)).to.eventually.throw(Error);
  });

  it("Successfully saves and loads its cache information", async function() {
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'valid.js');
    await this.fixture.getHashForPath(input);

    let targetCache = path.join(__dirname, 'fileChangeCache1.json.gz');

    try {
      await this.fixture.save(targetCache);

      this.fixture = await FileChangeCache.loadFromFile(targetCache, null);

      this.fixture.calculateHashForFile = () => Promise.reject(new Error("Didn't work"));
      await this.fixture.getHashForPath(input);
    } finally {
      fs.unlinkSync(targetCache);
    }
  });

  it("Detects changes to files and reruns hash", async function() {
    const expectedInfo = {
      hash: '4a92e95074156e8b46869519c43ddf10b59299a4',
      hasSourceMap: false,
      isInNodeModules: false,
      isMinified: false,
      isFileBinary: false
    };

    let realInput = path.join(__dirname, '..', 'test', 'fixtures', 'valid.js');
    let input = path.join(__dirname, 'tempfile.tmp');
    let contents = await pfs.readFile(realInput);
    await pfs.writeFile(input, contents);

    let stat1 = await pfs.stat(realInput);
    let stat2 = await pfs.stat(input);
    expect(stat1.size).to.equal(stat2.size);

    try {
      let result = await this.fixture.getHashForPath(input);

      expect(result.sourceCode).to.be.ok;
      delete result.sourceCode;
      expect(result).to.deep.equal(expectedInfo);

      let fd = await pfs.open(input, 'a');
      await pfs.write(fd, '\n\n\n\n');
      await pfs.close(fd);

      // NB: Declaring these as 'var' works around a BabelJS compilation bug
      // where it can't deal with let + closure scoping
      var realCalc = this.fixture.calculateHashForFile;
      var hasCalledCalc = false;

      this.fixture.calculateHashForFile = function(...args) {
        hasCalledCalc = true;
        return realCalc(...args);
      };

      result = await this.fixture.getHashForPath(input);

      expect(result.sourceCode).to.be.ok;
      delete result.sourceCode;

      expect(result).not.to.deep.equal(expectedInfo);
      expect(hasCalledCalc).to.be.ok;
    } finally {
      fs.unlinkSync(input);
    }
  });

  it("Successfully finds if a file has a source map", async function() {
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'source_map.js');
    let result = await this.fixture.getHashForPath(input);

    expect(result.hasSourceMap).to.be.ok;
  });

  it("Successfully finds if a file has a source map synchronously", function() {
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'source_map.js');
    let result = this.fixture.getHashForPathSync(input);

    expect(result.hasSourceMap).to.be.ok;
  });

  it("Successfully finds if a file is minified", async function() {
    let input = path.join(__dirname, '..', 'test', 'fixtures', 'minified.js');
    let result = await this.fixture.getHashForPath(input);

    expect(result.isMinified).to.be.ok;
  });

  it("Successfully finds if a file is in node_modules", async function() {
    let input = path.join(__dirname, '..', 'node_modules', 'electron-compilers', 'package.json');
    let result = await this.fixture.getHashForPath(input);

    expect(result.isInNodeModules).to.be.ok;
  });
});
