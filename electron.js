import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 500,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    title: "DeepSeek WebUI 启动器",
    autoHideMenuBar: true
  });

  mainWindow.loadFile('launcher.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function killServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
    return true;
  }
  return false;
}

ipcMain.handle('stop-server', async () => {
  const killed = killServer();
  mainWindow?.webContents.send('server-status', { type: 'stopped' });
  return { success: killed };
});

ipcMain.handle('start-server', async (event, options) => {
  if (serverProcess) return { success: true };

  return new Promise((resolve) => {
    let serverPath;
    let spawnCmd;
    let spawnArgs;
    const appPath = app.getAppPath();
    const exeDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
    const userDataPath = app.isPackaged 
      ? path.join(exeDir, 'data')
      : path.join(appPath, 'data');

    if (app.isPackaged) {
      serverPath = path.join(appPath, 'dist-server', 'server.js');
      spawnCmd = process.execPath;
      spawnArgs = [serverPath];
    } else {
      serverPath = path.join(appPath, 'server.ts');
      spawnCmd = 'npx';
      spawnArgs = ['tsx', serverPath];
    }

    serverProcess = spawn(spawnCmd, spawnArgs, {
      env: { 
        ...process.env, 
        ELECTRON_RUN_AS_NODE: app.isPackaged ? '1' : undefined,
        NODE_ENV: app.isPackaged ? 'production' : 'development',
        DATA_PATH: userDataPath
      },
      shell: !app.isPackaged
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Server: ${output}`);
      mainWindow?.webContents.send('server-status', { type: 'stdout', data: output });
      
      if (output.includes('Server running on http://localhost:3000')) {
        mainWindow?.webContents.send('server-status', { type: 'ready' });
        if (options.autoOpen) {
          shell.openExternal('http://localhost:3000');
        }
        resolve({ success: true });
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`Server Error: ${output}`);
      mainWindow?.webContents.send('server-status', { type: 'stderr', data: output });
    });

    serverProcess.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    serverProcess.on('exit', (code) => {
      console.log(`Server exited with code ${code}`);
      mainWindow?.webContents.send('server-status', { type: 'exit', code });
      serverProcess = null;
    });

    // Fallback resolve if it takes too long but doesn't error
    setTimeout(() => resolve({ success: true }), 10000);
  });
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

ipcMain.on('quit-app', () => {
  app.quit();
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
