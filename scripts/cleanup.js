import { execSync } from 'child_process';

const log = (msg) => console.log(`[Cleanup] ${msg}`);

try {
  if (process.platform === 'win32') {
    log('Attempting to carefully clean up DeepSeek processes...');
    // Kill running exec if exists, use with caution.
    try {
      execSync('taskkill /F /IM "DeepSeek WebUI.exe" /T', { stdio: 'ignore' });
      log('Terminated DeepSeek WebUI.exe');
    } catch(e) {}
  } else {
    // Mac/Linux
    try {
      execSync('pkill -f "DeepSeek WebUI"', { stdio: 'ignore' });
      log('Terminated DeepSeek WebUI');
    } catch(e) {}
  }
} catch (error) {
  log(`Failed to cleanup: ${error.message}`);
}
