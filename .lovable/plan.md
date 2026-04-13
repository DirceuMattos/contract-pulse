
## Revisão para tornar a análise confiável

### Causas confirmadas
- O problema não é só prompt: a extração atual do PDF está ruim. Há documentos sendo lidos como estrutura bruta do PDF (`<< /Page ... /Type/Catalog >>`) em vez do conteúdo real; a IA já recebe texto corrompido.
- A análise usa um único prompt grande com truncamento, então trechos importantes do edital/TR podem ficar fora.
- O schema atual força vários campos do questionário, então a IA acaba “chutando” quando o documento não traz a informação.
- O contexto interno usa os contratos mais recentes, e não os mais parecidos com o documento analisado.
- O wizard já nasce com defaults “médios”; quando a extração falha, esses defaults continuam e parecem resposta da IA.

### O que vou implementar
1. **Reescrever a extração de documento**
   - trocar o parser ingênuo de PDF/DOCX por uma extração robusta, com validação de qualidade do texto;
   - unificar essa lógica com o pipeline de extração já existente, para o simulador não usar uma leitura “paralela” pior.

2. **Trocar 1 análise única por análise em etapas**
   - identificação/objeto/cliente/prazos;
   - escopo, temporalidades, SLA, integrações, módulos e complexidade;
   - equipe mínima, perfis, quantidades e exigências;
   - custos adicionais, penalidades, garantias e dependências.
   Cada etapa retorna **valor + evidência textual + status encontrado/não encontrado**.

3. **Parar de preencher no chute**
   - campos do questionário e derivados passam a aceitar “não identificado / pendente de revisão” quando o documento não sustentar a resposta;
   - remover fallback automático de mercado para salários no preenchimento principal;
   - usar somente **documento + histórico interno da plataforma**. Se não houver base suficiente, o campo fica pendente.

4. **Melhorar o contexto interno**
   - escolher contratos de referência por **similaridade de objeto/perfis**, não por recência;
   - usar a tabela salarial interna apenas para cargos compatíveis;
   - separar claramente:
     - **Equipe mínima do documento**
     - **Complementos sugeridos pela plataforma** com base em contratos internos comparáveis

5. **Revisar o wizard**
   - ao aplicar a análise, limpar os defaults genéricos e preencher apenas o que foi realmente encontrado;
   - mostrar cobertura da análise: campos encontrados, pendentes e evidências;
   - no Step 4, separar equipe documentada de complementos sugeridos;
   - no Step 5, usar essa base auditável para os cenários e para a análise consultiva.

6. **Persistir a auditoria**
   - salvar notas, confiança, evidências, cobertura e referências usadas;
   - isso evita perder o racional ao salvar/reabrir a simulação.

### Arquivos e áreas a revisar
- `supabase/functions/simulation-parse-document/index.ts`
- `supabase/functions/simulation-insights/index.ts`
- `supabase/functions/doc-extract/index.ts`
- `src/pages/CalculatorWizardPage.tsx`
- `src/components/calculator/Step1Identification.tsx`
- `src/components/calculator/Step4Resources.tsx`
- `src/components/calculator/Step5Results.tsx`
- `src/types/index.ts`
- `src/lib/dbMappers.ts`
- `supabase/migrations/*`

### Resultado esperado
Depois dessa revisão, a análise deixa de depender de texto mal extraído, para de mascarar falhas com defaults silenciosos e passa a mostrar com clareza:
- o que veio do documento;
- o que veio do histórico interno;
- o que ainda exige revisão manual.

### Detalhes técnicos
- Vou tratar isso como **pipeline de extração + evidência + normalização**, não apenas como ajuste de prompt.
- A composição de equipe e os valores não sairão mais só do questionário genérico: serão ancorados no texto extraído e em contratos internos similares.
- A análise final também será revisada para não usar benchmarking genérico como fonte principal de verdade.