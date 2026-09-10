const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '../src/components/base');
const dirs = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

console.log(dirs.join('\n'));
