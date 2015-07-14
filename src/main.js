import _ from 'lodash';

const filenames = [
  'css/less',
  'css/scss',
  'js/babel',
  'js/coffeescript',
  'js/typescript'
];

export default _.map(filenames, (x) => require(x));
