import { Hono } from "hono";
import type { AppContext } from "../lib/types";

const auth = new Hono<AppContext>();

/**
 * GET /auth/me — Return the current user's info.
 */
auth.get("/me", (c) => {
  const user = c.get("user");
  return c.json({
    id: user.id,
    displayName: user.displayName,
    cfAccessId: user.cfAccessId,
  });
});

export default auth;
