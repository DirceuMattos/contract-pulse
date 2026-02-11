

# Plano: Bloco 4 -- Documentos/Anexos com Upload, IndexedDB e Acoes

## Resumo
Adicionar aba "Documentos" no detalhe do contrato com upload de arquivos (PDF, Office) ate 10MB, armazenamento de Blobs em IndexedDB, metadados em localStorage, preview de PDF, download, impressao, acoes simuladas de e-mail/compartilhar, e configuracao de tipos de documento.

---

## 1. Novos Tipos

### Arquivo: `src/types/index.ts`

```typescript
export type DocumentDescriptionType = 
  | 'contrato' | 'aditivo' | 'reajuste' | 'notificacao' 
  | 'multa-penalidade' | 'ata-reuniao' | 'proposta-comercial' | 'outro';

export interface DocumentAttachment {
  id: string;
  contractId: string;
  fileName: string;
  fileSizeBytes: number;
  fileTypeMime: string;
  fileExtension: string;
  descriptionType: string; // vinculado a AttachmentDescriptionConfig
  descriptionText?: string; // quando "Outro"
  notes?: string;
  uploadedAt: string;
  uploadedByUserId?: string;
  storageKey: string; // chave IndexedDB
}

export interface AttachmentDescriptionConfig {
  id: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}
```

---

## 2. IndexedDB Helper

### Novo arquivo: `src/lib/indexedDBStorage.ts`

Utilitario para gerenciar Blobs em IndexedDB:

- `openDB()`: abre/cria database `contratovivo_files`, object store `attachments`
- `saveBlob(storageKey: string, blob: Blob): Promise<void>`
- `getBlob(storageKey: string): Promise<Blob | null>`
- `deleteBlob(storageKey: string): Promise<void>`
- `clearAllBlobs(): Promise<void>` (para resetToDemo)
- Tratamento de erro com fallback (retorna null e loga erro)

---

## 3. DataContext -- Attachments CRUD

### Arquivo: `src/contexts/DataContext.tsx`

- Novo estado `attachments: DocumentAttachment[]` com persistencia localStorage (`bnp_attachments`)
- Novo estado `attachmentDescriptionConfigs: AttachmentDescriptionConfig[]` com persistencia localStorage (`bnp_attachment_configs`)
- Seed inicial dos configs: Contrato, Aditivo, Reajuste, Notificacao, Multa/Penalidade, Ata/Reuniao, Proposta/Comercial, Outros
- Funcoes expostas:
  - `addAttachment(metadata)` -- salva metadados (o Blob e salvo separadamente pelo componente via IndexedDB helper)
  - `deleteAttachment(id)` -- remove metadados + chama deleteBlob
  - `getAttachmentsByContract(contractId)`
  - `addDescriptionConfig`, `updateDescriptionConfig`, `getActiveDescriptionConfigs`
- No `deleteContract`: cascade para attachments (metadados + blobs)
- No `resetToDemo`: limpar attachments + clearAllBlobs

---

## 4. Formulario de Upload

### Novo arquivo: `src/components/contracts/AttachmentUploadDialog.tsx`

Dialog com campos:
- Tipo/Descricao do documento (select, alimentado por configs ativos, obrigatorio)
- Se "Outro": campo descricao livre (obrigatorio)
- Observacoes (textarea, opcional)
- File input (obrigatorio) com drag-and-drop area
- Checkbox "Criar evento no historico" (default false)

Validacoes:
- Tamanho maximo: 10MB
- Tipos permitidos: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX
- Validacao por extensao + MIME (fallback por extensao se MIME generico)

Ao salvar:
1. Gerar `id` e `storageKey`
2. Salvar Blob em IndexedDB via helper
3. Salvar metadados via DataContext
4. Se checkbox historico marcado: criar HistoryEvent automaticamente
5. Toast de sucesso + fechar dialog

---

## 5. Aba "Documentos" no Detalhe do Contrato

### Novo arquivo: `src/components/contracts/ContractDocumentsTab.tsx`

Layout:
- **Topo**: Titulo "Documentos do contrato" + subtexto
- **Acoes**: "Anexar documento" (canEdit) + "Gerenciar tipos" (c-level)
- **Filtros**: Busca por nome/descricao + chips de tipo + chips de extensao
- **Tabela** com colunas:
  - Tipo/Descricao (badge)
  - Nome do arquivo
  - Tamanho (formatado KB/MB)
  - Data de upload
  - Usuario (simulado)
  - Acoes (menu kebab): Visualizar, Baixar, Imprimir, Enviar e-mail, Compartilhar, Excluir

**Ordenacao**: mais recente primeiro

**Empty state**: icone, titulo "Nenhum documento anexado", CTA "Anexar documento"

