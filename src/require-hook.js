import _ from 'lodash';
import mimeTypes from 'mime-types';

export default function registerRequireExtension(compilerHost) {
  _.each(Object.keys(compilerHost.compilersByMimeType), (mimeType) => {
    let ext = mimeTypes.extension(mimeType);
    
    require.extensions[`.${ext}`] = (module, filename) => {
      let {code} = compilerHost.compileSync(filename);
      module._compile(code, filename);
    };
  });
}
