import {SimpleCompilerBase} from '../compiler-base';
import extend from 'lodash/object/extend';

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
			filename: path.basename(filePath)
		});

		let code, error;

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
