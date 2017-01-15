import path from 'path'
import SassCompiler from '../../src/css/sass';

describe('css/sass', function () {
  this.timeout(5000)
  it('should correctly compile valid sass', (done) => {
    const sass = 'body, html\n  background: red';
    const filename = 'file.sass';

    const compiler = new SassCompiler();
    compiler.compilerOptions = { comments: false };

    compiler.compile(sass, filename)
      .then((result) => {
        expect(result.mimeType).to.equal('text/css');
        expect(result.code).to.equal('body, html {\n  background: red; }\n');
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  describe('when passing includePaths', () => {
    it('should correctly resolve import paths', (done) => {
      const sass = '@import "importable"';
      const filename = 'file.sass';

      const compiler = new SassCompiler();
      compiler.compilerOptions = Object.assign({}, compiler.compilerOptions, {
        includePaths: ['test/css/fixtures'],
        comments: false
      });

      compiler.compile(sass, filename)
        .then((result) => {
          expect(result.mimeType).to.equal('text/css');
          expect(result.code).to.equal('body, html {\n  background: red; }\n');
          done();
        })
        .catch((err) => {
          done(err);
        });
    })
  })
});
