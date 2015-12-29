import {app, BrowserWindow} from 'electron';

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});

app.on('ready', function() {
  global.mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true
  });
  
  global.mainWindow.loadURL('file://' + __dirname + '/../test/electron-smoke-test.html');
  global.mainWindow.focus();
});
