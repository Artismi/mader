const { app, BrowserWindow, shell, globalShortcut, ipcMain, session, Menu, utilityProcess, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const crypto = require('crypto')

const isDev = !app.isPackaged

// ── Crew Service (Python FastAPI) ─────────────────────────────────────────────
// Facoltativo: in sviluppo parte se c'è crew/main.py; nel pacchetto è spento
// (serve Python sul computer) e si accende solo con CREATIVE_OS_CREW=1.
const crewEnabled = isDev ? process.env.CREATIVE_OS_CREW !== '0' : process.env.CREATIVE_OS_CREW === '1'
const CREW_MAX_RESTARTS = 3
let crewProcess = null
let crewRestarts = 0
let quitting = false

function startCrewService() {
  if (!crewEnabled) return
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
      crewProcess = null
      if (quitting || signal === 'SIGTERM' || code === 0) return
      // Al massimo CREW_MAX_RESTARTS riavvii, poi resta spento
      if (crewRestarts >= CREW_MAX_RESTARTS) {
        console.warn(`[crew] processo terminato (code=${code}) — ${CREW_MAX_RESTARTS} riavvii falliti, crew service disabilitato`)
        return
      }
      crewRestarts++
      console.warn(`[crew] processo terminato (code=${code}) — riavvio ${crewRestarts}/${CREW_MAX_RESTARTS} tra 5s`)
      setTimeout(() => startCrewService(), 5000)
    })

    crewProcess = proc
    console.log(`[crew] avviato con ${cmd} su porta 8765`)
  }

  trySpawn(pythonCmds)
}

// In sviluppo Next gira già su localhost:3000 (concurrently); nel pacchetto
// il server parte su una porta libera di 127.0.0.1 scelta all'avvio.
let PORT = 3000
let ORIGIN = `http://localhost:${PORT}`

// Token di sessione del pacchetto: nuovo a ogni avvio, lo conoscono solo il server
// e le finestre dell'app (src/proxy.ts risponde 401 a chi non lo manda)
const TOKEN_HEADER = 'x-creative-os-token'
const SESSION_TOKEN = isDev ? null : crypto.randomBytes(32).toString('hex')

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

  // Si apre sul nuovo guscio circolare; l'interfaccia precedente resta su "/"
  mainWindow.loadURL(`${ORIGIN}/os`)

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

  overlayWindow.loadURL(`${ORIGIN}/overlay`)
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

// Chiede al sistema una porta TCP libera su 127.0.0.1
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

async function startNextServer() {
  if (isDev) {
    // In dev, Next.js è già avviato da concurrently — aspettiamo solo
    return
  }

  PORT = await findFreePort()
  ORIGIN = `http://127.0.0.1:${PORT}`

  // Server Next.js standalone copiato fuori dall'asar (resources/server):
  // gira nel Node incorporato in Electron, senza Node installato sul computer
  const serverDir = path.join(process.resourcesPath, 'server')
  nextServer = utilityProcess.fork(path.join(serverDir, 'server.js'), [], {
    cwd: serverDir,
    serviceName: 'Creative OS server',
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      DATABASE_PATH: dbPath,
      // vault predefinito: qui process.cwd() sarebbe resources/server
      VAULT_PATH: path.join(app.getPath('userData'), 'vault'),
      CREATIVE_OS_ORIGIN: ORIGIN,
      CREATIVE_OS_TOKEN: SESSION_TOKEN,
      NEXT_TELEMETRY_DISABLED: '1',
    },
  })
  nextServer.stdout?.on('data', (d) => process.stdout.write(`[next] ${d}`))
  nextServer.stderr?.on('data', (d) => process.stderr.write(`[next] ${d}`))

  // Aspetta che il server risponda; se muore o non risponde entro 60s, avvisa ed esci
  await new Promise((resolve, reject) => {
    let done = false
    const finish = (err) => { if (done) return; done = true; err ? reject(err) : resolve() }
    nextServer.once('exit', (code) => finish(new Error(`il server si è chiuso all'avvio (code=${code})`)))
    const deadline = Date.now() + 60_000
    const checkReady = () => {
      if (done) return
      if (Date.now() > deadline) return finish(new Error('il server non risponde dopo 60 secondi'))
      require('http').get(`${ORIGIN}/os`, { headers: { [TOKEN_HEADER]: SESSION_TOKEN } }, (res) => {
        res.resume()
        if (res.statusCode < 500) finish()
        else setTimeout(checkReady, 300)
      }).on('error', () => setTimeout(checkReady, 300))
    }
    setTimeout(checkReady, 300)
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
      const u = (() => { try { return new URL(navUrl) } catch { return null } })()
      const sameApp = u && u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname) && u.port === String(PORT)
      if (sameApp && /^\/(auth\/callback|api\/auth\/openrouter\/callback)/.test(u.pathname)) {
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
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
          "connect-src 'self' blob: ws://localhost:* http://localhost:* https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://generativelanguage.googleapis.com https://api.openai.com",
          "img-src 'self' data: blob: https:",
          "media-src 'self' blob: data:",
          "font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com https://api.fontshare.com",
          "frame-src 'self' https://www.figma.com https://www.canva.com",
          "worker-src 'self' blob:",
        ].join('; ')
      // Production: più restrittivo (no unsafe-eval)
      : [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
          `connect-src 'self' blob:${crewEnabled ? ' http://127.0.0.1:8765' : ''} https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://generativelanguage.googleapis.com https://api.openai.com https://openrouter.ai https://api.pexels.com https://api.unsplash.com`,
          "img-src 'self' data: blob: https:",
          "media-src 'self' blob: data:",
          "font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com https://api.fontshare.com",
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

  try {
    await startNextServer()
  } catch (err) {
    console.error('[next]', err)
    dialog.showErrorBox('Creative OS', `Impossibile avviare Creative OS: ${err.message}`)
    app.quit()
    return
  }
  // Ogni richiesta delle finestre verso il server porta il token (pagine, fetch, immagini)
  if (SESSION_TOKEN) {
    session.defaultSession.webRequest.onBeforeSendHeaders({ urls: [`${ORIGIN}/*`] }, (details, callback) => {
      callback({ requestHeaders: { ...details.requestHeaders, [TOKEN_HEADER]: SESSION_TOKEN } })
    })
  }
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

app.on('before-quit', () => { quitting = true })

app.on('window-all-closed', () => {
  quitting = true
  globalShortcut.unregisterAll()
  if (nextServer) nextServer.kill()
  if (crewProcess) crewProcess.kill('SIGTERM')
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
