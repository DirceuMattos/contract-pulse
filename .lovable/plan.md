
## Reformulação de Textos da Tela de Login

### Alterações Identificadas

Todas as mudanças são apenas de texto, em um único arquivo: `src/pages/LoginPage.tsx`.

---

### 1. Nome do Aplicativo — Painel Esquerdo (Desktop)

**Localização:** Linha 82–83 — cabeçalho do lado de branding (visível apenas em telas grandes)

**Antes:**
```
<span className="text-2xl font-bold text-white">BNP</span>
<span className="text-2xl font-semibold text-emerald-400">ContractPulse</span>
```

**Depois:**
```
<span className="text-2xl font-bold text-white">BNPContract</span>
<span className="text-2xl font-semibold text-emerald-400">Core</span>
```

---

### 2. Título Principal — Painel Esquerdo (Desktop)

**Localização:** Linhas 91–97 — o `<h1>` de destaque do lado de branding

**Antes:**
```
Margem Operacional
<br />
<span className="text-emerald-400">e Resultados Financeiros</span>
<br />
dos seus contratos
```

**Depois:**
```
Squads, Contratos,
<br />
<span className="text-emerald-400">Resultados Financeiros</span>
```

---

### 3. Nome do Aplicativo — Versão Mobile

**Localização:** Linhas 131–132 — logotipo exibido no topo do formulário em telas pequenas

**Antes:**
```
<span className="text-xl font-bold text-foreground">BNP</span>
<span className="text-xl font-semibold text-accent">Contratos</span>
```

**Depois:**
```
<span className="text-xl font-bold text-foreground">BNPContract</span>
<span className="text-xl font-semibold text-accent">Core</span>
```

---

### Resumo Técnico

| Local | Arquivo | Linhas |
|---|---|---|
| Nome app (desktop) | `src/pages/LoginPage.tsx` | 82–83 |
| Título principal (desktop) | `src/pages/LoginPage.tsx` | 91–97 |
| Nome app (mobile) | `src/pages/LoginPage.tsx` | 131–132 |

Nenhuma outra dependência ou arquivo precisa ser alterado. A lógica de autenticação e todos os componentes permanecem intactos.
