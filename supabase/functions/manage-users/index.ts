import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { AuthError, requireAnyRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(msg: string, status = 400) {
  return json({ error: msg }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Admin client (service role) for admin operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Parse body
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  const action = body.action as string;

  // seed actions require a secret token (service role key) to prevent unauthenticated access
  if (action === "seed-admin" || action === "seed-teams-jobtitles") {
    const seedToken = req.headers.get("x-seed-token");
    if (seedToken !== serviceRoleKey) {
      return err("Forbidden: invalid seed token", 403);
    }
    if (action === "seed-admin") {
      return await handleSeedAdmin(adminClient, body);
    }
    return await handleSeedTeamsJobTitles(adminClient);
  }

  // All other actions require a valid authenticated c-level or superadmin user.
  let callerId: string;
  try {
    const caller = await requireAnyRole(req, adminClient, ["c-level", "superadmin"]);
    callerId = caller.id;
  } catch (authError) {
    if (authError instanceof AuthError) {
      return err(authError.message, authError.status);
    }
    console.error("Auth check failed:", authError);
    return err("Unauthorized", 401);
  }

  switch (action) {
    case "list":
      return await handleList(adminClient);
    case "create":
      return await handleCreate(adminClient, body);
    case "update":
      return await handleUpdate(adminClient, body);
    case "delete":
      return await handleDelete(adminClient, body, callerId);
    case "toggle-status":
      return await handleToggleStatus(adminClient, body, callerId);
    case "maintenance-status":
      return await handleMaintenanceStatus(adminClient);
    case "enable-maintenance":
      return await handleEnableMaintenance(adminClient, callerId);
    case "disable-maintenance":
      return await handleDisableMaintenance(adminClient, callerId);
    case "get-by-id":
      return await handleGetById(adminClient, body);
    default:
      return err(`Unknown action: ${action}`);
  }
});

// --- Handlers ---

async function handleSeedAdmin(admin: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const email = (body.email as string) || "admin@bnp.com.br";
  const password = typeof body.password === "string" ? body.password : "";
  const name = (body.name as string) || "Administrador";

  if (password.length < 12) {
    return err("Seed admin requires an explicit password with at least 12 characters.", 400);
  }

  // Check if any c-level user exists
  const { data: existing } = await admin.from("user_roles").select("id").eq("role", "c-level").limit(1);

  if (existing && existing.length > 0) {
    return json({ message: "Admin user already exists", seeded: false });
  }

  // Create user in Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (authError) {
    return err(`Failed to create admin: ${authError.message}`, 500);
  }

  const userId = authData.user.id;

  // Set role to c-level (trigger already created profile + leitor role)
  // Update the role from leitor to c-level
  await admin.from("user_roles").update({ role: "c-level" }).eq("user_id", userId);

  return json({ message: "Admin user created", seeded: true, userId });
}

async function handleList(admin: ReturnType<typeof createClient>) {
  // Get all profiles
  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (pErr) return err(pErr.message, 500);

  // Get all roles
  const { data: roles } = await admin.from("user_roles").select("*");

  // Get all module permissions
  const { data: permissions } = await admin.from("user_module_permissions").select("*");

  // Get banned status from auth
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });

  const bannedMap = new Map<string, boolean>();
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      bannedMap.set(u.id, u.banned_until ? new Date(u.banned_until) > new Date() : false);
    }
  }

  const users = (profiles || []).map((p) => {
    const role = roles?.find((r) => r.user_id === p.id)?.role || "leitor";
    const userPerms = (permissions || []).filter((pm) => pm.user_id === p.id);
    const moduleAccess: Record<string, boolean> = {};
    for (const pm of userPerms) {
      moduleAccess[pm.module_key] = pm.is_allowed;
    }

    return {
      id: p.id,
      name: p.name,
      email: p.email,
      role,
      active: !bannedMap.get(p.id),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      moduleAccess: Object.keys(moduleAccess).length > 0 ? moduleAccess : undefined,
    };
  });

  return json({ users });
}

