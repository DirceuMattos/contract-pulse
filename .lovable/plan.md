

# Ajuste de destaque nos cards do Squads

## Alteracoes

### 1. Visao "Por Projeto" (`renderContractCard`)
- **Linha 370**: Trocar `cd.clientName` por `cd.contractNome` (ou `cd.contractCodigo`) como titulo principal do card (`CardTitle`)
- **Adicionar** o nome do cliente (`cd.clientName`) como texto secundario logo abaixo do titulo
- Manter o codigo do contrato visivel

### 2. Visao "Por Recurso" (`renderResourceCard`, alocacoes internas)
- **Linha 432**: Trocar `alloc.clientName` (que esta em destaque como `font-medium`) por `alloc.contractCodigo` (nome/codigo do contrato)
- Colocar `alloc.clientName` como texto secundario (`text-muted-foreground`) abaixo ou ao lado

### Detalhes tecnicos

**Arquivo**: `src/pages/SquadsPage.tsx`

**Visao Por Projeto** (linhas 368-373):
```
Antes:  CardTitle = cd.clientName  ·  cd.contractCodigo
Depois: CardTitle = cd.contractNome (ou contractCodigo)
        Linha abaixo: cd.clientName
```

**Visao Por Recurso** (linhas 431-434, dentro das alocacoes):
```
Antes:  font-medium = alloc.clientName  ·  alloc.contractCodigo
Depois: font-medium = alloc.contractCodigo (contrato em destaque)
        muted = alloc.clientName (cliente abaixo)
```

Para a visao por recurso, sera necessario adicionar `contractNome` ao tipo `ResourceViewData.allocations` (atualmente so tem `contractCodigo` e `clientName`). O campo `contractNome` sera preenchido a partir de `cd.contractNome` no `useMemo` da linha 227.

