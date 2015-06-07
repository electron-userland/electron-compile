## electron-compile

electron-compile provides compilers for common JavaScript and CSS alternative targets.

For JavaScript:

* JavaScript ES6/ES7 (via Babel)
* TypeScript
* CoffeeScript

For CSS:

* LESS
* Sass/SCSS

### How does it work?

Put this in your Electron app's `app.ready`:

```js
app.on('ready', function() {
  require('electron-compile').init();
});
```

From then on, you can now simply include files directly in your HTML, no need for cross-compilation:

```html
<head>
  <script src="main.coffee"></script>
  <link rel="stylesheet" type="text/css" href="main.less" />
</head>
```

or just require them in:

```js
require('./mylib')   // mylib.ts
```

### Does this work in node.js / io.js too?

The JavaScript compilers will register with module.register, but CSS of course won't

### Babel keeps running on my ES5 source

Add `'use nobabel';` to the top of your file to opt-out of Babel compilation.

### Hey, why doesn't this work in my main.js file?

Unfortunately, the very first file that you set up `app.ready` in must be written in ES5. Of course, you can always make this file as small as possible, or just require in a real file once you call `init()`.
