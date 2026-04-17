import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const startStr = '{/* Prompt Confirmation Dialog */}';
const endStr = '      </main>\n    </div>\n  );\n}';

const startIndex = content.indexOf(startStr);
const endIndex = content.lastIndexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = content.substring(0, startIndex) + `{/* Prompt Confirmation Dialog */}
        <AnimatePresence>
          {isPromptDialogOpen && (
            <PromptConfirmationDialog
              extractedPrompt={extractedPrompt}
              setExtractedPrompt={setExtractedPrompt}
              targetMessageId={targetMessageId}
              setMessages={setMessages}
              executeImageGeneration={executeImageGeneration}
            />
          )}
        </AnimatePresence>
` + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Successfully replaced Prompt Confirmation Dialog');
} else {
  console.log('Could not find start or end string');
}
