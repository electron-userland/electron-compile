import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import pify from 'pify';

const pfs = pify(fs);
const d = require('debug')('electron-compile:config-parser');

export async function createCompilerHostFromConfiguration(info) {
}

export function createCompilerHostFromBabelRc(file) {
}

export function createCompilerHostFromConfigFile(file) {
}

export function createCompilerHostFromProjectRoot(rootDir) {
}
