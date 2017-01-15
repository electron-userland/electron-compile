import path from 'path';
import fs from 'fs';
import toutSuite from 'toutsuite';

import {CompilerBase} from '../compiler-base';

const mimeTypes = ['text/sass', 'text/scss'];
let sass = null;

/**
 * @access private
 */
export default class SassCompiler extends CompilerBase {
  constructor() {
    super();

    this.compilerOptions = {
      comments: true,
      sourceMapEmbed: true,
      sourceMapContents: true
    };

    this.seenFilePaths = {};
  }

  static getInputMimeTypes() {
    return mimeTypes;
  }

  async shouldCompileFile(fileName, compilerContext) {
    return true;
  }

  async determineDependentFiles(sourceCode, filePath, compilerContext) {
    return [];
  }

  async compile(sourceCode, filePath, compilerContext) {
    sass = sass || require('sass.js/dist/sass.node').Sass;

    let thisPath = path.dirname(filePath);
    this.seenFilePaths[thisPath] = true;

    let paths = Object.keys(this.seenFilePaths);

    if (this.compilerOptions.paths) {
      paths.push(...this.compilerOptions.paths);
    }

    paths.unshift('.');

    const { includePaths } = this.compilerOptions
    if (includePaths) {
      sass.importer(this.buildImporterCallback(includePaths))
      delete this.compilerOptions.includePaths;
    }

    let opts = Object.assign({}, this.compilerOptions, {
      indentedSyntax: filePath.match(/\.sass$/i),
      sourceMapRoot: filePath,
    });

    let result = await new Promise((res,rej) => {
      sass.compile(sourceCode, opts, (r) => {
        if (r.status !== 0) {
          rej(new Error(r.formatted || r.message));
          return;
        }

        res(r);
        return;
      });
    });

    return {
      code: result.text,
      mimeType: 'text/css'
    };
  }

  shouldCompileFileSync(fileName, compilerContext) {
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) {
    return [];
  }

  compileSync(sourceCode, filePath, compilerContext) {
    sass = sass || require('sass.js/dist/sass.node').Sass;

    let thisPath = path.dirname(filePath);
    this.seenFilePaths[thisPath] = true;

    let paths = Object.keys(this.seenFilePaths);

    if (this.compilerOptions.paths) {
      paths.push(...this.compilerOptions.paths);
    }

    paths.unshift('.');

    const { includePaths } = this.compilerOptions
    if (includePaths) {
      sass.importer(this.buildImporterCallback(includePaths))
      delete this.compilerOptions.includePaths;
    }

    let opts = Object.assign({}, this.compilerOptions, {
      indentedSyntax: filePath.match(/\.sass$/i),
      sourceMapRoot: filePath,
    });

    let result;
    toutSuite(() => {
      sass.compile(sourceCode, opts, (r) => {
        if (r.status !== 0) {
          throw new Error(r.formatted);
        }
        result = r;
      });
    });

    return {
      code: result.text,
      mimeType: 'text/css'
    };
  }

  buildImporterCallback (includePaths) {
    const resolvedIncludePaths = includePaths.map((includePath) =>
      path.resolve(process.cwd(), includePath)
    );

    return (function (request, done) {
      let file
      if (request.file) {
        done();
      } else {
        // sass.js works in the '/sass/' directory
        const cleanedRequestPath = request.resolved.replace(/^\/sass\//, '');
        for (let includePath of includePaths) {
          const filePath = path.resolve(includePath, cleanedRequestPath);
          const validator = (file) => {
            const stat = fs.statSync(file);
            if (!stat.isFile()) throw new Error(`${file} is not a file`);
          };
          const variations = sass.getPathVariations(filePath);
          file = variations
            .map((file) => {
              // Unfortunately, there's a bug in sass.js that seems to ignore the different
              // path separators across platforms. We need to fix this.
              if (process.platform === 'win32' && file[0] === '/') {
                file = file.slice(1);
              }

              if (file[0] === '_') {
                const parts = file.slice(1).split(path.sep);
                const dir = parts.slice(0, -1).join(path.sep);
                const fileName = parts.reverse()[0];
                file = path.resolve(dir, '_' + fileName);
              }
              return file
            })
            .reduce(function(found, path) {
              // Find the first variation that actually exists
              if (found) return found;

              try {
                const stat = fs.statSync(path);
                if (!stat.isFile()) return null;
                return path;
              } catch(e) {
                return null;
              }
            }, null);

          if (file) {
            const content = fs.readFileSync(file, { encoding: 'utf8' });
            return sass.writeFile(file, content, () => {
              done({ path: file })
            });
          }
        }

        if (!file) done();
      }
    });
  }

  getCompilerVersion() {
    // NB: There is a bizarre bug in the node module system where this doesn't
    // work but only in saveConfiguration tests
    //return require('@paulcbetts/node-sass/package.json').version;
    return "4.1.1";
  }
}
