import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const startStr = '{/* Settings Modal */}';
const endStr = '{/* Memory Modal Removed */}';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = content.substring(0, startIndex + startStr.length) + '\n        <SettingsModal />\n\n        ' + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Successfully replaced Settings Modal');
} else {
  console.log('Could not find start or end string');
}
