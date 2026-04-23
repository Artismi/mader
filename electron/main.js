const { app, BrowserWindow, shell, globalShortcut, ipcMain, session, Menu } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

// ── Crew Service (Python FastAPI) ─────────────────────────────────────────────
let crewProcess = null

function startCrewService() {
  // Cerca Python (python3 su Mac/Linux, python su Windows)
  const pythonCmds = process.platform === 'win32'
    ? ['python', 'python3']
    : ['python3', 'python']

  const crewMain = path.join(__dirname, '..', 'crew', 'main.py')

  // Se il file non esiste (build senza crew) → skip silenzioso
  if (!fs.existsSync(crewMain)) {
    console.log('[crew] main.py non trovato, crew service disabilitato')
    return
  }

  function trySpawn(cmds) {
    if (cmds.length === 0) {
      console.warn('[crew] Python non trovato — crew service disabilitato')
      return
    }
    const cmd = cmds[0]
    const proc = spawn(cmd, [crewMain], {
      cwd: path.join(__dirname, '..', 'crew'),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    proc.on('error', () => trySpawn(cmds.slice(1)))

    proc.stdout.on('data', (d) => {
      const line = d.toString().trim()
      if (line) console.log('[crew]', line)
    })
    proc.stderr.on('data', (d) => {
      const line = d.toString().trim()
      if (line && !line.includes('INFO')) console.warn('[crew-err]', line)
    })
    proc.on('exit', (code, signal) => {
      if (signal !== 'SIGTERM' && code !== 0) {
        console.warn(`[crew] processo terminato (code=${code}) — riavvio tra 5s`)
        setTimeout(() => startCrewService(), 5000)
      }
      crewProcess = null
    })

    crewProcess = proc
    console.log(`[crew] avviato con ${cmd} su porta 8765`)
  }

  trySpawn(pythonCmds)
}

const isDev = process.env.NODE_ENV !== 'production'
const PORT = 3000

let mainWindow = null
let overlayWindow = null
let nextServer = null

// Percorso database SQLite — nella cartella dati dell'app
const dbPath = isDev
  ? path.join(__dirname, '..', 'data', 'creative-os.db')
  : path.join(app.getPath('userData'), 'creative-os.db')

process.env.DATABASE_PATH = dbPath

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    frame: false,
    backgroundColor: '#080808',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  mainWindow.loadURL(`http://localhost:${PORT}`)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' })
  })

  // Link esterni si aprono nel browser di sistema
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 380,
    height: 600,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  overlayWindow.loadURL(`http://localhost:${PORT}/overlay`)
  overlayWindow.on('blur', () => overlayWindow?.hide())
  overlayWindow.on('closed', () => { overlayWindow = null })
}

function toggleOverlay() {
  if (!overlayWindow) {
    createOverlayWindow()
    overlayWindow.show()
    return
  }
  if (overlayWindow.isVisible()) {
    overlayWindow.hide()
  } else {
    overlayWindow.show()
    overlayWindow.focus()
  }
}

function startNextServer() {
  return new Promise((resolve) => {
    if (isDev) {
      // In dev, Next.js è già avviato da concurrently — aspettiamo solo
      resolve()
      return
    }

    // In production: avvia il server Next.js compilato
    nextServer = spawn('node', [path.join(__dirname, '..', '.next', 'standalone', 'server.js')], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'inherit',
    })

    // Aspetta che il server sia pronto
    const checkReady = () => {
      require('http').get(`http://localhost:${PORT}`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 307) resolve()
        else setTimeout(checkReady, 500)
      }).on('error', () => setTimeout(checkReady, 500))
    }
    setTimeout(checkReady, 1000)
  })
}

// IPC handlers
// OAuth popup — apre Google auth in una finestra separata
ipcMain.handle('auth:openOAuthWindow', (_, url) => {
  return new Promise((resolve) => {
    const authWindow = new BrowserWindow({
      width: 900,
      height: 700,
      show: true,
      parent: mainWindow,
      modal: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    authWindow.loadURL(url)

    const checkCallback = (navUrl) => {
      if (navUrl.startsWith('http://localhost:3000/auth/callback')) {
        // Carica il callback nella finestra principale, chiudi il popup
        mainWindow.loadURL(navUrl)
        authWindow.destroy()
        resolve(navUrl)
      }
    }

    authWindow.webContents.on('will-navigate', (_, navUrl) => checkCallback(navUrl))
    authWindow.webContents.on('did-redirect-navigation', (_, navUrl) => checkCallback(navUrl))
    authWindow.on('closed', () => resolve(null))
  })
})

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window:close', () => mainWindow?.close())
ipcMain.handle('shell:openExternal', (_, url) => shell.openExternal(url))

// Zoom controls via IPC
ipcMain.handle('window:setZoomFactor', (_, factor) => {
  if (mainWindow) mainWindow.webContents.setZoomFactor(factor)
})
ipcMain.handle('window:getZoomFactor', () => {
  return mainWindow ? mainWindow.webContents.getZoomFactor() : 1.0
})

app.whenReady().then(async () => {
  // CSP — applicata a tutte le risposte HTTP del renderer
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      // Dev: permissivo per Next.js HMR e devtools
      ? [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "connect-src 'self' blob: ws://localhost:* http://localhost:* https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://generativelanguage.googleapis.com https://api.openai.com",
          "img-src 'self' data: blob: https:",
          "media-src 'self' blob: data:",
          "font-src 'self' data: https://fonts.gstatic.com",
          "frame-src 'self' https://www.figma.com https://www.canva.com",
          "worker-src 'self' blob:",
        ].join('; ')
      // Production: più restrittivo (no unsafe-eval)
      : [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "connect-src 'self' blob: http://127.0.0.1:8765 https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://generativelanguage.googleapis.com https://api.openai.com",
          "img-src 'self' data: blob: https:",
          "media-src 'self' blob: data:",
          "font-src 'self' data: https://fonts.gstatic.com",
          "frame-src 'self' https://www.figma.com https://www.canva.com",
          "worker-src 'self' blob:",
        ].join('; ')

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    })
  })

  await startNextServer()
  startCrewService()
  createMainWindow()

  // Menu dell'applicazione (abilita scorciatoie standard come Zoom, Copia/Incolla)
  const template = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
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
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [])
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // Shortcut globale per overlay (Ctrl+Shift+Space)
  globalShortcut.register('CommandOrControl+Shift+Space', toggleOverlay)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (nextServer) nextServer.kill()
  if (crewProcess) crewProcess.kill('SIGTERM')
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
