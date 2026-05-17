const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

content = content.replace(/"bg-white\/5 border-white\/10( focus:border-white\/30)?"/g, '"bg-white/5 border-white/10 text-white$1"');
content = content.replace(/text-\[#6B7280\]([a-zA-Z\s"-]*)/g, 'text-[#6B7280] dark:text-gray-400$1');

fs.writeFileSync('src/components/SettingsModal.tsx', content);
