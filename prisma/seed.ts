/**
 * Script de peuplement de la base de données.
 * Lancé via : npm run seed
 *
 * On vide d'abord les tables (dans l'ordre qui respecte les FK) puis on insère
 * un jeu de données réaliste pour tester l'application.
 */

import { PrismaClient, StatutMembre, TypeAbonnement } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed...');

  // ----------------------------------------------------------
  // 1) Nettoyage — ordre inverse des dépendances pour ne pas
  //    violer les contraintes FOREIGN KEY.
  // ----------------------------------------------------------
  await prisma.inscription.deleteMany();
  await prisma.abonnement.deleteMany();
  await prisma.seance.deleteMany();
  await prisma.cours.deleteMany();
  await prisma.salle.deleteMany();
  await prisma.coach.deleteMany();
  await prisma.membre.deleteMany();

  // ----------------------------------------------------------
  // 2) Coachs (3)
  // ----------------------------------------------------------
  const coachs = await Promise.all([
    prisma.coach.create({
      data: { nom: 'Dupont', prenom: 'Marie', specialite: 'Yoga', salaire: 2400 },
    }),
    prisma.coach.create({
      data: { nom: 'Martin', prenom: 'Lucas', specialite: 'CrossFit', salaire: 2800 },
    }),
    prisma.coach.create({
      data: { nom: 'Bernard', prenom: 'Sophie', specialite: 'Pilates', salaire: 2500 },
    }),
  ]);

  // ----------------------------------------------------------
  // 3) Salles (3)
  // ----------------------------------------------------------
  const salles = await Promise.all([
    prisma.salle.create({
      data: { nom: 'Salle Zen', capacite: 20, equipements: 'Tapis, blocs, sangles' },
    }),
    prisma.salle.create({
      data: { nom: 'Salle Iron', capacite: 30, equipements: 'Haltères, barres, racks' },
    }),
    prisma.salle.create({
      data: { nom: 'Salle Cardio', capacite: 25, equipements: null },
    }),
  ]);

  // ----------------------------------------------------------
  // 4) Cours (5) — chacun rattaché à un coach
  // ----------------------------------------------------------
  const cours = await Promise.all([
    prisma.cours.create({
      data: {
        titre: 'Yoga débutant',
        description: 'Initiation aux postures de base.',
        dureeMinutes: 60,
        capaciteMax: 15,
        coachId: coachs[0].id,
      },
    }),
    prisma.cours.create({
      data: {
        titre: 'Yoga avancé',
        description: 'Postures complexes et respiration.',
        dureeMinutes: 75,
        capaciteMax: 12,
        coachId: coachs[0].id,
      },
    }),
    prisma.cours.create({
      data: {
        titre: 'CrossFit WOD',
        description: 'Workout of the day intensif.',
        dureeMinutes: 60,
        capaciteMax: 20,
        coachId: coachs[1].id,
      },
    }),
    prisma.cours.create({
      data: {
        titre: 'Pilates équilibre',
        description: null,
        dureeMinutes: 50,
        capaciteMax: 15,
        coachId: coachs[2].id,
      },
    }),
    prisma.cours.create({
      data: {
        titre: 'CrossFit débutant',
        description: 'Découverte des mouvements de base.',
        dureeMinutes: 45,
        capaciteMax: 18,
        coachId: coachs[1].id,
      },
    }),
  ]);

  // ----------------------------------------------------------
  // 5) Membres (10) — statuts variés
  // ----------------------------------------------------------
  const prenoms = ['Alice', 'Karim', 'Léa', 'Mehdi', 'Chloé', 'Yanis', 'Emma', 'Hugo', 'Sara', 'Noah'];
  const noms = ['Durand', 'Benali', 'Petit', 'Hassan', 'Roux', 'Aoun', 'Fournier', 'Garcia', 'Cherif', 'Lemoine'];
  const statuts: StatutMembre[] = [
    'ACTIF', 'ACTIF', 'ACTIF', 'ACTIF', 'ACTIF', 'ACTIF', 'ACTIF', 'SUSPENDU', 'SUSPENDU', 'RESILIE',
  ];

  const membres = [];
  for (let i = 0; i < 10; i++) {
    const m = await prisma.membre.create({
      data: {
        nom: noms[i],
        prenom: prenoms[i],
        email: `${prenoms[i].toLowerCase()}.${noms[i].toLowerCase()}@gym.local`,
        statut: statuts[i],
      },
    });
    membres.push(m);
  }

  // ----------------------------------------------------------
  // 6) Séances (8) — dans les 30 prochains jours
  // ----------------------------------------------------------
  const maintenant = new Date();
  const seances = [];
  for (let i = 0; i < 8; i++) {
    const date = new Date(maintenant);
    date.setDate(date.getDate() + i + 1); // J+1 à J+8
    date.setHours(18, 0, 0, 0);

    const s = await prisma.seance.create({
      data: {
        dateHeure: date,
        coursId: cours[i % cours.length].id,
        salleId: salles[i % salles.length].id,
      },
    });
    seances.push(s);
  }

  // ----------------------------------------------------------
  // 7) Inscriptions (15) — N:M avec champs supplémentaires
  // ----------------------------------------------------------
  const inscriptionsAFaire: Array<{ membreId: number; seanceId: number; presence: boolean }> = [];
  let count = 0;
  for (let m = 0; m < membres.length && count < 15; m++) {
    for (let s = 0; s < seances.length && count < 15; s++) {
      // règle simple : on inscrit ~1 membre sur 2 sur chaque séance
      if ((m + s) % 2 === 0) {
        inscriptionsAFaire.push({
          membreId: membres[m].id,
          seanceId: seances[s].id,
          presence: Math.random() > 0.5,
        });
        count++;
      }
    }
  }
  for (const ins of inscriptionsAFaire) {
    await prisma.inscription.create({ data: ins });
  }

  // ----------------------------------------------------------
  // 8) Abonnements (10) — variétés de types
  // ----------------------------------------------------------
  const types: TypeAbonnement[] = ['MENSUEL', 'TRIMESTRIEL', 'ANNUEL'];
  const prixParType: Record<TypeAbonnement, number> = {
    MENSUEL: 49.9,
    TRIMESTRIEL: 129,
    ANNUEL: 449,
  };
  const dureeMoisParType: Record<TypeAbonnement, number> = {
    MENSUEL: 1,
    TRIMESTRIEL: 3,
    ANNUEL: 12,
  };

  for (let i = 0; i < 10; i++) {
    const type = types[i % types.length];
    const debut = new Date();
    debut.setMonth(debut.getMonth() - (i % 4)); // certains expirés, d'autres en cours
    const fin = new Date(debut);
    fin.setMonth(fin.getMonth() + dureeMoisParType[type]);

    await prisma.abonnement.create({
      data: {
        type,
        prix: prixParType[type],
        dateDebut: debut,
        dateFin: fin,
        membreId: membres[i].id,
      },
    });
  }

  console.log('✅ Seed terminé !');
  console.log(`   ${membres.length} membres, ${coachs.length} coachs, ${cours.length} cours,`);
  console.log(`   ${seances.length} séances, ${inscriptionsAFaire.length} inscriptions, ${salles.length} salles, 10 abonnements`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
