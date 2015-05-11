crypto = require 'crypto'
path = require 'path'

CoffeeScript = null # defer until used
fs = require 'fs-plus'

stats =
  hits: 0
  misses: 0
cacheDirectory = null

getCachePath = (coffee) ->
  digest = crypto.createHash('sha1').update(coffee, 'utf8').digest('hex')
  path.join(cacheDirectory, "#{digest}.js")

getCachedJavaScript = (cachePath) ->
  if fs.isFileSync(cachePath)
    try
      cachedJavaScript = fs.readFileSync(cachePath, 'utf8')
      stats.hits++
      return cachedJavaScript
  return

convertFilePath = (filePath) ->
  if process.platform is 'win32'
    filePath = "/#{path.resolve(filePath).replace(/\\/g, '/')}"
  encodeURI(filePath)

loadCoffeeScript = ->
  coffee = require 'coffee-script'

  # Work around for https://github.com/jashkenas/coffeescript/issues/3890
  coffeePrepareStackTrace = Error.prepareStackTrace
  if coffeePrepareStackTrace?
    Error.prepareStackTrace = (error, stack) ->
      try
        return coffeePrepareStackTrace(error, stack)
      catch coffeeError
        return stack

  coffee

compileCoffeeScript = (coffee, filePath, cachePath) ->
  CoffeeScript ?= loadCoffeeScript()
  {js, v3SourceMap} = CoffeeScript.compile(coffee, filename: filePath, sourceMap: true)
  stats.misses++

  if btoa? and unescape? and encodeURIComponent?
    js = """
      #{js}
      //# sourceMappingURL=data:application/json;base64,#{btoa unescape encodeURIComponent v3SourceMap}
      //# sourceURL=#{convertFilePath(filePath)}
    """

  try
    fs.writeFileSync(cachePath, js)
  js

requireCoffeeScript = (module, filePath) ->
  coffee = fs.readFileSync(filePath, 'utf8')
  cachePath = getCachePath(coffee)
  js = getCachedJavaScript(cachePath) ? compileCoffeeScript(coffee, filePath, cachePath)
  module._compile(js, filePath)

exports.register = ->
  propertyConfig =
    enumerable: true
    value: requireCoffeeScript
    writable: false

  Object.defineProperty(require.extensions, '.coffee', propertyConfig)
  Object.defineProperty(require.extensions, '.litcoffee', propertyConfig)
  Object.defineProperty(require.extensions, '.coffee.md', propertyConfig)

  return

exports.getCacheMisses = -> stats.misses

exports.getCacheHits = -> stats.hits

exports.resetCacheStats = ->
  stats =
    hits: 0
    misses: 0

exports.setCacheDirectory = (newCacheDirectory) ->
  cacheDirectory = newCacheDirectory

exports.getCacheDirectory = -> cacheDirectory

exports.addPathToCache = (filePath) ->
  coffee = fs.readFileSync(filePath, 'utf8')
  cachePath = getCachePath(coffee)
  compileCoffeeScript(coffee, filePath, cachePath)
  return