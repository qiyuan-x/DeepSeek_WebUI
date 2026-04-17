import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const startStr = '{/* System Prompt Bar (AI设定) / Story Destiny Line */}';
const endStr = '{/* Chat Area */}';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = content.substring(0, startIndex) + `{/* System Prompt Bar (AI设定) / Story Destiny Line */}
        <SystemPromptBar
          systemPrompt={systemPrompt}
          isEditingSystemPrompt={isEditingSystemPrompt}
          setIsEditingSystemPrompt={setIsEditingSystemPrompt}
          draftSystemPrompt={draftSystemPrompt}
          setDraftSystemPrompt={setDraftSystemPrompt}
          handleUpdateSystemPrompt={handleUpdateSystemPrompt}
        />

        ` + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Successfully replaced System Prompt Bar');
} else {
  console.log('Could not find start or end string');
}
