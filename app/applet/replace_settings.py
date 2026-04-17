import sys

with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '{/* Settings Modal */}' in line:
        start_idx = i
    if '{/* Memory Modal Removed */}' in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_lines = lines[:start_idx+1] + ['        <SettingsModal />\n\n'] + lines[end_idx:]
    with open('src/App.tsx', 'w') as f:
        f.writelines(new_lines)
    print("Successfully replaced Settings Modal")
else:
    print("Could not find start or end index")
