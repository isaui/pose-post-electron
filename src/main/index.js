/**
 * Main entry point for Pose Photobooth Electron App
 * Handles window creation, app lifecycle, and menu setup
 */
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { startServer, stopServer, getServerStatus, cleanupServer, SERVER_PORT } = require('./server');

// Keep a global reference to mainWindow to avoid garbage collection
let mainWindow;

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,
    frame: false,
    kiosk: true, // Prevents exiting fullscreen
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: false,
      nodeIntegration: true,
      sandbox: false,
      webSecurity: false,
   
    },
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png')
  });

  
  // Load the Next.js app from Railway
  mainWindow.loadURL('https://pose-photobooth-hotfix.up.railway.app');

  mainWindow.webContents.openDevTools();
  // Remove default menu bar
  mainWindow.setMenuBarVisibility(false);
  
  // Log app start
  console.log('Pose Photobooth Electron started');

  // Cleanup on window close
  mainWindow.on('closed', () => {
    mainWindow = null;
    cleanupServer();
  });
}

/**
 * Create application menu with DevTools access and server controls
 */
function createApplicationMenu() {
  const menuTemplate = [
    {
      label: 'Server',
      submenu: [
        { 
          label: 'Start Server', 
          click: async () => {
            const result = await startServer();
            updateMenuStatus();
          },
          id: 'start-server'
        },
        { 
          label: 'Stop Server', 
          click: async () => {
            const result = await stopServer();
            updateMenuStatus();
          },
          id: 'stop-server',
          enabled: false
        },
        { 
          label: 'Open in Browser', 
          click: () => {
            require('electron').shell.openExternal(`http://localhost:${SERVER_PORT}`);
          },
          id: 'open-browser',
          enabled: false
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'About',
      submenu: [
        { 
          label: 'About Pose Photobooth', 
          click: () => createAboutWindow()
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

/**
 * Create the about window with app information
 */
function createAboutWindow() {
  const aboutWindow = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    resizable: false
  });
  
  aboutWindow.loadURL(`data:text/html;charset=utf-8,
    <html>
      <head>
        <title>About Pose Photobooth</title>
        <style>
          body { font-family: system-ui; padding: 20px; text-align: center; }
          h3 { margin-bottom: 5px; }
          p { margin: 5px 0; }
        </style>
      </head>
      <body>
        <h3>Pose Photobooth</h3>
        <p>Version: 1.0.0</p>
        <p>Lightweight Electron wrapper for Pose Photobooth</p>
      </body>
    </html>
  `);
}

/**
 * Update menu items based on server status
 */
function updateMenuStatus() {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;
  
  const { running } = getServerStatus();
  
  // Find menu items by ID
  const serverMenu = menu.getMenuItemById('start-server');
  const stopMenu = menu.getMenuItemById('stop-server');
  const openMenu = menu.getMenuItemById('open-browser');
  
  // Update enabled state
  if (serverMenu) serverMenu.enabled = !running;
  if (stopMenu) stopMenu.enabled = running;
  if (openMenu) openMenu.enabled = running;
}

// App initialization
app.whenReady().then(() => {
  createApplicationMenu();
  createWindow();

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle graceful shutdown
app.on('before-quit', async (event) => {
  console.log('Application is about to quit, cleaning up...');
  const { cleanupServer } = require('./server');
  event.preventDefault(); // Prevent immediate quit
  
  // Clean up server resources
  await cleanupServer();
  console.log('Server cleanup completed, now exiting app');
  
  // Now we can quit
  app.exit(0);
});

// Set up IPC handlers for renderer processes
ipcMain.handle('server-status', () => {
  return getServerStatus();
});

ipcMain.handle('toggle-server', async () => {
  const { running } = getServerStatus();
  if (running) {
    await stopServer();
  } else {
    await startServer();
  }
  updateMenuStatus();
  return getServerStatus();
});
