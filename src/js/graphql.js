import {SimpleCompilerBase} from '../compiler-base';

const inputMimeTypes = ['text/graphql'];
let gql = null;

export default class GraphQLCompiler extends SimpleCompilerBase {
  constructor() {
    super();
  }

  static getInputMimeTypes() {
    return inputMimeTypes;
  }

  compileSync(sourceCode) {
    gql = gql || require('graphql-tag/loader');
    // This is a stub, original loader calls webpack-specific this.cacheable()
    const webpackLoaderStub = {
      cacheable: () => {}
    };
    const loader = gql.bind(webpackLoaderStub);

    const js = loader(sourceCode);

    return {
      code: js,
      mimeType: 'application/javascript'
    };
  }

  getCompilerVersion() {
    return require('graphql-tag/package.json').version;
  }
}
