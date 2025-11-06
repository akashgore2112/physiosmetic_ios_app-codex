const fs = require('fs');
const p = './package.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
j.dependencies ||= {};
j.devDependencies ||= {};

// Expo SDK 54 line
j.dependencies['expo'] = '54.0.22';           // latest on npm for SDK 54

// RN/React that SDK 54 expects
j.dependencies['react-native'] = '0.81.5';
j.dependencies['react'] = '19.1.0';
j.dependencies['react-dom'] = '19.1.0';

// Types (dev)
j.devDependencies['@types/react'] = '19.1.10';
j.devDependencies['@types/react-dom'] = '19.1.7';

fs.writeFileSync(p, JSON.stringify(j, null, 2));
console.log('patched');
