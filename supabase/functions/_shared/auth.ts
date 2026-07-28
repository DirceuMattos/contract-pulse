import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

interface RoleAdminClient {
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: unknown }>;
}

const AUTH_ERROR_MESSAGE = "Unauthorized";

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new AuthError(`Missing ${name}`, 500);
  }
  return value;
}

function getAuthorizationHeader(req: Request): string {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError(AUTH_ERROR_MESSAGE, 401);
  }
  return authHeader;
}

export async function requireAuthenticatedUser(req: Request) {
  const authHeader = getAuthorizationHeader(req);
  const token = authHeader.replace("Bearer ", "").trim();
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Validate the JWT itself (works even if the auth-server session row is gone,
  // e.g. after a sign-out elsewhere, which makes getUser() return 403).
  const { data: claimsData, error: claimsError } = await authClient.auth
    .getClaims(token);

  const sub = (claimsData as { claims?: { sub?: string; email?: string } } | null)
    ?.claims?.sub;

  if (!claimsError && sub) {
    return {
      id: sub,
      email: (claimsData as { claims?: { email?: string } }).claims?.email ?? null,
    };
  }

  // Fallback for older tokens / edge cases
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) {
    throw new AuthError(AUTH_ERROR_MESSAGE, 401);
  }

  return { id: user.id, email: user.email ?? null };
}


export async function requireAnyRole(
  req: Request,
  adminClient: RoleAdminClient,
  roles: string[],
) {
  const user = await requireAuthenticatedUser(req);

  const { data: roleCheck, error } = await adminClient.rpc("has_any_role", {
    _user_id: user.id,
    _roles: roles,
  });

  if (error) {
    throw new AuthError("Unable to verify role", 500);
  }

  if (roleCheck !== true) {
    throw new AuthError("Forbidden", 403);
  }

  return user;
}
