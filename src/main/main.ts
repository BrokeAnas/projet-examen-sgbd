/**
 * Point d'entrée du processus PRINCIPAL d'Electron.
 *
 * Rôle :
 *  - Créer la fenêtre BrowserWindow
 *  - Charger l'application Angular (fichier index.html buildé)
 *  - Enregistrer les handlers IPC (canaux de communication avec le renderer)
 *  - Gérer le cycle de vie de l'application
 *
 * Note sécurité : on isole strictement le renderer du système (nodeIntegration
 * = false, contextIsolation = true). Le renderer ne peut accéder à Node/Prisma
 * QUE via les méthodes exposées par le preload.
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { prisma } from './prisma-client';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'GymManager',
    webPreferences: {
      // SÉCURITÉ : on cloisonne le renderer.
      contextIsolation: true,        // le `window` du renderer est isolé du contexte Node
      nodeIntegration: false,        // pas d'accès direct à require/process côté UI
      sandbox: false,                // on garde le preload en mode "non-sandbox" pour pouvoir y require Electron
      preload: path.join(__dirname, '..', '..', 'preload', 'preload', 'preload.js'),
    },
  });

  const indexPath = path.join(__dirname, '..', '..', 'renderer', 'browser', 'index.html');
  mainWindow.loadFile(indexPath);

  // Décommenter pour ouvrir les DevTools automatiquement (utile en debug).
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Cycle de vie Electron : on attend que l'app soit prête puis on enregistre
// les handlers IPC AVANT de créer la fenêtre (sinon le renderer pourrait
// appeler des canaux non encore branchés).
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  // macOS : recréer la fenêtre si on clique sur l'icône du dock alors qu'aucune
  // fenêtre n'est ouverte.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quitter quand toutes les fenêtres sont fermées (sauf macOS où c'est l'usage
// de laisser l'app vivante jusqu'à Cmd+Q).
app.on('window-all-closed', async () => {
  await prisma.$disconnect();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Sécurité : on coupe proprement Prisma avant de quitter.
app.on('before-quit', async () => {
  await prisma.$disconnect();
});
