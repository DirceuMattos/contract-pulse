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
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) {
    throw new AuthError(AUTH_ERROR_MESSAGE, 401);
  }

  return user;
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
