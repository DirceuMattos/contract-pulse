Ajustar a sidebar de edição de relatório (`src/pages/ReportEditPage.tsx`) para mostrar a fonte sincronizada de cada seção.

Alteração:
- Localizar o map que renderiza os itens da sidebar (linhas ~389-409), onde cada item exibe o ícone de status, o label da seção e o badge AUTO/MANUAL.
- Logo após o nome da seção (`{meta?.label ?? s.sectionKey}`), dentro do `<span className="flex-1 truncate">`, adicionar o snippet indicando a fonte quando `meta.source` for diferente de `'manual'` e `'bnphub'`.
- O snippet deve exibir:
  - `📋 Asana` para `asana`
  - `🔥 Fireflies` para `fireflies`
  - `🎫 Milvus` para `milvus`
  - `🔷 Azure DevOps` para `azure_dev_ops`
  - o valor cru de `meta.source` para outras fontes
- Manter aplicação apenas na sidebar; nenhuma alteração no painel principal de edição.

Validação:
- Verificar se a condição usa `meta?.source` (com optional chaining) para evitar erro caso `meta` seja undefined.
- Garantir que o texto adicionado fique visualmente como subtítulo pequeno, em itálico e com cor `text-muted-foreground`, conforme snippet fornecido.