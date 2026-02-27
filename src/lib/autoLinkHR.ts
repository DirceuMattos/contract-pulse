import { supabase } from '@/integrations/supabase/client';

/**
 * Auto-link a CLT/PJ resource to HR Master by exact name match (case-insensitive).
 * Returns the hr_person_id if found, undefined otherwise.
 */
export async function autoLinkHRPerson(
  nome: string,
  tipo: string,
  existingHrPersonId?: string,
): Promise<string | undefined> {
  // Already linked or not a human resource
  if (existingHrPersonId || (tipo !== 'clt' && tipo !== 'pj')) {
    return existingHrPersonId;
  }

  const trimmedName = nome.trim();
  if (!trimmedName) return undefined;

  const { data } = await supabase
    .from('hr_people')
    .select('id')
    .eq('situacao', 'ativo')
    .ilike('nome', trimmedName)
    .limit(1)
    .maybeSingle();

  return data?.id ?? undefined;
}
