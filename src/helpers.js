const crypto = require('crypto');
const findCacheDir = require('find-cache-dir');
const fs = require('fs');
const mkdir = require('make-dir');
const os = require('os');
const path = require('path');

const pluginName = 'moment-timezone-data-webpack-plugin';

// https://github.com/benjamingr/RegExp.escape/blob/master/polyfill.js
if (!RegExp.escape) {
  RegExp.escape = function (s) {
    return String(s).replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
  };
}

/**
 * Create regexps for matching zone names.
 * Returns an array of regexps matching the values of `matchZones`:
 * - createZoneMatchers(string) => [RegExpToMatchString]
 * - createZoneMatchers(RegExp) => [RegExp]
 * - createZoneMatchers([RegExp, RegExp, ...]) => [RegExp, RegExp, ...]
 * - createZoneMatchers([string, string, ...]) => [RegExpMatchingAllStrings]
 */
function createZoneMatchers(matchZones) {
  const exactRegExp = (pattern) => new RegExp('^(?:' + pattern + ')$');
  const arrayRegExp = (arr) => exactRegExp(
    arr.map(value =>
      RegExp.escape(value.toString())
    ).join('|')
  );

  if (matchZones instanceof RegExp) {
    return [matchZones];
  }
  if (Array.isArray(matchZones)) {
    const hasRegExp = matchZones.find(mz => mz instanceof RegExp);
    // Quick shortcut — combine array of strings into a single regexp
    if (!hasRegExp) {
      return [arrayRegExp(matchZones)];
    }
    // Find all string values and combine them
    let ret = [];
    let strings = [];
    matchZones.forEach(mz => {
      (mz instanceof RegExp ? ret : strings).push(mz);
    });
    if (strings.length) {
      ret.push(arrayRegExp(strings));
    }
    return ret;
  }
  return [exactRegExp(RegExp.escape(matchZones.toString()))];
}

function cacheKey(tzdata, config) {
  return JSON.stringify({
    version: tzdata.version,
    zones: config.matchZones.toString(),
    dates: [config.startYear, config.endYear],
  });
}

const cacheDir = (function () {
  let cacheDirPath;

  return function () {
    if (!cacheDirPath) {
      try {
        cacheDirPath = findCacheDir({ name: pluginName, create: true });
      } catch (e) {
        cacheDirPath = path.join(os.tmpdir(), pluginName);
      }
    }
    mkdir.sync(cacheDirPath);
    return cacheDirPath;
  };
})();

function cacheFile(tzdata, config) {
  const key = cacheKey(tzdata, config);
  const filename = crypto.createHash('md4')
    .update(key)
    .digest('hex') + '.json';
  const filepath = path.join(cacheDir(), filename);
  return {
    path: filepath,
    exists: fs.existsSync(filepath),
  };
}

module.exports = {
  pluginName,
  createZoneMatchers,
  cacheFile,
};
