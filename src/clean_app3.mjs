import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const newContent = content.replace(/setTheme\(/g, 'setSettings({ theme: ');
const newContent2 = newContent.replace(/setSettings\(\{ theme: (.*?)\)/g, 'setSettings({ theme: $1 })');
fs.writeFileSync('src/App.tsx', newContent2);
