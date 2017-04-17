## electron-compile

![](https://img.shields.io/npm/dm/electron-compile.svg) <a href="http://electron.github.io/electron-compile/docs">![](http://electron.github.io/electron-compile/docs/badge.svg)</a>

electron-compile compiles JS and CSS on the fly with a single call in your app's 'ready' function.

For JavaScript:

* JavaScript ES6/ES7 (via Babel)
* TypeScript
* CoffeeScript
* GraphQL

For CSS:

* Less
* Sass / SCSS
* Stylus

For HTML:

* Jade
* Vue.js 2.0 Single-File Components

For JSON:

* CSON

### How does it work? (Easiest Way)

Install `electron-prebuilt-compile` instead of the `electron`:
```sh
npm install electron-prebuilt-compile --save-dev
```
and keep using electron as usual.

Tada! You did it!

### Wait, seriously?

Yeah. `electron-prebuilt-compile` is like an `electron` that Just Works with all of these languages above.

### How does it work? (Slightly Harder Way)

First, add `electron-compile` and `electron-compilers` as a `devDependency`.

```sh
npm install --save electron-compile
npm install --save-dev electron-compilers
```

Create a new file that will be the entry point of your app (perhaps changing 'main' in package.json) - you need to pass in the root directory of your application, which will vary based on your setup. The root directory is the directory that your `package.json` is in.

```js
// Assuming this file is ./src/es6-init.js
var appRoot = path.join(__dirname, '..');

require('electron-compile').init(appRoot, require.resolve('./main'));
```


### I did it, now what?

From then on, you can now simply include files directly in your HTML, no need for cross-compilation:

```html
<head>
  <script src="main.coffee"></script>
  <link rel="stylesheet" href="main.less" />
</head>
```

or just require them in:

```js
require('./mylib')   // mylib.ts
```

### Live Reload / Hot Module Reloading

In your main file, before you create a `BrowserWindow` instance:

```js
import {enableLiveReload} from 'electron-compile';

enableLiveReload();
```

#### React Hot Module Loading

If you are using React, you can also enable Hot Module Reloading for both JavaScript JSX files as well as TypeScript, with a bit of setup:

1. `npm install --save react-hot-loader@next`
1. Call `enableLiveReload({strategy: 'react-hmr'});` in your main file, after `app.ready` (similar to above)
1. If you're using TypeScript, you're good out-of-the-box. If you're using JavaScript via Babel, add 'react-hot-loader/babel' to your plugins in `.compilerc`:

```json
{
  "application/javascript": {
    "presets": ["react", "es2017-node7"],
    "plugins": ["react-hot-loader/babel", "transform-async-to-generator"]
  }
}
```

1. In your `index.html`, replace your initial call to `render`:

Typical code without React HMR:

```js
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { MyApp } from './my-app';

ReactDOM.render(<MyApp/>, document.getElementById('app'));
```

Rewrite this as:

```js
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';

const render = () => {
  // NB: We have to re-require MyApp every time or else this won't work
  // We also need to wrap our app in the AppContainer class
  const MyApp = require('./myapp').MyApp;
  ReactDOM.render(<AppContainer><MyApp/></AppContainer>, document.getElementById('app'));
}

render();
if (module.hot) { module.hot.accept(render); }
```


### Something isn't working / I'm getting weird errors

electron-compile uses the [debug module](https://github.com/visionmedia/debug), set the DEBUG environment variable to debug what electron-compile is doing:

```sh
## Debug just electron-compile
DEBUG=electron-compile:* npm start

## Grab everything except for Babel which is very noisy
DEBUG=*,-babel npm start
```

### How do I set up (Babel / Less / whatever) the way I want?

If you've got a `.babelrc` and that's all you want to customize, you can simply use it directly. electron-compile will respect it, even the environment-specific settings. If you want to customize other compilers, use a `.compilerc` or `.compilerc.json` file. Here's an example:

```json
{
  "application/javascript": {
    "presets": ["es2016-node5", "react"],
    "sourceMaps": "inline"
  },
  "text/less": {
    "dumpLineNumbers": "comments"
  }
}
```

`.compilerc` also accepts environments with the same syntax as `.babelrc`:

```json
{
  "env": {
    "development": {
      "application/javascript": {
        "presets": ["es2016-node5", "react"],
        "sourceMaps": "inline"
      },
      "text/less": {
        "dumpLineNumbers": "comments"
      }
    },
    "production": {
      "application/javascript": {
        "presets": ["es2016-node5", "react"],
        "sourceMaps": "none"
      }
    }
  }
}
```

The opening Object is a list of MIME Types, and options passed to the compiler implementation. These parameters are documented here:

* Babel - http://babeljs.io/docs/usage/options
* CoffeeScript - https://web.archive.org/web/20160110101607/http://coffeescript.org/documentation/docs/coffee-script.html#section-5
* TypeScript - https://github.com/Microsoft/TypeScript/blob/v1.5.0-beta/bin/typescriptServices.d.ts#L1076
* Less - http://lesscss.org/usage/index.html#command-line-usage-options
* Jade - http://jade-lang.com/api

## How can I compile only some file types but not others?

With `passthrough` enabled, electron-compile will return your source files completely unchanged!

In this example `.compilerc`, JavaScript files won't be compiled:

```json
{
  "application/javascript": {
    "passthrough": true
  },
  "text/less": {
    "dumpLineNumbers": "comments"
  }
}
```

## How can I precompile my code for release-time?

By *far*, the easiest way to do this is via using [electron-forge](https://github.com/electron-userland/electron-forge/). electron-forge handles every aspect of packaging your app on all platforms and helping you publish it. Unless you have a very good reason, you should be using it!

## How can I precompile my code for release-time? (the hard way)

electron-compile comes with a command-line application to pre-create a cache for you.

```sh
Usage: electron-compile --appdir [root-app-dir] paths...

Options:
  -a, --appdir  The top-level application directory (i.e. where your
                package.json is)
  -v, --verbose  Print verbose information
  -h, --help     Show help
```

Run `electron-compile` on all of your application assets, even if they aren't strictly code (i.e. your static assets like PNGs). electron-compile will recursively walk the given directories.

```sh
electron-compile --appDir /path/to/my/app ./src ./static
```

### But I use Grunt / Gulp / I want to do Something Interesting

Compilation also has its own API, check out the [documentation](http://electron.github.io/electron-compile/docs/) for more information.
