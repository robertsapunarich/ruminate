import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import { generateId } from "../lib/utils";
import type { AppContext } from "../lib/types";

/**
 * Cloudflare Access authentication middleware.
 *
 * Validates the CF-Access-JWT-Assertion header, extracts the user identity,
 * and upserts the user record in D1.
 *
 * In local development (wrangler dev), CF Access headers won't be present,
 * so we fall back to a dev user.
 */
export const authMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const db = drizzle(c.env.DB, { schema });
  c.set("db", db);

  // In production, Cloudflare Access sets these headers
  const cfAccessIdentity = c.req.header("Cf-Access-Authenticated-User-Email");
  const cfAccessId =
    c.req.header("Cf-Access-Jwt-Assertion") ?? cfAccessIdentity;

  let identity: string;
  let displayName: string | null = null;

  if (cfAccessIdentity) {
    identity = cfAccessIdentity;
    displayName = cfAccessIdentity.split("@")[0];
  } else {
    // Local development fallback
    identity = "dev@localhost";
    displayName = "Developer";
  }

  // Upsert user
  let [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.cfAccessId, identity))
    .limit(1);

  if (!user) {
    const newUser = {
      id: generateId(),
      cfAccessId: identity,
      displayName,
    };
    await db.insert(schema.users).values(newUser);
    user = (
      await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, newUser.id))
        .limit(1)
    )[0];
  }

  c.set("user", {
    id: user.id,
    cfAccessId: user.cfAccessId,
    displayName: user.displayName,
  });

  await next();
});
