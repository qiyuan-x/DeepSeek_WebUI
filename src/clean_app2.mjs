import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const newContent = content.replace(/setIsPromptDialogOpen/g, 'setPromptDialogOpen');
fs.writeFileSync('src/App.tsx', newContent);
