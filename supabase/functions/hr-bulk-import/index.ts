// This seed function previously contained hardcoded employee PII (names, salaries, dates).
// All PII has been removed from version control. The function is now disabled.
// If a one-off seed is needed again, load data from a secured source (private storage,
// vault, or signed admin upload) — never commit it to source control.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(
    JSON.stringify({
      error:
        "hr-bulk-import is disabled. Hardcoded HR seed data was removed for LGPD compliance.",
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
