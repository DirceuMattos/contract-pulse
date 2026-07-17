import type { Skill, SkillType } from '@/hooks/useJobSkills';

interface SkillSupabaseClient {
  from: (table: 'skills') => {
    insert: (row: { nome: string; tipo: SkillType; origem: 'manual' }) => {
      select: (columns: string) => {
        single: () => Promise<{ data: { id: string } | null; error: unknown }>;
      };
    };
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: SkillType) => {
          single: () => Promise<{ data: { id: string } | null; error: unknown }>;
        };
      };
    };
  };
}

export async function resolveSkillIds(
  supabase: SkillSupabaseClient,
  selectedIds: Set<string>,
  localSkills: Skill[],
): Promise<string[]> {
  const final: string[] = [];
  for (const id of selectedIds) {
    if (id.startsWith('new:')) {
      const local = localSkills.find((s) => s.id === id);
      if (!local) continue;
      const { data, error } = await supabase
        .from('skills').insert({ nome: local.nome, tipo: local.tipo, origem: 'manual' }).select('id').single();
      if (error) {
        const { data: found } = await supabase
          .from('skills').select('id').eq('nome', local.nome).eq('tipo', local.tipo).single();
        if (found) final.push(found.id);
      } else if (data) final.push(data.id);
    } else {
      final.push(id);
    }
  }
  return final;
}
