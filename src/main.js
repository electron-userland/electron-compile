import _ from 'lodash';

const filenames = [
  'css/less',
  'js/babel',
  'js/coffeescript',
  'js/typescript',
  'html/inline-html',
  'passthrough'
];

module.exports = _.map(filenames, (x) => require('./' + x).default);