async function handleCreate(admin: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const { email, password, name, role, active, moduleAccess } = body as {
    email: string;
    password: string;
    name: string;
    role: string;
    active: boolean;
    moduleAccess?: Record<string, boolean>;
  };

  if (!email || !password || !name || !role) {
    return err("Missing required fields: email, password, name, role");
  }

  // Create in Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, must_change_password: true },
  });

  if (authError) return err(authError.message, 400);

  const userId = authData.user.id;

  // Update profile name (trigger sets it from metadata already, but ensure)
  await admin.from("profiles").update({ name }).eq("id", userId);

  // Update role (trigger sets leitor by default)
  if (role !== "leitor") {
    await admin.from("user_roles").update({ role }).eq("user_id", userId);
  }

  // Set module permissions
  if (moduleAccess) {
    const rows = Object.entries(moduleAccess).map(([key, allowed]) => ({
      user_id: userId,
      module_key: key,
      is_allowed: allowed,
    }));
    if (rows.length > 0) {
      await admin.from("user_module_permissions").insert(rows);
    }
  }

  // Ban if not active
  if (active === false) {
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
  }

  return json({ userId, message: "User created" }, 201);
}

async function handleUpdate(admin: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const { userId, name, email, role, password, moduleAccess } = body as {
    userId: string;
    name?: string;
    email?: string;
    role?: string;
    password?: string;
    moduleAccess?: Record<string, boolean>;
  };

  if (!userId) return err("Missing userId");

  // Update profile
  const profileUpdates: Record<string, unknown> = {};
  if (name) profileUpdates.name = name;
  if (email) profileUpdates.email = email;
  if (Object.keys(profileUpdates).length > 0) {
    await admin.from("profiles").update(profileUpdates).eq("id", userId);
  }

  // Update auth email/password
  const authUpdates: Record<string, unknown> = {};
  if (email) authUpdates.email = email;
  if (password) authUpdates.password = password;
  if (Object.keys(authUpdates).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(userId, authUpdates);
    if (error) return err(error.message, 400);
  }

  // Update role
  if (role) {
    await admin.from("user_roles").update({ role }).eq("user_id", userId);
  }

  // Update module permissions (upsert)
  if (moduleAccess) {
    // Delete existing and re-insert
    const { error: delErr } = await admin.from("user_module_permissions").delete().eq("user_id", userId);

    if (delErr) {
      console.error("Failed to delete module permissions:", delErr.message);
      return err(`Failed to update permissions: ${delErr.message}`, 500);
    }

    const rows = Object.entries(moduleAccess).map(([key, allowed]) => ({
      user_id: userId,
      module_key: key,
      is_allowed: allowed,
    }));
    if (rows.length > 0) {
      const { error: insErr } = await admin.from("user_module_permissions").insert(rows);
      if (insErr) {
        console.error("Failed to insert module permissions:", insErr.message);
        return err(`Failed to save permissions: ${insErr.message}`, 500);
      }
    }
  }

  return json({ message: "User updated" });
}

async function handleDelete(admin: ReturnType<typeof createClient>, body: Record<string, unknown>, callerId: string) {
  const userId = body.userId as string;
  if (!userId) return err("Missing userId");
  if (userId === callerId) return err("Cannot delete yourself");

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return err(error.message, 500);

  return json({ message: "User deleted" });
}

async function handleToggleStatus(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
  callerId: string,
) {
  const userId = body.userId as string;
  const ban = body.ban as boolean;
  if (!userId) return err("Missing userId");
  if (userId === callerId) return err("Cannot ban/unban yourself");

  if (ban) {
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
  } else {
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });
  }

  return json({ message: ban ? "User banned" : "User unbanned" });
}

async function ensureCallerIsSuperAdmin(admin: ReturnType<typeof createClient>, callerId: string) {
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .single();

  if (error) throw error;
  if (data?.role !== "superadmin") {
    throw new AuthError("Only superadmin can change maintenance mode", 403);
  }
}

async function getMaintenanceLockIds(admin: ReturnType<typeof createClient>): Promise<string[]> {
  const { data, error } = await admin
    .from("maintenance_user_locks")
    .select("user_id");

  if (error) throw error;
  return (data || []).map((row) => row.user_id as string);
}

async function handleMaintenanceStatus(admin: ReturnType<typeof createClient>) {
  const lockedUserIds = await getMaintenanceLockIds(admin);
  return json({
    enabled: lockedUserIds.length > 0,
    lockedCount: lockedUserIds.length,
  });
}

