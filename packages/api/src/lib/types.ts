import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../db/schema";

export interface Bindings {
  DB: D1Database;
  CACHE: KVNamespace;
  ASSETS: Fetcher;
}

export type Database = DrizzleD1Database<typeof schema>;

export interface AuthUser {
  id: string;
  cfAccessId: string;
  displayName: string | null;
}

export interface AppContext {
  Bindings: Bindings;
  Variables: {
    user: AuthUser;
    db: Database;
  };
}
