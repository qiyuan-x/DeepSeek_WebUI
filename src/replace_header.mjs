import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const startStr = '<header className={cn(';
const endStr = '{/* System Prompt Bar (AI设定) / Story Destiny Line */}';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = content.substring(0, startIndex) + `<Header
          currentConvId={currentConvId}
          totalTokens={totalTokens}
          totalCost={totalCost}
          totalMemoryCost={totalMemoryCost}
          handleOpenMemory={handleOpenMemory}
          toggleThinkingMode={toggleThinkingMode}
          isThinkingMode={isThinkingMode}
        />

        ` + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Successfully replaced Header');
} else {
  console.log('Could not find start or end string');
}
