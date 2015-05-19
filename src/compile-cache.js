'use babel';

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import _ from 'lodash';

export default class CompileCache {
  constructor() {
    this.stats = {
      hits: 0,
      misses: 0
    };

    this.cacheDir = null;
    this.jsCacheDir = null;
    this.seenFilePaths = {};
  }

  getCompilerInformation() {
    throw new Error("Implement this in a derived class");
  }

  compile(sourceCode, filePath, cachePath) {
    throw new Error("Implement this in a derived class");
  }

  getMimeType() {
    throw new Error("Implement this in a derived class");
  }

  initializeCompiler() {
    throw new Error("Implement this in a derived class");
  }

  shouldCompileFile(sourceCode, fullPath) {
    this.ensureInitialized();
    let lowerPath = fullPath.toLowerCase();

    // NB: require() normally does this for us, but in our protocol hook we
    // need to do this ourselves
    return _.some(
      this.extensions,
      (ext) => lowerPath.lastIndexOf(ext) + ext.length === lowerPath.length);
  }

  ///
  /// shasum - Hash with an update() method.
  /// value - Must be a value that could be returned by JSON.parse().
  ///
  updateDigestForJsonValue(shasum, value) {
    // Implmentation is similar to that of pretty-printing a JSON object, except:
    // * Strings are not escaped.
    // * No effort is made to avoid trailing commas.
    // These shortcuts should not affect the correctness of this function.
    const type = typeof(value);

    if (type === 'string') {
      shasum.update('"', 'utf8');
      shasum.update(value, 'utf8');
      shasum.update('"', 'utf8');
      return;
    }

    if (type === 'boolean' || type === 'number') {
      shasum.update(value.toString(), 'utf8');
      return;
    }

    if (value === null) {
      shasum.update('null', 'utf8');
      return;
    }

    if (Array.isArray(value)) {
      shasum.update('[', 'utf8');
      for (let i=0; i < value.length; i++) {
        this.updateDigestForJsonValue(shasum, value[i]);
        shasum.update(',', 'utf8');
      }
      shasum.update(']', 'utf8');
      return;
    }

    // value must be an object: be sure to sort the keys.
    let keys = Object.keys(value);
    keys.sort();

    shasum.update('{', 'utf8');

    for (let i=0; i < keys.length; i++) {
      this.updateDigestForJsonValue(shasum, keys[i]);
      shasum.update(': ', 'utf8');
      this.updateDigestForJsonValue(shasum, value[keys[i]]);
      shasum.update(',', 'utf8');
    }

    shasum.update('}', 'utf8');
  }

  createDigestForCompilerInformation() {
    let sha1 = crypto.createHash('sha1');
    this.updateDigestForJsonValue(sha1, this.getCompilerInformation());
    return sha1.digest('hex');
  }

  getCachePath(sourceCode) {
    let digest = crypto.createHash('sha1').update(sourceCode, 'utf8').digest('hex');

    if (!this.jsCacheDir) {
      this.jsCacheDir = path.join(this.cacheDir, this.createDigestForCompilerInformation());
      mkdirp.sync(this.jsCacheDir);
    }

    return path.join(this.jsCacheDir, `${digest}.js`);
  }

  getCachedJavaScript(cachePath) {
    try {
      let ret = fs.readFileSync(cachePath, 'utf8');
      this.stats.hits++;

      return ret;
    } catch (e) {
      return null;
    }
  }

  saveCachedJavaScript(cachePath, js) {
    fs.writeFileSync(cachePath, js);
  }

  // Function that obeys the contract of an entry in the require.extensions map.
  // Returns the transpiled version of the JavaScript code at filePath, which is
  // either generated on the fly or pulled from cache.
  loadFile(module, filePath, returnOnly=false, sourceCode=null) {
    this.ensureInitialized();

    let fullPath = path.resolve(filePath);
    this.seenFilePaths[path.dirname(filePath)] = true;

    sourceCode = sourceCode || fs.readFileSync(filePath, 'utf8');

    if (!this.shouldCompileFile(sourceCode, fullPath)) {
      if (returnOnly) return sourceCode;
      return module._compile(sourceCode, filePath);
    }

    // NB: We do all of these backflips in order to not load compilers unless
    // we actually end up using them, since loading them is typically fairly
    // expensive
    if (!this.compilerInformation.version) {
      this.compilerInformation.version = this.initializeCompiler();
    }

    let cachePath = this.getCachePath(sourceCode);
    let js = this.getCachedJavaScript(cachePath);

    if (!js) {
      js = this.compile(sourceCode, filePath, cachePath);
      this.stats.misses++;

      this.saveCachedJavaScript(cachePath, js);
    }

    if (returnOnly) return js;
    return module._compile(js, filePath);
  }

  register() {
    this.ensureInitialized();

    for (let i=0; i < this.extensions.length; i++) {
      Object.defineProperty(require.extensions, `.${this.extensions[i]}`, {
        enumerable: true,
        writable: false,
        value: (module, filePath) => this.loadFile(module, filePath)
      });
    }
  }

  ensureInitialized() {
    if (this.extensions) return;

    let info = this.getCompilerInformation();

    if (!info.extension && !info.extensions) {
      throw new Error("Compiler must register at least one extension in getCompilerInformation");
    }

    this.extensions = (info.extensions ? info.extensions : [info.extension]);
  }

  setCacheDirectory(newCacheDir) {
    if (this.cacheDir === newCacheDir) return;

    this.cacheDir = newCacheDir;
    this.jsCacheDir = null;
  }
}
