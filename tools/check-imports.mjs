// Every relative import must name a file that exists, with exactly the same
// upper and lower case. Windows and macOS forgive a wrong case; Linux (and the
// build server) do not, so this catches it before it reaches anyone else.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|mjs)$/.test(e.name)) files.push(p);
  }
})(root);

// does this path exist with this exact spelling, segment by segment?
function exact(p) {
  const parts = path.relative(root, p).split(path.sep);
  let dir = root;
  for (const part of parts) {
    if (part === '..') return fs.existsSync(p); // outside src: only check that it is there
    if (!fs.readdirSync(dir).includes(part)) return false;
    dir = path.join(dir, part);
  }
  return true;
}

let bad = 0;
const re = /(?:from\s+|import\s*\(\s*(?:\/\*.*?\*\/\s*)?)['"](\.{1,2}\/[^'"]+)['"]/g;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(re)) {
    const target = path.resolve(path.dirname(f), m[1]);
    if (!exact(target)) {
      bad++;
      console.error(`${path.relative(process.cwd(), f)}: cannot find "${m[1]}" (check the spelling and the upper/lower case)`);
    }
  }
}
if (bad) process.exit(1);
console.log(`imports ok (${files.length} files)`);
