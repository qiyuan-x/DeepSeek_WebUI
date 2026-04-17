import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const startStr = '  if (isAuthRequired) {';
const endStr = '    );\n  }';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex) + endStr.length;

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = content.substring(0, startIndex) + `  if (isAuthRequired) {
    return <AuthScreen setIsAuthRequired={setIsAuthRequired} api={api} />;
  }` + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Successfully replaced Auth Screen');
} else {
  console.log('Could not find start or end string');
}