### Arquivo: `src/pages/ContractDetailPage.tsx`

Adicionar nova aba "Documentos" apos "Historico":
```
<TabsTrigger value="documentos">Documentos</TabsTrigger>
```

---

## 6. Acoes dos Anexos

Implementadas dentro de `ContractDocumentsTab.tsx` ou em um componente auxiliar:

### 6.1 Visualizar
- **PDF**: abre Dialog com `<iframe src={objectURL} />` para preview inline
- **Office**: Dialog informando "Pre-visualizacao disponivel apenas para PDF nesta etapa" + botao "Baixar arquivo"

### 6.2 Baixar
- Recupera Blob do IndexedDB
- Cria object URL + link temporario com `download` attribute
- Toast "Download iniciado"

### 6.3 Imprimir
- **PDF**: abre iframe em nova janela e chama `print()`
- **Outros**: toast "Impressao disponivel apenas para PDF nesta etapa"

### 6.4 Enviar por e-mail (simulado)
- Abre `mailto:` com subject `[ContratoVivo] Documento do contrato {codigo}` e body com dados do contrato + "Anexo deve ser incluido manualmente"
- Toast "Rascunho de e-mail aberto. Anexe o arquivo manualmente."

### 6.5 Compartilhar
- Se Web Share API disponivel: `navigator.share({ title, text })`
- Fallback: copiar para clipboard "Contrato {codigo} -- Documento: {fileName}"
- Toast "Copiado para a area de transferencia"

### 6.6 Excluir (canEdit)
- AlertDialog de confirmacao
- Remove metadados + Blob do IndexedDB
- Toast de sucesso

---

## 7. Gerenciador de Tipos de Documento

### Novo arquivo: `src/components/contracts/AttachmentConfigDialog.tsx`

Dialog acessivel pelo botao "Gerenciar tipos" (c-level):
- Lista de tipos com toggle ativo/inativo
- Adicionar novo tipo (input + botao)
- Reordenar com setas cima/baixo
- Persistido em localStorage via DataContext

---

## 8. PDF Viewer

### Novo arquivo: `src/components/contracts/PDFViewerDialog.tsx`

Dialog de tela quase cheia:
- `<iframe>` com object URL do Blob
- Botoes: Imprimir, Baixar, Fechar
- Loading skeleton enquanto recupera Blob do IndexedDB

---

## 9. Dados Mock

### Arquivo: `src/data/mockData.ts`

- Adicionar `defaultAttachmentConfigs: AttachmentDescriptionConfig[]` com os 8 tipos iniciais
- Adicionar `mockAttachments: DocumentAttachment[]` com metadados de 2-4 anexos para 5 contratos (sem Blob real no seed -- apenas metadados para visualizacao da lista)
- Os metadados mock terao `storageKey` prefixado com `mock-` para que o sistema saiba que nao ha Blob real e mostre mensagem adequada

---

## 10. UX: Estados e Erros

- **Loading**: Skeleton ao carregar lista e ao recuperar Blob
- **Erro IndexedDB**: Banner informativo "Armazenamento local indisponivel neste navegador"
- **Blob nao encontrado** (ex: mock ou dado corrompido): Toast "Arquivo nao disponivel no armazenamento local" + opcao de remover metadado orfao
- **Tooltips** em todos os botoes de acao

---

## Arquivos Alterados/Criados

| Arquivo | Acao |
|---------|------|
| `src/types/index.ts` | Novos tipos DocumentAttachment, AttachmentDescriptionConfig |
| `src/lib/indexedDBStorage.ts` | Novo -- helper IndexedDB |
| `src/contexts/DataContext.tsx` | CRUD attachments + configs + cascade |
| `src/components/contracts/AttachmentUploadDialog.tsx` | Novo -- formulario de upload |
| `src/components/contracts/ContractDocumentsTab.tsx` | Novo -- aba de documentos |
| `src/components/contracts/AttachmentConfigDialog.tsx` | Novo -- gerenciador de tipos |
| `src/components/contracts/PDFViewerDialog.tsx` | Novo -- viewer de PDF |
| `src/pages/ContractDetailPage.tsx` | Adicionar aba "Documentos" |
| `src/data/mockData.ts` | Mock attachments + configs |

---

## Ordem de Implementacao

1. Tipos (`types/index.ts`)
2. IndexedDB helper (`lib/indexedDBStorage.ts`)
3. Mock data (`mockData.ts`)
4. DataContext (CRUD attachments + configs)
5. AttachmentUploadDialog (formulario)
6. PDFViewerDialog (viewer)
7. AttachmentConfigDialog (gerenciador de tipos)
8. ContractDocumentsTab (aba completa com acoes)
9. ContractDetailPage (nova aba)

