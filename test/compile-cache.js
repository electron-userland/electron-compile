import './support.js';

import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import FileChangeCache from '../src/file-change-cache';
import CompileCache from '../src/compile-cache';
import pify from 'pify';

const pfs = pify(fs);

let testCount=0;

describe('The compile cache', function() {
  beforeEach(function() {
    this.appRootDir = path.join(__dirname, '..');
    this.fileChangeCache = new FileChangeCache(this.appRootDir);
    
    this.tempCacheDir = path.join(__dirname, `__compile_cache_${testCount++}`);
    mkdirp.sync(this.tempCacheDir);
    this.fixture = new CompileCache(this.tempCacheDir, this.fileChangeCache);
  });
  
  afterEach(function() {
    rimraf.sync(this.tempCacheDir);
  });
  
  it('Should only call compile once for the same file', async function() {
    let inputFile = path.resolve(__dirname, '..', 'src', 'compile-cache.js');
    let callCount = 0;
    
    let fetcher = async function(filePath, hashInfo) {
      callCount++;
      
      let code = hashInfo.sourceCode || await pfs.readFile(filePath, 'utf8');
      let mimeType = 'application/javascript';
      return { code, mimeType };
    };
    
    let result = await this.fixture.getOrFetch(inputFile, fetcher);
    
    expect(result.mimeType).to.equal('application/javascript');
    expect(result.code.length > 10).to.be.ok;
    expect(callCount).to.equal(1);
    
    result = await this.fixture.getOrFetch(inputFile, fetcher);
      
    expect(result.mimeType).to.equal('application/javascript');
    expect(result.code.length > 10).to.be.ok;
    expect(callCount).to.equal(1);
    
    this.fixture = new CompileCache(this.tempCacheDir, this.fileChangeCache);
        
    result = await this.fixture.getOrFetch(inputFile, fetcher);
      
    expect(result.mimeType).to.equal('application/javascript');
    expect(result.code.length > 10).to.be.ok;
    expect(callCount).to.equal(1);
  });
    
  it('Should roundtrip binary files', async function() {
    let inputFile = path.resolve(__dirname, '..', 'test', 'fixtures', 'binaryfile.zip');
    let hashInfo = await this.fileChangeCache.getHashForPath(inputFile);
    
    await this.fixture.save(hashInfo, hashInfo.binaryData, 'application/zip');
    
    let fetcher = async function() {
      throw new Error("No");
    };
    
    let result = await this.fixture.getOrFetch(inputFile, fetcher);
    expect(result.mimeType).to.equal('application/zip');
    expect(result.binaryData.length).to.equal(hashInfo.binaryData.length);
  
    this.fixture = new CompileCache(this.tempCacheDir, this.fileChangeCache);
        
    result = await this.fixture.getOrFetch(inputFile, fetcher);
    expect(result.mimeType).to.equal('application/zip');
    expect(result.binaryData.length).to.equal(hashInfo.binaryData.length);  
  });
    
  it('Should roundtrip binary files synchronously', function() {
    let inputFile = path.resolve(__dirname, '..', 'test', 'fixtures', 'binaryfile.zip');
    let hashInfo = this.fileChangeCache.getHashForPathSync(inputFile);
    
    this.fixture.saveSync(hashInfo, hashInfo.binaryData, 'application/zip');
    
    let fetcher = function() {
      throw new Error("No");
    };
    
    let result = this.fixture.getOrFetchSync(inputFile, fetcher);
    expect(result.mimeType).to.equal('application/zip');
    expect(result.binaryData.length).to.equal(hashInfo.binaryData.length);
  
    this.fixture = new CompileCache(this.tempCacheDir, this.fileChangeCache);
        
    result = this.fixture.getOrFetchSync(inputFile, fetcher);
    expect(result.mimeType).to.equal('application/zip');
    expect(result.binaryData.length).to.equal(hashInfo.binaryData.length);  
  });
  
  it('Should only call compile once for the same file synchronously', function() {
    let inputFile = path.resolve(__dirname, '..', 'src', 'compile-cache.js');
    let callCount = 0;
    
    let fetcher = function(filePath, hashInfo) {
      callCount++;
      
      let code = hashInfo.sourceCode || fs.readFileSync(filePath, 'utf8');
      let mimeType = 'application/javascript';
      
      return { code, mimeType };
    };
    
    let result = this.fixture.getOrFetchSync(inputFile, fetcher);
    
    expect(result.mimeType).to.equal('application/javascript');
    expect(result.code.length > 10).to.be.ok;
    expect(callCount).to.equal(1);
    
    result = this.fixture.getOrFetchSync(inputFile, fetcher);
      
    expect(result.mimeType).to.equal('application/javascript');
    expect(result.code.length > 10).to.be.ok;
    expect(callCount).to.equal(1);
    
    this.fixture = new CompileCache(this.tempCacheDir, this.fileChangeCache);
        
    result = this.fixture.getOrFetchSync(inputFile, fetcher);
      
    expect(result.mimeType).to.equal('application/javascript');
    expect(result.code.length > 10).to.be.ok;
    expect(callCount).to.equal(1);
  });

  it('Shouldnt cache compile failures', async function() {
    let inputFile = path.resolve(__dirname, '..', 'lib', 'compile-cache.js');
    let callCount = 0;
    let weBlewUpCount = 0;
    
    let fetcher = async function() {
      callCount++;
      throw new Error("Lolz");
    };
    
    try {
      await this.fixture.getOrFetch(inputFile, fetcher);    
    } catch (e) {
      weBlewUpCount++;
    }

    expect(callCount).to.equal(1);
    expect(weBlewUpCount).to.equal(1);

    try {
      await this.fixture.getOrFetch(inputFile, fetcher);    
    } catch (e) {
      weBlewUpCount++;
    }
    
    expect(callCount).to.equal(2);
    expect(weBlewUpCount).to.equal(2);
  });
});
