// Polyfills for the jsdom test environment (react-dom/server needs these).
const { TextDecoder, TextEncoder } = require('node:util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
