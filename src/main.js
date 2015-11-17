import _ from 'lodash';

const filenames = [
  'css/less',
  'js/babel',
  'js/coffeescript',
  'js/typescript',
  'inline-html'
];

module.exports = _.map(filenames, (x) => require('./' + x).default);
