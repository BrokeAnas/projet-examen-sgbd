/**
 * PRELOAD SCRIPT — pont sécurisé entre le renderer (Angular) et le main (Node/Prisma).
 *
 * Pourquoi un preload ?
 *  Avec contextIsolation:true et nodeIntegration:false, le renderer N'A PAS
 *  accès direct à Node, ni à Prisma, ni au système de fichiers.
 *  Le preload s'exécute dans un contexte spécial qui a accès à Electron, et il
 *  utilise `contextBridge.exposeInMainWorld('api', ...)` pour exposer une API
 *  RESTREINTE et TYPÉE sur `window.api` côté renderer.
 *
 *  Côté renderer, on appellera par exemple : `window.api.membres.listerTous()`
 *  → ipcRenderer.invoke('membres:listerTous')
 *  → ipcMain.handle('membres:listerTous') reçoit l'appel et exécute Prisma
 *  → la réponse revient au renderer sous forme de Promise.
 */

import { contextBridge, ipcRenderer } from 'electron';

// Le typage côté renderer est défini dans src/renderer/app/models/api.types.ts
// (interface GymApi attachée à window.api).
const api = {
  membres: {
    listerTous: () => ipcRenderer.invoke('membres:listerTous'),
    obtenirParId: (id: number) => ipcRenderer.invoke('membres:obtenirParId', id),
    creer: (payload: unknown) => ipcRenderer.invoke('membres:creer', payload),
    modifier: (id: number, payload: unknown) => ipcRenderer.invoke('membres:modifier', id, payload),
    supprimer: (id: number) => ipcRenderer.invoke('membres:supprimer', id),
  },

  coachs: {
    listerTous: () => ipcRenderer.invoke('coachs:listerTous'),
    creer: (payload: unknown) => ipcRenderer.invoke('coachs:creer', payload),
    modifier: (id: number, payload: unknown) => ipcRenderer.invoke('coachs:modifier', id, payload),
    supprimer: (id: number) => ipcRenderer.invoke('coachs:supprimer', id),
  },

  cours: {
    listerTous: () => ipcRenderer.invoke('cours:listerTous'),
    obtenirParId: (id: number) => ipcRenderer.invoke('cours:obtenirParId', id),
    creer: (payload: unknown) => ipcRenderer.invoke('cours:creer', payload),
    modifier: (id: number, payload: unknown) => ipcRenderer.invoke('cours:modifier', id, payload),
    supprimer: (id: number) => ipcRenderer.invoke('cours:supprimer', id),
  },

  salles: {
    listerTous: () => ipcRenderer.invoke('salles:listerTous'),
    creer: (payload: unknown) => ipcRenderer.invoke('salles:creer', payload),
    modifier: (id: number, payload: unknown) => ipcRenderer.invoke('salles:modifier', id, payload),
    supprimer: (id: number) => ipcRenderer.invoke('salles:supprimer', id),
  },

  seances: {
    listerTous: () => ipcRenderer.invoke('seances:listerTous'),
    prochaines: (limite: number) => ipcRenderer.invoke('seances:prochaines', limite),
    creer: (payload: unknown) => ipcRenderer.invoke('seances:creer', payload),
    modifier: (id: number, payload: unknown) => ipcRenderer.invoke('seances:modifier', id, payload),
    supprimer: (id: number) => ipcRenderer.invoke('seances:supprimer', id),
  },

  // Table de jonction N:M Membre ↔ Seance.
  inscriptions: {
    listerToutes: () => ipcRenderer.invoke('inscriptions:listerToutes'),
    inscrire: (payload: unknown) => ipcRenderer.invoke('inscriptions:inscrire', payload),
    modifierPresence: (membreId: number, seanceId: number, presence: boolean) =>
      ipcRenderer.invoke('inscriptions:modifierPresence', membreId, seanceId, presence),
    desinscrire: (membreId: number, seanceId: number) =>
      ipcRenderer.invoke('inscriptions:desinscrire', membreId, seanceId),
  },

  abonnements: {
    listerTous: () => ipcRenderer.invoke('abonnements:listerTous'),
    creer: (payload: unknown) => ipcRenderer.invoke('abonnements:creer', payload),
    modifier: (id: number, payload: unknown) => ipcRenderer.invoke('abonnements:modifier', id, payload),
    supprimer: (id: number) => ipcRenderer.invoke('abonnements:supprimer', id),
    // Transaction : crée l'abonnement ET active le membre, atomiquement.
    souscrireEtActiver: (payload: unknown) => ipcRenderer.invoke('abonnements:souscrireEtActiver', payload),
  },

  statistiques: {
    obtenir: () => ipcRenderer.invoke('statistiques:obtenir'),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ApiPreload = typeof api;
