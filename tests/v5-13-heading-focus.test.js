import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('Programmatic heading focus retains screen reader navigation without visual rectangle',()=>{
 assert.match(app,/h\.tabIndex=-1/);
 assert.match(app,/h\.focus\(\{preventScroll:true\}\)/);
 assert.match(css,/\.screen h1\[tabindex="-1"\]:focus,\s*\.screen h2\[tabindex="-1"\]:focus\s*\{\s*outline:\s*none;/);
});
test('Interactive keyboard focus indicators are preserved',()=>{
 assert.match(css,/\.nav-button:hover,\.nav-button:focus-visible/);
 assert.match(css,/\.answer:focus-within/);
 assert.match(css,/\.coach-prompt:hover,\.coach-prompt:focus-visible/);
});
