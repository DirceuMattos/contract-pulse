// v1 - módulo Skills de Vagas: hook de dados (queries diretas ao Supabase)
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SkillType = 'hard' | 'soft';
export type SkillOrigin = 'manual' | 'ia' | 'import';

export interface Skill {
  id: string;
  nome: string;
  tipo: SkillType;
  origem: SkillOrigin;
  descricao: string | null;
}

export interface JobSkillProfile {
  id: string;
  job_title_id: string;
  nivel: string | null;
  descricao: string | null;
  atribuicoes: string | null;
  hard_skills_desc: string | null;
  soft_skills_desc: string | null;
  anos_experiencia: number | null;
  idade_min: number | null;
  idade_max: number | null;
  is_active: boolean;
  // relação carregada à parte
  skills?: Skill[];
}

export interface ProfileWithMeta extends JobSkillProfile {
  jobTitleLabel: string;
  colabsLotados: number;
}

export function useJobSkills() {
  const [profiles, setProfiles] = useState<ProfileWithMeta[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Perfis + cargo (join) + associações de skill
      const [{ data: profs, error: e1 }, { data: sk, error: e2 }, { data: people, error: e3 }] = await Promise.all([
        supabase
          .from('job_skill_profiles')
          .select('*, job_titles(label), job_skill_profile_skills(skill_id, skills(*))')
          .order('created_at', { ascending: false }),
        supabase.from('skills').select('*').order('nome'),
        supabase.from('hr_people').select('cargo_id').eq('situacao', 'ativo'),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      // Conta colabs ativos por cargo (overdelivery)
      const countByCargo = new Map<string, number>();
      (people ?? []).forEach((p: { cargo_id: string | null }) => {
        if (p.cargo_id) countByCargo.set(p.cargo_id, (countByCargo.get(p.cargo_id) ?? 0) + 1);
      });

      const mapped: ProfileWithMeta[] = (profs ?? []).map((p: any) => ({
        id: p.id,
        job_title_id: p.job_title_id,
        nivel: p.nivel,
        descricao: p.descricao,
        atribuicoes: p.atribuicoes,
        hard_skills_desc: p.hard_skills_desc,
        soft_skills_desc: p.soft_skills_desc,
        anos_experiencia: p.anos_experiencia,
        idade_min: p.idade_min,
        idade_max: p.idade_max,
        is_active: p.is_active,
        jobTitleLabel: p.job_titles?.label ?? '—',
        colabsLotados: countByCargo.get(p.job_title_id) ?? 0,
        skills: (p.job_skill_profile_skills ?? [])
          .map((a: any) => a.skills)
          .filter(Boolean),
      }));

      setProfiles(mapped);
      setSkills((sk ?? []) as Skill[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar skills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { profiles, skills, loading, error, reload: load };
}
