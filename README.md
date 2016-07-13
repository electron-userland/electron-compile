## electron-compile

![](https://img.shields.io/npm/dm/electron-compile.svg) <a href="http://electron.github.io/electron-compile/docs">![](http://electron.github.io/electron-compile/docs/badge.svg)</a>

electron-compile compiles JS and CSS on the fly with a single call in your app's 'ready' function.

For JavaScript:

* JavaScript ES6/ES7 (via Babel)
* TypeScript
* CoffeeScript

For CSS:

* Less
* Stylus

For HTML:

* Jade

For JSON:

* CSON

### How does it work? (Easiest Way)

Use `electron-prebuilt-compile` instead of the `electron-prebuilt` module. Tada! You did it.

### Wait, seriously?

Yeah. `electron-prebuilt-compile` is like an `electron-prebuilt` that Just Works with all of these languages above.

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

// ...and that your main app is called ./src/main.js. This is written as if
// you were going to `require` the file from here.
require('electron-compile').init(appRoot, './main');
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

```js
{
  "application/javascript": {
    "presets": ["stage-0", "es2015", "react"],
    "sourceMaps": "inline"
  },
  "text/less": {
    "dumpLineNumbers": "comments"
  }
}
```

`.compilerc` also accepts environments with the same syntax as `.babelrc`:

```js
{
  "env": {
    "development": {
      "application/javascript": {
        "presets": ["stage-0", "es2015", "react"],
        "sourceMaps": "inline"
      },
      "text/less": {
        "dumpLineNumbers": "comments"
      }
    },
    "production": {
      "application/javascript": {
        "presets": ["stage-0", "es2015", "react"],
        "sourceMaps": "none"
      }
    }
  }
}
```

The opening Object is a list of MIME Types, and options passed to the compiler implementation. These parameters are documented here:

* Babel - http://babeljs.io/docs/usage/options
* CoffeeScript - http://coffeescript.org/documentation/docs/coffee-script.html#section-5
* TypeScript - https://github.com/Microsoft/TypeScript/blob/v1.5.0-beta/bin/typescriptServices.d.ts#L1076
* Less - http://lesscss.org/usage/index.html#command-line-usage-options
* Jade - http://jade-lang.com/api

## How can I compile only some file types but not others?

With `passthrough` enabled, electron-compile will return your source files completely unchanged!

In this example `.compilerc`, JavaScript files won't be compiled:

```js
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

electron-compile comes with a wrapper around the [electron-packager](https://github.com/electron-userland/electron-packager) project, `electron-packager-compile` (if you use the `electron-prebuilt-compile` project, this will just be `electron-packager`). Run it the same way you run `electron-packager` and the compilation wire-up will be done in the background.

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
