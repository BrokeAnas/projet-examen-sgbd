/**
 * Instance UNIQUE de PrismaClient (pattern singleton).
 *
 * Pourquoi un singleton ?
 *  → Chaque PrismaClient ouvre un pool de connexions à la DB.
 *  → En instancier plusieurs gaspille les connexions et risque des fuites.
 *  → Une instance globale unique est exposée à tous les handlers IPC.
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});
