/* eslint-disable no-useless-escape */
/* eslint-disable no-unused-vars */

export const removeAll = (targetStr, findArr) => {
  findArr.forEach(find => {
    targetStr = replaceAll(targetStr, find);
  });
  return targetStr;
};

export const replaceAll = (targetStr, findStr, replaceStr = "") => {
  return targetStr.split(findStr).join(replaceStr);
};

export const isEmpty = obj => {
  for (const key in obj) {
    return false;
  }
  return true;
};

export const debounce = (func, wait, immediate) => {
  var timeout;
  return () => {
    const context = this,
      args = arguments;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

/**
 * Convert line-breaks from DOS/MAC to a single standard (UNIX by default)
 */
export const normalizeLineBreaks = (str, lineEnd) => {
  lineEnd = lineEnd || "\n";

  return str
    .replace(/\r\n/g, lineEnd) // DOS
    .replace(/\r/g, lineEnd) // Mac
    .replace(/\n/g, lineEnd); // Unix
};

/**
 * Searches for a given substring
 */
export const contains = (str, substring, fromIndex) => {
  return str.indexOf(substring, fromIndex) !== -1;
};

/**
 * Escape RegExp string chars.
 */
export const escapeRegExp = str => {
  let ESCAPE_CHARS = /[\\.+*?\^$\[\](){}\/'#]/g;
  return str.replace(ESCAPE_CHARS, "\\$&");
};

/**
 * Escapes a string for insertion into HTML.
 */
export const escapeHtml = str => {
  str = str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#39;")
    .replace(/"/g, "&quot;");

  return str;
};

/**
 * Unescapes HTML special chars
 */
export const unescapeHtml = str => {
  str = str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
  return str;
};

/**
 * Escape string into unicode sequences
 */
export const escapeUnicode = (str, shouldEscapePrintable) => {
  return str.replace(/[\s\S]/g, function(ch) {
    // skip printable ASCII chars if we should not escape them
    if (!shouldEscapePrintable && /[\x20-\x7E]/.test(ch)) {
      return ch;
    }
    // we use "000" and slice(-4) for brevity, need to pad zeros,
    // unicode escape always have 4 chars after "\u"
    return "\\u" + ("000" + ch.charCodeAt(0).toString(16)).slice(-4);
  });
};

/**
 * Remove HTML tags from string.
 */
export const stripHtmlTags = str => {
  return str.replace(/<[^>]*>/g, "");
};

/**
 * Remove non-printable ASCII chars
 */
export const removeNonASCII = str => {
  // Matches non-printable ASCII chars -
  // http://en.wikipedia.org/wiki/ASCII#ASCII_printable_characters
  return str.replace(/[^\x20-\x7E]/g, "");
};

// ES6, native Promises, arrow functions, default arguments
// wait(1000).then(() => {
//   console.log("b");
// });
export const wait = (ms = 0) => {
  return new Promise(r => setTimeout(r, ms));
};

export const sleep = (ms = 0) => {
  return new Promise(r => setTimeout(r, ms));
};

export const generateRandomId = () => {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
    .substr(2, 10);
};

export const cloneObject = obj => {
  // this is a deep clone
  return obj ? JSON.parse(JSON.stringify(obj)) : obj;
};

export const cloneObjectPromise = obj => {
  return new Promise((resolve, reject) => {
    // this is a deep clone
    try {
      let clonedObject = obj ? JSON.parse(JSON.stringify(obj)) : obj;
      resolve(clonedObject);
    } catch (e) {
      reject(r);
    }
  });
};
