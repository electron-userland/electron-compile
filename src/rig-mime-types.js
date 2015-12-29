import _ from 'lodash';
import mimeTypes from 'mime-types';

const typesToRig = {
  'text/typescript': 'ts',
  'text/jade': 'jade'
};

export function init() {
  _.each(Object.keys(typesToRig), (type) => {
    let ext = typesToRig[type];

    mimeTypes.types[ext] = type;
    mimeTypes.extensions[type] = _.clone([ext], true);
  });
}
