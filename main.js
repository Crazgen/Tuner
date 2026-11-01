const { app, BrowserWindow, protocol, session, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// Mark a custom scheme as a secure context so getUserMedia works (file:// is not secure).
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 720,
    minHeight: 560,
    backgroundColor: '#0c0e14',
    title: 'Guitar Tuner',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  win.loadURL('app://./index.html');

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(() => {
  // Resolve app:// paths to files in the project (src/ for renderer assets)
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/' || pathname === '') pathname = '/index.html';

    // Host is '.' for app://./index.html  →  map into src/
    const relative = pathname.replace(/^\//, '');
    const filePath = path.join(__dirname, 'src', relative);
    return net.fetch(pathToFileURL(filePath).toString());
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (
      permission === 'media' ||
      permission === 'audioCapture' ||
      permission === 'mediaKeySystem'
    ) {
      callback(true);
      return;
    }
    callback(false);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// F12 toggles devtools for local development
app.on('web-contents-created', (_e, contents) => {
  contents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      win?.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
});
