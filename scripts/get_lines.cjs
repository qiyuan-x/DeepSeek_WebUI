const fs = require('fs');
let text = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

const lines = text.split('\n');

const chunk = lines.slice(833, 871).join('\n');

console.log(chunk);

