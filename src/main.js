import _ from 'lodash';

const filenames = [
//  'css/less',
  'js/babel-ng',
  'js/coffeescript-ng',
  'js/typescript-ng',
  //'inline-html'
];

module.exports = _.map(filenames, (x) => require('./' + x).default);
