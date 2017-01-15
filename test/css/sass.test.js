import SassCompiler from '../../src/css/sass';

describe('css/sass', () => {
  it('should correctly compile valid sass', function (done) {
    this.timeout(5000)

    const sass = 'body, html\n  background: red';
    const filename = 'file.sass';

    const compiler = new SassCompiler();
    compiler.compile(sass, filename)
      .then((result) => {
        expect(result.mimeType).to.equal('text/css');
        expect(result.code).to.equal('/* line 2, /stdin */\nbody, html {\n  background: red; }\n');
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});
