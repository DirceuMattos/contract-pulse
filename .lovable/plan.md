## Renomear marca: BNPContractCore → BNPHub

Substituições somente de texto e atributos `alt`. Nenhuma lógica, rota, classe CSS, nome de variável/arquivo ou módulo é alterado. Itens funcionais que contêm a palavra "Contratos" (rotas, labels de navegação, KPIs, mocks, módulos de acesso) são preservados.

### Arquivos e mudanças

1. `index.html`
  - `<title>BNPContractCore - Gestão de Contratos</title>` → `BNPHub - Gestão de Contratos`
  - `meta description` "BNPContractCore - ..." → "BNPHub - ..."
  - `og:title` e `twitter:title`: `BNPContractCore` → `BNPHub`
2. `src/pages/LoginPage.tsx`
  - `alt="BNPContractCore"` (2x) → `alt="BNPHub"`
  - Texto do logo (2x): `<span>BNPContract</span><span>Core</span>` → `<span>BNP</span><span>Hub</span>`
3. `src/pages/ChangePasswordPage.tsx`
  - `alt="BNPContractCore"` → `alt="BNPHub"`
  - `<span>BNPContract</span><span>Core</span>` → `<span>BNP</span><span>Hub</span>`
4. `src/pages/ResetPasswordPage.tsx`
  - `alt="BNPContractCore"` → `alt="BNPHub"`
  - `<span>BNPContract</span><span>Core</span>` → `<span>BNP</span><span>Hub</span>`
5. `src/pages/ForgotPasswordPage.tsx`
  - `alt="BNPContractCore"` → `alt="BNPHub"`
  - `<span>BNPContract</span><span>Core</span>` → `<span>BNP</span><span>Hub</span>`
6. `src/components/layout/Sidebar.tsx`
  - `alt="BNPContractCore"` (3x) → `alt="BNPHub"`
  - Texto do logo (2x): `<span>BNP</span><span>Contratos</span>` → `<span>BNP</span><span>Hub</span>`
  - Mantém intacto o item de menu "Contratos" (rota `/contratos`).

### Não alterado

- Comentário em `src/index.css` ("BNPContratos Design System") — não aparece em tela.
- Toda label/módulo/KPI/rota com a palavra "Contratos" (Sidebar menu, Dashboard, ContractsPage, ImportExport, AILogs, etc.) — são funcionais, não a marca.
- Nomes de arquivos, componentes, variáveis, classes CSS.
- Logos (imagens) permanecem os mesmos; apenas o `alt` muda.

Não altere mais nada.