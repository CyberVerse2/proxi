import { PrivyClient } from "@privy-io/server-auth";

export const privyServer = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export async function getAuthUser(authToken: string | undefined) {
  if (!authToken) return null;
  try {
    return await privyServer.verifyAuthToken(authToken);
  } catch {
    return null;
  }
}
