
-- 1) ai-exports UPDATE policy (c-level only)
DROP POLICY IF EXISTS ai_exports_update ON storage.objects;
CREATE POLICY ai_exports_update ON storage.objects FOR UPDATE TO authenticated
USING ((bucket_id = 'ai-exports') AND has_role(auth.uid(), 'c-level'::app_role))
WITH CHECK ((bucket_id = 'ai-exports') AND has_role(auth.uid(), 'c-level'::app_role));

-- 2) Convert client-callable RPCs to SECURITY INVOKER (rely on underlying RLS)
CREATE OR REPLACE FUNCTION public.get_transport_years()
 RETURNS TABLE(year integer)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT year
  FROM transport_rides
  WHERE year IS NOT NULL
  ORDER BY year DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_transport_yearly_totals()
 RETURNS TABLE(year integer, month integer, total numeric)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT year, month, SUM(value) as total
  FROM transport_rides
  WHERE year IS NOT NULL AND month IS NOT NULL
  GROUP BY year, month
  ORDER BY year, month;
$function$;

CREATE OR REPLACE FUNCTION public.get_doc_extractions_status()
 RETURNS TABLE(id uuid, document_id uuid, owner_type text, owner_id uuid, status text, extracted_at timestamp with time zone, error_message text)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT id, document_id, owner_type, owner_id, status, extracted_at, error_message
  FROM public.doc_text_extractions;
$function$;

-- 3) Trigger-only function: not user-callable
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 4) RLS helpers: restrict EXECUTE; RLS evaluation uses them via the planner under the table-owner context.
--    Keep accessible to service_role and the postgres owner. Authenticated retains EXECUTE because
--    PostgreSQL evaluates policy functions in the caller's privilege context.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_clevel() FROM PUBLIC, anon;
