const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const handler = source.match(/document\.querySelector\("#login-form"\)\.addEventListener\("submit",[\s\S]*?\n\}\);/);
assert.ok(handler, 'landing-page submit handler exists');
assert.match(handler[0], /event\.preventDefault\(\)/);
assert.match(handler[0], /querySelector\("#password"\)\.value = ""/);
assert.match(handler[0], /window\.location\.assign\("\/workspace"\)/);
assert.doesNotMatch(handler[0], /Anmeldedienst ist noch nicht verfügbar|localStorage|sessionStorage/);
console.log('Landing-page login routing regression: OK');