async function handleEnableMaintenance(admin: ReturnType<typeof createClient>, callerId: string) {
  try {
    await ensureCallerIsSuperAdmin(admin, callerId);
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    console.error("Failed to check superadmin role:", e);
    return err("Failed to validate superadmin permission", 500);
  }

  const { data: authUsers, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return err(listErr.message, 500);

  const now = new Date();
  const usersToLock = (authUsers.users || []).filter((user) => {
    if (user.id === callerId) return false;
    const banned = user.banned_until ? new Date(user.banned_until) > now : false;
    return !banned;
  });

  for (const user of usersToLock) {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      ban_duration: "876000h",
    });
    if (error) return err(`Failed to lock ${user.email || user.id}: ${error.message}`, 500);
  }

  if (usersToLock.length > 0) {
    const rows = usersToLock.map((user) => ({
      user_id: user.id,
      locked_by: callerId,
    }));
    const { error } = await admin
      .from("maintenance_user_locks")
      .upsert(rows, { onConflict: "user_id" });
    if (error) return err(`Failed to save maintenance lock state: ${error.message}`, 500);
  }

  return json({
    enabled: true,
    lockedCount: usersToLock.length,
    message: "Maintenance mode enabled",
  });
}

async function handleDisableMaintenance(admin: ReturnType<typeof createClient>, callerId: string) {
  try {
    await ensureCallerIsSuperAdmin(admin, callerId);
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    console.error("Failed to check superadmin role:", e);
    return err("Failed to validate superadmin permission", 500);
  }

  const lockedUserIds = (await getMaintenanceLockIds(admin)).filter((id) => id !== callerId);

  for (const userId of lockedUserIds) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });
    if (error) return err(`Failed to unlock ${userId}: ${error.message}`, 500);
  }

  const { error } = await admin
    .from("maintenance_user_locks")
    .delete()
    .neq("user_id", "00000000-0000-0000-0000-000000000000");
  if (error) return err(`Failed to clear maintenance lock state: ${error.message}`, 500);

  return json({
    enabled: false,
    unlockedCount: lockedUserIds.length,
    message: "Maintenance mode disabled",
  });
}

async function handleGetById(admin: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const userId = body.userId as string;
  if (!userId) return err("Missing userId");

  const { data: profile } = await admin.from("profiles").select("*").eq("id", userId).single();

  if (!profile) return err("User not found", 404);

  const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", userId).single();

  const { data: permissions } = await admin.from("user_module_permissions").select("*").eq("user_id", userId);

  const moduleAccess: Record<string, boolean> = {};
  for (const pm of permissions || []) {
    moduleAccess[pm.module_key] = pm.is_allowed;
  }

  // Get ban status
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const isBanned = authUser?.user?.banned_until ? new Date(authUser.user.banned_until) > new Date() : false;

  return json({
    user: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: roleData?.role || "leitor",
      active: !isBanned,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      moduleAccess: Object.keys(moduleAccess).length > 0 ? moduleAccess : undefined,
    },
  });
}

async function handleSeedTeamsJobTitles(admin: ReturnType<typeof createClient>) {
  const teamNames = [
    "Liderança Equipes",
    "Projetos",
    "Desenvolvimento",
    "Testes",
    "IA",
    "Dados",
    "Estrutura",
    "Suporte",
  ];

  // Insert teams
  const { data: teams, error: tErr } = await admin
    .from("teams")
    .insert(teamNames.map((name, i) => ({ name, sort_order: i + 1 })))
    .select("id, name");

  if (tErr) return err(`Failed to insert teams: ${tErr.message}`, 500);

  const teamMap = new Map<string, string>();
  for (const t of teams!) teamMap.set(t.name, t.id);

  const jobTitles: { label: string; team: string }[] = [
    { label: "Tech Lead", team: "Liderança Equipes" },
    { label: "Scrum Master", team: "Liderança Equipes" },
    { label: "Product Owner", team: "Liderança Equipes" },
    { label: "Gerente de Projetos", team: "Projetos" },
    { label: "Desenvolvedor Frontend", team: "Desenvolvimento" },
    { label: "Desenvolvedor Backend", team: "Desenvolvimento" },
    { label: "Desenvolvedor Full Stack", team: "Desenvolvimento" },
    { label: "Arquiteto de Software", team: "Desenvolvimento" },
    { label: "DevOps Engineer", team: "Estrutura" },
    { label: "QA/Tester", team: "Testes" },
    { label: "Analista de Sistemas", team: "Projetos" },
    { label: "Analista de Dados", team: "Dados" },
    { label: "DBA", team: "Dados" },
    { label: "UX Designer", team: "Projetos" },
    { label: "Analista de Suporte", team: "Suporte" },
  ];

  const rows = jobTitles.map((jt) => ({
    label: jt.label,
    team_id: teamMap.get(jt.team) || null,
  }));

  const { error: jErr } = await admin.from("job_titles").insert(rows);
  if (jErr) return err(`Failed to insert job titles: ${jErr.message}`, 500);

  return json({
    message: "Seeded successfully",
    teams: teams!.length,
    jobTitles: rows.length,
  });
}
