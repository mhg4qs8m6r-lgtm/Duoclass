import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getOrCreateLocalUser } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Electron : utilisateur local unique, toujours authentifié.
  const user = await getOrCreateLocalUser();
  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
