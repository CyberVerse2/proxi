import { getAuthUser } from "./privy";

/**
 * Comma-separated list of Privy DIDs that have admin access.
 * Example: "did:privy:abc123,did:privy:def456"
 */
const ADMIN_PRIVY_IDS = (process.env.ADMIN_PRIVY_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

/**
 * Check whether a given Privy DID is in the admin allow-list.
 */
export function isAdmin(privyId: string): boolean {
  return ADMIN_PRIVY_IDS.includes(privyId);
}

/**
 * Extract Bearer token from a request, verify it with Privy, and assert
 * that the authenticated user is an admin.
 *
 * Returns the verified Privy user on success.
 * Returns a `{ error, status }` object on failure so the caller can
 * build the appropriate `NextResponse`.
 */
export async function requireAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  const authUser = await getAuthUser(token);

  if (!authUser) {
    return { error: "Unauthorized", status: 401 as const };
  }

  if (!isAdmin(authUser.userId)) {
    return { error: "Forbidden", status: 403 as const };
  }

  return { user: authUser };
}
