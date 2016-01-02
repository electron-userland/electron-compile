## electron-compilers

electron-compilers are the actual implementations of classes that power
[electron-compile](https://github.com/electronjs/electron-compile)

For JavaScript:

* JavaScript ES6/ES7 (via Babel)
* TypeScript
* CoffeeScript

For CSS:

* LESS

### Why is this a separate repo?!

Shipping compilers for all of these languages will add a ton of weight to your
download size. Making this a separate top-level module makes it super easy to
delete it all in one go from the final production result.
