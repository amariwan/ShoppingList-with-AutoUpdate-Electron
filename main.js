// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, ipcMain, Notification, dialog, autoUpdater } = require('electron');
const os = require('os');
const electronSquirrelStartup = require('electron-squirrel-startup');
const path = require('path');
const fs = require('fs');
var exec = require('child_process').exec;
const isDev = require('electron-is-dev');
const notifier = require('node-notifier');

let mainWindow;
let addItemWindow;
let icon = path.join(__dirname, 'assets/icons/png/icon.png');
var sessionId = Math.floor(Math.random() * 11000);
var versionApp = app.getVersion();
var filePath = 'myShoppingList' + sessionId + '.txt';

//-------------------------------------------------------------------
// session created
//-------------------------------------------------------------------
app.on('session-created', (session) => {
    console.log(session)
})

//-------------------------------------------------------------------
// Create mainWindow
//-------------------------------------------------------------------
const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            sandbox: false,
            nativeWindowOpen: true,
            nodeIntegrationInWorker: true,
            devTools: true
        }
    })

    // and load the index.html of the app.
    mainWindow.loadFile('src/index.html')

    // Build menu form template 
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // indert menu
    Menu.setApplicationMenu(mainMenu);

    mainWindow.webContents.send('version', versionApp);

    // Quit app when template 
    mainWindow.on('closed', function() {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        app.quit();
    })

}


//-------------------------------------------------------------------
// Handel
//-------------------------------------------------------------------
const createAddItemWindow = () => {
    // Create the browser window.
    addItemWindow = new BrowserWindow({
        width: 400,
        height: 200,
        icon: __dirname + '/assets/icons/win/app.ico',
        webPreferences: {
            // preload: path.join(__dirname, 'preload.js')
            nodeIntegration: true,
            contextIsolation: false,
            slashes: true
        }
    })


    // and load the index.html of the app.
    addItemWindow.loadFile('src/addItem.html')
}

//-------------------------------------------------------------------
// Catch item:add
//-------------------------------------------------------------------
ipcMain.on('item:add', function(e, item) {
    mainWindow.webContents.send('item:add', item);
    var stream = fs.createWriteStream(filePath, {
        'flags': 'a'
    });
    stream.once('open', function(fd) {
        console.log(item);
        stream.write(item + "\r\n");
        stream.end();
    });
    addItemWindow.close();
})

//-------------------------------------------------------------------
// Create menu Template 
//-------------------------------------------------------------------
const mainMenuTemplate = [{
    label: 'Item',
    submenu: [{
            label: 'add Item',
            accelerator: process.platform == 'darwin' ? 'Command+Y' : 'ctrl+Y',
            click() {
                createAddItemWindow();
            }
        },
        {
            label: 'Clear Items',
            click() {
                mainWindow.webContents.send('item:clear')
            }
        },
        {
            label: 'Quit',
            accelerator: process.platform == 'darwin' ? 'Command+Q' : 'ctrl+Q',
            click() {
                app.quit();
            }
        },
        {
            label: 'version: ' + versionApp,
        }
    ]
}]

// add developer tools item if not in prod 
if (process.env.NODE_ENV !== 'production') {
    mainMenuTemplate.push({
        label: 'Developer Tools',
        submenu: [{
                label: 'Toggle DevTools',
                accelerator: process.platform == 'darwin' ? 'Command+I' : 'ctrl+I',
                click(item, focuseWindow) {
                    focuseWindow.toggleDevTools();
                }
            },
            {
                role: 'reload'
            }
        ]
    })
}

//-------------------------------------------------------------------
// when run app 
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
//-------------------------------------------------------------------
app.whenReady().then(() => {
    createWindow();
    if (isDev) {
        console.log('Running in development');
        mainWindow.webContents.openDevTools(); // Open the DevTools.
    } else {
        console.log('Running in production');
    }
    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

//-------------------------------------------------------------------
// window-all-closed
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
//-------------------------------------------------------------------
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

//-------------------------------------------------------------------
// send Status to renderere
//-------------------------------------------------------------------
function sendStatusToWindow(msg) {
    mainWindow.webContents.send('message', msg);
};

//-------------------------------------------------------------------
// Notifi
//-------------------------------------------------------------------
function notify(title, msg) {
    notifier.notify({
        title: title,
        message: msg,
        icon: icon
    });
}

//-------------------------------------------------------------------
// Notifi
//-------------------------------------------------------------------
ipcMain.on('check-for-update', function(event, arg) {

    /* AUTO UPDATER */
    const autoUpdater = electron.autoUpdater;
    const os = require('os');
    const { dialog } = require('electron');

    /* For Windows, PATH to DIRECTORY that has nupkg and RELEASES files (Windows alone) */
    /* And add "Options Indexes" to htaccess if you want listing on that dir --@thinkdj */

    var releaseDIR = config.webURL + '/releases/win' + (os.arch() === 'x64' ? '64' : '32');

    autoUpdater.setFeedURL(releaseDIR);

    autoUpdater
        .on('error', function(error) {
            loggit(error);
            return dialog.showMessageBox(mainWindow, {
                type: 'info',
                icon: basePath + "/assets/refico32.ico",
                buttons: ['Dang!'],
                title: appName + ": Update Error",
                message: "Something's not right out there. Please try again later.",
                detail: "Umm... \nIt's not you, it's the server"
            });
        })
        .on('checking-for-update', function(e) {
            loggit('Checking for update at ' + releaseDIR);
        })
        .on('update-available', function(e) {

            var downloadConfirmation = dialog.showMessageBox(mainWindow, {
                type: 'info',
                icon: basePath + "/assets/refico32.ico",
                buttons: ['Proceed'],
                title: appName + ": Update Available",
                message: 'An update is available. The update will be downloaded in the background.',
                detail: "Size: ~42 MB"
            });

            loggit('Downloading update');

            if (downloadConfirmation === 0) {
                return;
            }

        })
        .on('update-not-available', function(e) {
            loggit('Update not available');
            return dialog.showMessageBox(mainWindow, {
                type: 'info',
                icon: basePath + "/assets/refico32.ico",
                buttons: ['Cool'],
                title: appName + ": No update available",
                message: "It seems you're running the latest and greatest version",
                detail: "Woot, woot! \nTalk about being tech-savvy"
            });
        })
        .on('update-downloaded', function(event, releaseNotes, releaseName, releaseDate, updateUrl, quitAndUpdate) {

            var index = dialog.showMessageBox(mainWindow, {
                type: 'info',
                icon: basePath + "/assets/refico32.ico",
                buttons: ['Install Update', 'Later'],
                title: appName + ": Latest version downloaded",
                message: 'Please restart the app to apply the update',
                detail: releaseName + "\n\n" + releaseNotes
            });

            if (index === 1) return;

            force_quit = true;
            autoUpdater.quitAndInstall();
        });


    autoUpdater.checkForUpdates();

    event.returnValue = "Checking for updates: " + releaseDIR + " Install Path: " + appPath;
});