import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const startStr = '{/* Chat Area */}';
const endStr = '{/* Input Area */}';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = content.substring(0, startIndex) + `{/* Chat Area */}
        <MessageList 
          messages={messages}
          chatContainerRef={chatContainerRef}
          handleScroll={handleScroll}
          messagesEndRef={messagesEndRef}
          setIsStoryDiscussionOpen={setIsStoryDiscussionOpen}
          setTargetMessageId={setTargetMessageId}
          setExtractedPrompt={setExtractedPrompt}
          setPromptDialogOpen={setPromptDialogOpen}
          api={api}
        />

        ` + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Successfully replaced Chat Area');
} else {
  console.log('Could not find start or end string');
}
