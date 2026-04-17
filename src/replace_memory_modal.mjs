import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const startStr = '{/* Memory Modal */}';
const endStr = '{/* Settings Modal */}';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = content.substring(0, startIndex) + `{/* Memory Modal */}
        <AnimatePresence>
          {isMemoryOpen && <MemoryModal memories={memories} />}
        </AnimatePresence>

        ` + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Successfully replaced Memory Modal');
} else {
  console.log('Could not find start or end string');
}
