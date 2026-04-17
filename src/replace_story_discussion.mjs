import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const startStr = '{/* Story Discussion Modal */}';
const endStr = '{/* Prompt Confirmation Dialog */}';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = content.substring(0, startIndex) + `{/* Story Discussion Modal */}
        <AnimatePresence>
          {isStoryDiscussionOpen && (
            <StoryDiscussionModal
              nextPlotGuidance={nextPlotGuidance}
              setNextPlotGuidance={setNextPlotGuidance}
              discussionMessages={discussionMessages}
              discussionInput={discussionInput}
              setDiscussionInput={setDiscussionInput}
              handleSendDiscussionMessage={handleSendDiscussionMessage}
              isDiscussionLoading={isDiscussionLoading}
            />
          )}
        </AnimatePresence>

        ` + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Successfully replaced Story Discussion Modal');
} else {
  console.log('Could not find start or end string');
}
