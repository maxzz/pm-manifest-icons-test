#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function findNearestPackagesDir(start) {
    let cur = path.resolve(start);
    while (true) {
        const parent = path.dirname(cur);
        if (parent === cur) return null;
        const parts = cur.split(path.sep);
        const idx = parts.lastIndexOf('packages');
        if (idx !== -1 && idx < parts.length - 1) {
            const pkgPath = parts.slice(0, idx + 2).join(path.sep);
            if (fs.existsSync(pkgPath)) return pkgPath;
        }
        cur = parent;
    }
}

const file = process.argv[2];
if (!file) {
    console.error('Usage: find-package-dir.js <path-to-file>');
    process.exit(2);
}

const dir = path.dirname(file);
const found = findNearestPackagesDir(dir);
if (!found) {
    console.error('No packages folder ancestor found');
    process.exit(3);
}

console.log(found);
