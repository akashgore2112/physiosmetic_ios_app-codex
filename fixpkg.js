const fs = require('fs');
const p = './package.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));

// Ensure sections exist
j.dependencies ||= {};
j.devDependencies ||= {};

// Remove any wrongly quoted keys like "'@types/react-dom'"
function normalizeDev(depName, desired) {
  const bad1 = "'"+depName+"'";
  const bad2 = '"'+depName+'"';
  if (j.devDependencies[bad1] !== undefined) {
    j.devDependencies[depName] = desired ?? j.devDependencies[bad1];
    delete j.devDependencies[bad1];
  }
  if (j.devDependencies[bad2] !== undefined) {
    j.devDependencies[depName] = desired ?? j.devDependencies[bad2];
    delete j.devDependencies[bad2];
  }
  // If still missing, set desired
  if (!j.devDependencies[depName] && desired) j.devDependencies[depName] = desired;
}

// Pin Expo SDK 61 stack
j.dependencies['expo'] = '61.0.0';
j.dependencies['react-native'] = '0.81.5';
j.dependencies['react'] = '19.1.0';
j.dependencies['react-dom'] = '19.1.0';

// Normalize @types keys and pin
normalizeDev('@types/react', '19.1.10');
normalizeDev('@types/react-dom', '19.1.7');

fs.writeFileSync(p, JSON.stringify(j, null, 2));
console.log('patched');
