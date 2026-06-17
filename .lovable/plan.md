# Auto-preenchimento de contrato via upload de documento

Sim, é totalmente possível. O sistema já faz exatamente isso no módulo de Simulações (edge function `simulation-parse-document` usando Gemini multimodal via Lovable AI Gateway). Vamos replicar o padrão para o cadastro de contratos.

## Fluxo proposto

Na tela **Novo Contrato**, antes (e durante) o preenchimento manual:

1. Bloco "Preencher a partir de documento" no topo do formulário, com área de upload (drag-and-drop + botão). Aceita PDF, DOCX, imagens (JPG/PNG).
2. Após o upload, botão "Analisar e preencher" envia o arquivo para uma nova edge function `contract-parse-document`.
3. Estado de loading com mensagens de progresso ("Lendo documento...", "Extraindo informações...").
4. Quando a IA responde, os campos identificados são pré-preenchidos no formulário, com cada campo recebendo um badge "✨ Sugerido pela IA" (cor sutil) até que o usuário interaja.
5. O usuário revisa, completa o que faltou, e salva normalmente. Nenhum campo é gravado sem ação explícita de "Salvar".
6. O arquivo enviado pode opcionalmente ser anexado ao contrato após salvar (em `document_attachments`), aproveitando o upload já feito — pergunta no final do fluxo.

## Campos que a IA tentará extrair

Apenas campos presentes hoje no `ContractForm` — não vamos criar campos novos. Cobertura por seção:

- **Identificação**: nome, cliente (match por nome/CNPJ na lista existente), tipo, segmento, objeto.
- **Vigência**: data início, data fim, prazo, renovação automática (sim/não), aviso prévio.
- **Financeiro**: valor mensal de referência, índice de reajuste, periodicidade de reajuste, forma de pagamento, dia de vencimento.
- **Governança**: gestor pelo cliente, contato (e-mail/telefone), gestor interno (match por nome se possível).
- **Cláusulas relevantes**: multa rescisória, SLA, garantias — preenchendo campos texto correspondentes quando existirem.

Campos não identificados ficam vazios. A IA **nunca** sobrescreve valor já digitado pelo usuário (merge não-destrutivo).

## Mudanças técnicas

1. **Edge function nova** `supabase/functions/contract-parse-document/index.ts`
  - Modelada em `simulation-parse-document`.
  - Recebe `{ fileBase64, mimeType, fileName }`.
  - Chama Lovable AI Gateway (`google/gemini-2.5-flash`) com prompt instruindo a retornar JSON estrito no shape dos campos do contrato (schema validado com Zod).
  - Passa também a lista de clientes existentes (id + nome + CNPJ) para que a IA possa sugerir `clientId` quando reconhecer o cliente; caso contrário retorna só o nome detectado.
  - Retorna `{ fields: {...}, confidence: {...}, notes: string[] }`.
2. **Frontend**
  - Novo componente `src/components/forms/ContractDocumentImport.tsx` (upload + chamada à function + estado).
  - Integração no topo do `ContractForm.tsx` (apenas no modo "novo contrato", não na edição).
  - Função `applyAiSuggestions(fields)` que faz merge não-destrutivo no form state e marca campos como "sugeridos".
  - Pequeno indicador visual (`Sparkles` icon + tooltip) por campo sugerido, removido ao primeiro `onChange` do usuário.
3. **Sem mudanças no banco** — nada de novas tabelas/colunas. O contrato continua sendo criado pelo fluxo atual de `ContractFormPage`.

## Custos e limites

- Lovable AI Gateway com Gemini Flash já está em uso no projeto (mesma `LOVABLE_API_KEY`), sem novo secret.
- Limite prático: arquivos até ~15MB; PDFs grandes (>50 páginas) podem ser truncados pelo modelo — exibimos aviso amigável.
- Tempo típico esperado: 5–15 s por documento.

## Fora de escopo (para não inflar a entrega)

- Não vamos extrair recursos/squads do contrato automaticamente nesta primeira versão.
- Não vamos criar cliente novo automaticamente — se a IA não casar com nenhum cliente existente, deixamos um aviso e o usuário escolhe/cria pelo fluxo normal.
- Não mexemos no ajuste visual de contraste nem no módulo de RH.  

  Não altere mais nada além do que foi solicitado aqui.

Posso seguir com a implementação?