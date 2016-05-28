import {SimpleCompilerBase} from '../compiler-base';
import extend from 'lodash/object/extend';
import {basename} from 'path';
import nib from 'nib';

const mimeTypes = ['text/stylus'];
let stylusjs = null;

/**
 * @access private
 */
export default class StylusCompiler extends SimpleCompilerBase {
	constructor() {
		super();

		this.compilerOptions = {

		};
	}

	static getInputMimeTypes() {
		return mimeTypes;
	}

	compileSync(sourceCode, filePath, compilerContext) {
		stylusjs = require('stylus');

		let opts = extend({}, this.compilerOptions, {
			filename: basename(filePath)
		});

		let code, error;

		if (opts.import && !Array.isArray(opts.import)) {
			opts.import = [opts.import];
		}

		if (opts.import && opts.import.indexOf('nib') >= 0) {
			opts.use = opts.use || [];
			if (!Array.isArray(opts.use)) {
				opts.use = [opts.use];
			}
			opts.use.push(nib());
		}

		console.log(opts);

		stylusjs.render(sourceCode, opts, (err, css) => {
				error = err;
				code = css;
			});

		if (error) {
			throw error;
		}

		return {
			code,
			mimeType: 'text/css'
		};
	}

	getCompilerVersion() {
		return require('stylus/package.json').version;
	}
}
