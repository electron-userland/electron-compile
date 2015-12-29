// NB: Prevent the test runner from picking this up
if ('type' in process) {
  let {app, BrowserWindow} = require('electron');

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
}
