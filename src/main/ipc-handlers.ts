/**
 * HANDLERS IPC — toutes les requêtes Prisma déclenchées par le renderer.
 *
 * Convention de réponse :
 *   { success: true, data: T }
 *   { success: false, error: string }
 *
 * Pourquoi ce format ? Pour éviter que `ipcRenderer.invoke` rejette des
 * Promises non gérées côté renderer (ce qui crasherait l'UI). On encode
 * explicitement les erreurs en valeur de retour.
 *
 * Chaque handler est entouré d'un try/catch : on ne laisse JAMAIS remonter
 * une erreur Prisma brute au renderer (elle peut contenir des détails
 * sensibles : chemins, requêtes SQL…).
 */

import { ipcMain } from 'electron';
import { prisma } from './prisma-client';
import type { Prisma, StatutMembre } from '@prisma/client';

interface CreerMembrePayload {
  nom: string;
  prenom: string;
  email: string;
  statut: StatutMembre;
}

interface ModifierMembrePayload {
  nom: string;
  prenom: string;
  email: string;
  statut: StatutMembre;
}

function ok<T>(data: T) {
  return { success: true as const, data };
}
function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[IPC] Erreur :', message);
  return { success: false as const, error: message };
}

function valider(payload: unknown): CreerMembrePayload {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Payload invalide.');
  }
  const p = payload as Record<string, unknown>;
  if (typeof p['nom'] !== 'string' || !p['nom'].trim()) throw new Error('Nom requis.');
  if (typeof p['prenom'] !== 'string' || !p['prenom'].trim()) throw new Error('Prénom requis.');
  if (typeof p['email'] !== 'string' || !p['email'].includes('@')) throw new Error('Email invalide.');
  const statut = p['statut'];
  if (statut !== 'ACTIF' && statut !== 'SUSPENDU' && statut !== 'RESILIE') {
    throw new Error('Statut invalide.');
  }
  return {
    nom: p['nom'],
    prenom: p['prenom'],
    email: p['email'],
    statut: statut as StatutMembre,
  };
}

