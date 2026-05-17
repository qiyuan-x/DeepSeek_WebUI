import fs from 'fs';

const files = [
  'src/components/settings/AdvancedTab.tsx',
  'src/components/settings/ApiTab.tsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/theme === 'dark' \? "bg-white\/5 text-white focus:ring-1 focus:ring-white\/20" : "bg-\[#F3F4F6\] text-\[#1A1A1A\] focus:ring-1 focus:ring-\[#1A1A1A\]"/g, 
    `theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20 [&>option]:bg-[#25262B] [&>option]:text-white" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] [&>option]:bg-white"`);

  content = content.replace(/theme === 'dark' \? "bg-white\/5 border-white\/10 text-white focus:border-white\/30" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400 focus:bg-white"/g,
    `theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-white/30 [&>option]:bg-[#25262B] [&>option]:text-white" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400 focus:bg-white [&>option]:bg-white"`);

  fs.writeFileSync(file, content, 'utf8');
}
console.log('Fixed theme classes in selects');
