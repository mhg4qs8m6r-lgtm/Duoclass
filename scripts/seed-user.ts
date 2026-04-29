/**
 * Crée un utilisateur de test dans la base SQLite locale.
 * Usage : node_modules/.bin/tsx scripts/seed-user.ts
 *
 * Variables d'environnement optionnelles :
 *   SEED_EMAIL    (défaut : admin@duoclass.local)
 *   SEED_PASSWORD (défaut : duoclass123)
 *   SEED_ROLE     (défaut : admin)
 */
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail } from "../server/db";

const email    = process.env.SEED_EMAIL    ?? "admin@duoclass.local";
const password = process.env.SEED_PASSWORD ?? "duoclass123";
const role     = process.env.SEED_ROLE     ?? "admin";

const existing = await getUserByEmail(email);
if (existing) {
  console.log(`✓ Compte déjà existant : ${email} (id=${existing.id}, rôle=${existing.role})`);
  process.exit(0);
}

const passwordHash = await bcrypt.hash(password, 12);
const user = await createUser({ email, name: "Admin", passwordHash, loginMethod: "email", role });

console.log(`✓ Compte créé :`);
console.log(`  email    : ${email}`);
console.log(`  password : ${password}`);
console.log(`  rôle     : ${user.role}`);
console.log(`  id       : ${user.id}`);