export function registerIpcHandlers(): void {
  // =====================================================================
  //  MEMBRES — CRUD complet
  // =====================================================================

  ipcMain.handle('membres:listerTous', async () => {
    try {
      const membres = await prisma.membre.findMany({
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      });
      return ok(membres);
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle('membres:obtenirParId', async (_event, id: number) => {
    try {
      const membre = await prisma.membre.findUnique({
        where: { id },
        include: {
          abonnements: { orderBy: { dateDebut: 'desc' } },
          inscriptions: {
            include: { seance: { include: { cours: true } } },
            orderBy: { dateInscription: 'desc' },
          },
        },
      });
      if (!membre) throw new Error(`Membre ${id} introuvable.`);
      return ok(membre);
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle('membres:creer', async (_event, payload: unknown) => {
    try {
      const donneesValidees = valider(payload);
      const cree = await prisma.membre.create({ data: donneesValidees });
      return ok(cree);
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle('membres:modifier', async (_event, id: number, payload: unknown) => {
    try {
      const donneesValidees: ModifierMembrePayload = valider(payload);
      const modifie = await prisma.membre.update({ where: { id }, data: donneesValidees });
      return ok(modifie);
    } catch (e) {
      return fail(e);
    }
  });

  // Grâce à onDelete: Cascade dans le schéma, les Inscriptions et Abonnements
  // liés sont supprimés automatiquement.
  ipcMain.handle('membres:supprimer', async (_event, id: number) => {
    try {
      await prisma.membre.delete({ where: { id } });
      return ok({ id });
    } catch (e) {
      return fail(e);
    }
  });

  // =====================================================================
  //  COACHS
  // =====================================================================
  ipcMain.handle('coachs:listerTous', async () => {
    try {
      const coachs = await prisma.coach.findMany({
        orderBy: { nom: 'asc' },
        include: { cours: true },
      });
      return ok(coachs);
    } catch (e) {
      return fail(e);
    }
  });

  // =====================================================================
  //  COURS
  // =====================================================================
  ipcMain.handle('cours:listerTous', async () => {
    try {
      const cours = await prisma.cours.findMany({
        include: {
          coach: true,
          seances: { orderBy: { dateHeure: 'asc' } },
        },
        orderBy: { titre: 'asc' },
      });
      return ok(cours);
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle('cours:obtenirParId', async (_event, id: number) => {
    try {
      const cours = await prisma.cours.findUnique({
        where: { id },
        include: { coach: true, seances: { include: { salle: true } } },
      });
      if (!cours) throw new Error(`Cours ${id} introuvable.`);
      return ok(cours);
    } catch (e) {
      return fail(e);
    }
  });

  // =====================================================================
  //  SÉANCES — les N prochaines
  // =====================================================================
  ipcMain.handle('seances:prochaines', async (_event, limite: number) => {
    try {
      const maintenant = new Date();
      const seances = await prisma.seance.findMany({
        where: { dateHeure: { gte: maintenant } },
        orderBy: { dateHeure: 'asc' },
        take: limite,
        include: {
          cours: { include: { coach: true } },
          salle: true,
          inscriptions: true, // pour calculer le taux de remplissage
        },
      });
      return ok(seances);
    } catch (e) {
      return fail(e);
    }
  });

  // =====================================================================
  //  STATISTIQUES — agrégats Prisma
  // =====================================================================
  ipcMain.handle('statistiques:obtenir', async () => {
    try {
      // SQL : SELECT COUNT(*) FROM Membre WHERE statut = 'ACTIF';
      const nombreMembresActifs = await prisma.membre.count({
        where: { statut: 'ACTIF' },
      });

      const nombreMembresTotal = await prisma.membre.count();

      // SQL : SELECT coachId, COUNT(*) FROM Cours GROUP BY coachId;
      const groupes = await prisma.cours.groupBy({
        by: ['coachId'],
        _count: { _all: true },
      });
      const coachsListe = await prisma.coach.findMany();
      const coursParCoach = groupes.map((g) => {
        const coach = coachsListe.find((c) => c.id === g.coachId);
        return {
          coachId: g.coachId,
          coachNom: coach ? `${coach.prenom} ${coach.nom}` : 'Inconnu',
          nombreCours: g._count._all,
        };
      });

      const prochainesSeances = await prisma.seance.findMany({
        where: { dateHeure: { gte: new Date() } },
        orderBy: { dateHeure: 'asc' },
        take: 5,
        include: {
          cours: { include: { coach: true } },
          salle: true,
          inscriptions: true,
        },
      });

      // Taux de remplissage moyen — calculé côté JS à partir des séances.
      const toutesSeances = await prisma.seance.findMany({
        include: { cours: true, inscriptions: true },
      });
      const taux = toutesSeances.map(
        (s) => (s.inscriptions.length / s.cours.capaciteMax) * 100,
      );
      const tauxRemplissageMoyen =
        taux.length === 0 ? 0 : taux.reduce((a, b) => a + b, 0) / taux.length;

      return ok({
        nombreMembresActifs,
        nombreMembresTotal,
        coursParCoach,
        prochainesSeances,
        tauxRemplissageMoyen: Math.round(tauxRemplissageMoyen * 10) / 10,
      });
    } catch (e) {
      return fail(e);
    }
  });

  // =====================================================================
  //  COACHS — CRUD complet
  // =====================================================================
  ipcMain.handle('coachs:creer', async (_event, payload: unknown) => {
    try {
      const p = payload as Record<string, unknown>;
      if (typeof p['nom'] !== 'string' || typeof p['prenom'] !== 'string') throw new Error('Nom et prénom requis.');
      if (typeof p['specialite'] !== 'string') throw new Error('Spécialité requise.');
      if (typeof p['salaire'] !== 'number') throw new Error('Salaire numérique requis.');
      const cree = await prisma.coach.create({
        data: {
          nom: p['nom'],
          prenom: p['prenom'],
          specialite: p['specialite'],
          salaire: p['salaire'],
        },
      });
      return ok(cree);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('coachs:modifier', async (_event, id: number, payload: unknown) => {
    try {
      const p = payload as Record<string, unknown>;
      const modifie = await prisma.coach.update({
        where: { id },
        data: {
          nom: p['nom'] as string,
          prenom: p['prenom'] as string,
          specialite: p['specialite'] as string,
          salaire: p['salaire'] as number,
        },
      });
      return ok(modifie);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('coachs:supprimer', async (_event, id: number) => {
    try {
      // Si le coach a encore des cours, la contrainte FK onDelete:Restrict
      // fait remonter une erreur Prisma — c'est l'effet voulu.
      await prisma.coach.delete({ where: { id } });
      return ok({ id });
    } catch (e) { return fail(e); }
  });

  // =====================================================================
  //  COURS — CRUD complet
  // =====================================================================
  ipcMain.handle('cours:creer', async (_event, payload: unknown) => {
    try {
      const p = payload as Record<string, unknown>;
      const cree = await prisma.cours.create({
        data: {
          titre: p['titre'] as string,
          description: (p['description'] as string | null) ?? null,
          dureeMinutes: p['dureeMinutes'] as number,
          capaciteMax: p['capaciteMax'] as number,
          coachId: p['coachId'] as number,
        },
      });
      return ok(cree);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('cours:modifier', async (_event, id: number, payload: unknown) => {
    try {
      const p = payload as Record<string, unknown>;
      const modifie = await prisma.cours.update({
        where: { id },
        data: {
          titre: p['titre'] as string,
          description: (p['description'] as string | null) ?? null,
          dureeMinutes: p['dureeMinutes'] as number,
          capaciteMax: p['capaciteMax'] as number,
          coachId: p['coachId'] as number,
        },
      });
      return ok(modifie);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('cours:supprimer', async (_event, id: number) => {
    try {
      // Cascade : ses séances disparaissent automatiquement (cf. schema.prisma).
      await prisma.cours.delete({ where: { id } });
      return ok({ id });
    } catch (e) { return fail(e); }
  });

  // =====================================================================
  //  SALLES — CRUD complet
  // =====================================================================
  ipcMain.handle('salles:listerTous', async () => {
    try {
      const salles = await prisma.salle.findMany({ orderBy: { nom: 'asc' } });
      return ok(salles);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('salles:creer', async (_event, payload: unknown) => {
    try {
      const p = payload as Record<string, unknown>;
      const cree = await prisma.salle.create({
        data: {
          nom: p['nom'] as string,
          capacite: p['capacite'] as number,
          equipements: (p['equipements'] as string | null) ?? null,
        },
      });
      return ok(cree);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('salles:modifier', async (_event, id: number, payload: unknown) => {
    try {
      const p = payload as Record<string, unknown>;
      const modifie = await prisma.salle.update({
        where: { id },
        data: {
          nom: p['nom'] as string,
          capacite: p['capacite'] as number,
          equipements: (p['equipements'] as string | null) ?? null,
        },
      });
      return ok(modifie);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('salles:supprimer', async (_event, id: number) => {
    try {
      // Restrict : impossible de supprimer une salle utilisée.
      await prisma.salle.delete({ where: { id } });
      return ok({ id });
    } catch (e) { return fail(e); }
  });

  // =====================================================================
  //  SÉANCES — CRUD complet
  // =====================================================================
  ipcMain.handle('seances:listerTous', async () => {
    try {
      const seances = await prisma.seance.findMany({
        orderBy: { dateHeure: 'desc' },
        include: { cours: { include: { coach: true } }, salle: true, inscriptions: true },
      });
      return ok(seances);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('seances:creer', async (_event, payload: unknown) => {
    try {
      const p = payload as Record<string, unknown>;
      const cree = await prisma.seance.create({
        data: {
          dateHeure: new Date(p['dateHeure'] as string),
          coursId: p['coursId'] as number,
          salleId: p['salleId'] as number,
        },
      });
      return ok(cree);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('seances:modifier', async (_event, id: number, payload: unknown) => {
    try {
      const p = payload as Record<string, unknown>;
      const modifie = await prisma.seance.update({
        where: { id },
        data: {
          dateHeure: new Date(p['dateHeure'] as string),
          coursId: p['coursId'] as number,
          salleId: p['salleId'] as number,
        },
      });
      return ok(modifie);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('seances:supprimer', async (_event, id: number) => {
    try {
      await prisma.seance.delete({ where: { id } });
      return ok({ id });
    } catch (e) { return fail(e); }
  });

  // =====================================================================
  //  INSCRIPTIONS — CRUD complet sur la table de jonction
  //  (Create = inscrire, Update = marquer présence, Delete = désinscrire)
  // =====================================================================
  ipcMain.handle('inscriptions:listerToutes', async () => {
    try {
      const inscriptions = await prisma.inscription.findMany({
        include: { membre: true, seance: { include: { cours: true } } },
        orderBy: { dateInscription: 'desc' },
      });
      return ok(inscriptions);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('inscriptions:inscrire', async (_event, payload: unknown) => {
    try {
      const p = payload as Record<string, unknown>;
      const cree = await prisma.inscription.create({
        data: {
          membreId: p['membreId'] as number,
          seanceId: p['seanceId'] as number,
          presence: false,
        },
      });
      return ok(cree);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('inscriptions:modifierPresence', async (_event, membreId: number, seanceId: number, presence: boolean) => {
    try {
      // Accès via la clé primaire composite définie par @@id([membreId, seanceId]).
      const modifiee = await prisma.inscription.update({
        where: { membreId_seanceId: { membreId, seanceId } },
        data: { presence },
      });
      return ok(modifiee);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('inscriptions:desinscrire', async (_event, membreId: number, seanceId: number) => {
    try {
      await prisma.inscription.delete({
        where: { membreId_seanceId: { membreId, seanceId } },
      });
      return ok({ membreId, seanceId });
    } catch (e) { return fail(e); }
  });

  // =====================================================================
  //  ABONNEMENTS — CRUD complet
  // =====================================================================
  ipcMain.handle('abonnements:listerTous', async () => {
    try {
      const abonnements = await prisma.abonnement.findMany({
        include: { membre: true },
        orderBy: { dateDebut: 'desc' },
      });
      return ok(abonnements);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('abonnements:creer', async (_event, payload: unknown) => {
    try {
      const p = payload as Record<string, unknown>;
      const cree = await prisma.abonnement.create({
        data: {
          type: p['type'] as 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL',
          prix: p['prix'] as number,
          dateDebut: new Date(p['dateDebut'] as string),
          dateFin: new Date(p['dateFin'] as string),
          membreId: p['membreId'] as number,
        },
      });
      return ok(cree);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('abonnements:modifier', async (_event, id: number, payload: unknown) => {
    try {
      const p = payload as Record<string, unknown>;
      const modifie = await prisma.abonnement.update({
        where: { id },
        data: {
          type: p['type'] as 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL',
          prix: p['prix'] as number,
          dateDebut: new Date(p['dateDebut'] as string),
          dateFin: new Date(p['dateFin'] as string),
        },
      });
      return ok(modifie);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('abonnements:supprimer', async (_event, id: number) => {
    try {
      await prisma.abonnement.delete({ where: { id } });
      return ok({ id });
    } catch (e) { return fail(e); }
  });

  // =====================================================================
  //  TRANSACTION PRISMA — Souscrire un abonnement ET activer le membre
  // ---------------------------------------------------------------------
  //  Ce handler réunit DEUX opérations DB qui DOIVENT réussir ensemble,
  //  ou échouer ensemble. C'est exactement le cas d'usage d'une transaction.
  //
  //  Scénario métier :
  //    Un membre paye un nouvel abonnement. On veut :
  //      1) créer la ligne dans Abonnement
  //      2) passer son statut à ACTIF (s'il était SUSPENDU ou RESILIE)
  //
  //  Pourquoi une transaction ?
  //    Si on faisait deux appels Prisma séparés et que le 2e plantait
  //    (panne disque, erreur réseau, contrainte violée), on aurait :
  //      → un abonnement créé (= paiement encaissé)
  //      → un membre toujours SUSPENDU (= ne peut pas accéder aux séances)
  //    => DONNÉES INCOHÉRENTES. Le client a payé mais ne peut pas utiliser.
  //
  //  Avec $transaction, soit les DEUX réussissent et sont visibles d'un
  //  seul coup (COMMIT), soit AUCUN n'est appliqué (ROLLBACK automatique
  //  si une exception est levée à l'intérieur du callback).
  //
  //  Principe ACID rappelé :
  //   • Atomicité  : tout ou rien (c'est ce qu'on cherche ici)
  //   • Cohérence  : la base reste dans un état valide
  //   • Isolation  : les transactions concurrentes ne s'interfèrent pas
  //   • Durabilité : une fois COMMIT, c'est gravé sur disque
  //
  //  SQL équivalent généré sous le capot :
  //    BEGIN TRANSACTION;
  //      INSERT INTO Abonnement (type, prix, dateDebut, dateFin, membreId)
  //           VALUES (?, ?, ?, ?, ?);
  //      UPDATE Membre SET statut = 'ACTIF' WHERE id = ?;
  //    COMMIT;
  //    -- si erreur entre les deux : ROLLBACK; (les changements ne s'appliquent pas)
  // =====================================================================
  ipcMain.handle('abonnements:souscrireEtActiver', async (_event, payload: unknown) => {
    try {
      const p = payload as Record<string, unknown>;
      if (typeof p['membreId'] !== 'number') throw new Error('membreId requis.');
      if (typeof p['prix'] !== 'number') throw new Error('prix requis.');

      // Syntaxe interactive : on passe une callback async qui reçoit `tx`,
      // un PrismaClient lié à la transaction. Si la callback throw,
      // Prisma exécute ROLLBACK ; sinon, COMMIT.
      const resultat = await prisma.$transaction(async (tx) => {
        const abonnement = await tx.abonnement.create({
          data: {
            type: p['type'] as 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL',
            prix: p['prix'] as number,
            dateDebut: new Date(p['dateDebut'] as string),
            dateFin: new Date(p['dateFin'] as string),
            membreId: p['membreId'] as number,
          },
        });

        // Si le membre n'existe pas, l'update plante → ROLLBACK auto
        // de l'INSERT précédent : la base reste cohérente.
        const membre = await tx.membre.update({
          where: { id: p['membreId'] as number },
          data: { statut: 'ACTIF' },
        });

        return { abonnement, membre };
      });

      return ok(resultat);
    } catch (e) {
      // Si on arrive ici, la transaction a fait ROLLBACK :
      // aucune des deux opérations n'a été persistée.
      return fail(e);
    }
  });
}

export type _PrismaImport = Prisma.MembreCreateInput;
