
# Plano: Bloco 6 -- Logs de Acesso + Auditoria de Modulos (Front-end Only)

## Resumo
Adicionar sistema de logs de acesso ao modulo de Usuarios, com captura automatica de sessoes (login/logout), rastreamento de modulos/rotas acessados e tela de visualizacao com filtros. Tudo persistido em localStorage com limite de 500 registros.

---

## 1. Novos Tipos

### Arquivo: `src/types/index.ts`

```typescript
export interface AccessLogSession {
  id: string;
  userId: string;
  userNameSnapshot: string;
  ipAddress: string;
  userAgent: string;
  startedAt: string;
  endedAt: string | null;
  modulesAccessed: string[];
  routesAccessed: string[];
  lastActivityAt: string | null;
}
```

---

## 2. Contexto de Logs de Acesso

### Novo arquivo: `src/contexts/AccessLogContext.tsx`

Responsabilidades:
- Estado `accessLogs: AccessLogSession[]` persistido em localStorage (`bnp_access_logs`)
- `currentSessionId: string | null` em estado
- Limite de 500 logs (FIFO ao exceder)
- Funcoes expostas:
  - `startSession(user)`: encerra sessao ativa anterior, cria nova com IP fake e userAgent do navigator
  - `endSession()`: seta `endedAt` na sessao atual
  - `trackNavigation(pathname)`: adiciona modulo/rota a sessao ativa, atualiza `lastActivityAt`
  - `getLogsByUser(userId)`: filtra logs por usuario
  - `clearAllLogs()`: limpa todos os logs com confirmacao
  - `getAllLogs()`: retorna todos

Posicao no provider tree: dentro de `AuthProvider` (precisa de user), mas separado. Sera filho de `AuthProvider` no `App.tsx`.

### Mapeamento de rotas para modulos:
```
/dashboard -> "Dashboard"
/clientes -> "Clientes"
/clientes/:id -> "Cliente:Detalhe"
/contratos -> "Contratos"
/contratos/:id -> "Contrato:Detalhe"
/contratos/:id/recursos -> "Contrato:Recursos"
/contratos/:id/editar -> "Contrato:Edicao"
/alertas -> "Alertas"
/usuarios -> "Usuarios"
/configuracoes -> "Configuracoes"
/importar-exportar -> "Importar/Exportar"
/integracoes -> "Integracoes"
/ajuda -> "Ajuda"
/usuarios/logs -> "Logs de Acesso"
```

---

## 3. Integracao com AuthContext

### Arquivo: `src/contexts/AuthContext.tsx`

No `login()`: apos autenticar, chamar `startSession(authUser)` (via callback ou evento)
No `logout()`: chamar `endSession()` antes de limpar user

Abordagem: AccessLogContext observa mudancas no `user` do AuthContext via useEffect. Quando user muda de null para objeto, inicia sessao. Quando muda para null, encerra.

---

## 4. Rastreamento de Navegacao

### Arquivo: `src/components/layout/MainLayout.tsx`

Adicionar useEffect observando `location.pathname`:
- Chamar `trackNavigation(location.pathname)` do AccessLogContext
- O contexto resolve o mapeamento rota->modulo internamente

### Tratamento de `beforeunload`:
No AccessLogContext, registrar listener `beforeunload` para tentar encerrar sessao ativa (best-effort).

---

## 5. Tela de Logs de Acesso

### Novo arquivo: `src/pages/AccessLogsPage.tsx`

Rota: `/usuarios/logs` (somente c-level)

Layout:
- **Topo**: Titulo "Logs de Acessos" + subtexto
- **Filtros**:
  - Usuario (select com busca, alimentado por systemUsers)
  - Periodo (date range com dois date pickers)
  - Status: Ativa / Encerrada / Todas (chips)
  - Busca textual (IP, userAgent, modulo)
- **Acoes**:
  - "Exportar CSV (Em breve)" desabilitado
  - "Limpar logs" com AlertDialog de confirmacao
- **Tabela**:
  - Usuario (nome snapshot)
  - IP
  - Inicio (formatado pt-BR)
  - Fim (formatado ou "Ativa")
  - Duracao (calculada: diferenca entre end e start, ou "Em andamento")
  - Modulos acessados (chips compactos, max 3 visiveis + "+N" tooltip)
  - Botao "Detalhes"
- **Drawer de Detalhes** (ao clicar):
  - Todas as infos da sessao
  - Lista completa de modulos
  - Lista de rotas acessadas
  - userAgent
- **Empty state**: icone + "Nenhum log encontrado"
- **Guard**: se `user.role !== 'c-level'`, mostrar tela de acesso restrito

---

## 6. Ponto de Entrada: Menu de Acoes do Usuario

### Arquivo: `src/pages/UsersPage.tsx`

No DropdownMenu de cada usuario (kebab), apos "Desativar":
- Adicionar item "Logs de acessos" com icone `FileText` ou `Activity`
- Ao clicar: navegar para `/usuarios/logs?userId={user.id}`

---

## 7. Ponto de Entrada: Sidebar

### Arquivo: `src/components/layout/Sidebar.tsx`

Nao adicionar item separado na sidebar (logs fica subordinado a Usuarios). A rota `/usuarios/logs` sera acessivel via navegacao programatica.

---

## 8. Rota no App.tsx

### Arquivo: `src/App.tsx`

Adicionar rota:
```typescript
import AccessLogsPage from "@/pages/AccessLogsPage";
// ...
<Route path="/usuarios/logs" element={<AccessLogsPage />} />
```

---

## 9. Dados Mock (Seed)

### Novo arquivo ou secao em `src/data/mockAccessLogs.ts`

Criar 25-35 sessoes mock distribuidas entre os 4 usuarios seed:
- IPs variados (192.168.x.y, 10.0.x.y)
- Sessoes com 2-8 modulos acessados
- 2 sessoes com `endedAt = null` (ativas)
- Datas distribuidas nos ultimos 30 dias
- userAgent simulado (ex: "Mozilla/5.0 Chrome/120")

---

## 10. Provider Tree

### Arquivo: `src/App.tsx`

Adicionar `AccessLogProvider` apos `AuthProvider`:
```
SystemUsersProvider > AuthProvider > AccessLogProvider > DataProvider > ...
```

---

## Arquivos Alterados/Criados

| Arquivo | Acao |
|---------|------|
| `src/types/index.ts` | Tipo AccessLogSession |
| `src/contexts/AccessLogContext.tsx` | Novo -- contexto de logs com CRUD + tracking |
| `src/data/mockAccessLogs.ts` | Novo -- seed de sessoes mock |
| `src/pages/AccessLogsPage.tsx` | Novo -- tela de logs com filtros e detalhes |
| `src/pages/UsersPage.tsx` | Item "Logs de acessos" no kebab menu |
| `src/components/layout/MainLayout.tsx` | trackNavigation no useEffect de rota |
| `src/App.tsx` | Rota /usuarios/logs + AccessLogProvider |

---

## Ordem de Implementacao

1. Tipos (`types/index.ts`)
2. Mock data (`mockAccessLogs.ts`)
3. AccessLogContext (contexto + persistencia + tracking)
4. App.tsx (provider + rota)
5. MainLayout (tracking de navegacao)
6. AccessLogsPage (tela completa)
7. UsersPage (item no kebab)
