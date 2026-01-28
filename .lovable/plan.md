
# Plano: Cards de Clientes com Cores Diferentes

## Objetivo
Adicionar uma paleta de cores rotativas aos cards de clientes na página `/clientes`, criando distinção visual entre cada card para melhor identificação e organização.

---

## Abordagem

Criar um array de cores que será aplicado ciclicamente a cada card com base no índice. As cores serão aplicadas como uma borda lateral colorida (estilo "accent bar") no lado esquerdo do card.

---

## Paleta de Cores Proposta

| Cor | Código | Uso |
|-----|--------|-----|
| Azul | `#3B82F6` | Card 1, 7, 13... |
| Verde | `#10B981` | Card 2, 8, 14... |
| Roxo | `#8B5CF6` | Card 3, 9, 15... |
| Laranja | `#F59E0B` | Card 4, 10, 16... |
| Rosa | `#EC4899` | Card 5, 11, 17... |
| Ciano | `#06B6D4` | Card 6, 12, 18... |

---

## Alterações Técnicas

### Arquivo: `src/pages/ClientsPage.tsx`

#### 1. Adicionar array de cores (após linha 62)
```tsx
const cardColors = [
  'border-l-blue-500',
  'border-l-emerald-500',
  'border-l-violet-500',
  'border-l-amber-500',
  'border-l-pink-500',
  'border-l-cyan-500',
];
```

#### 2. Modificar o Card (linha 162)
```tsx
// Antes:
<Card className="card-elevated hover:shadow-md transition-shadow">

// Depois:
<Card className={cn(
  "card-elevated hover:shadow-md transition-shadow border-l-4",
  cardColors[index % cardColors.length]
)}>
```

#### 3. Atualizar o map para incluir index (linha 157)
```tsx
// Antes:
{filteredClients.map((client) => {

// Depois:
{filteredClients.map((client, index) => {
```

---

## Resultado Visual

```text
+----+----------------------------+
|    |  Nome do Cliente           |
| C  |  CNPJ: XX.XXX.XXX/0001-XX  |
| O  |  -------------------------  |
| R  |  📍 Cidade, UF             |
|    |  📧 email@cliente.com      |
|    |  📞 (XX) XXXXX-XXXX        |
+----+----------------------------+
```

Cada card terá uma borda colorida de 4px à esquerda, rotacionando entre 6 cores diferentes.

---

## Arquivos Alterados
- `src/pages/ClientsPage.tsx` - Adicionar lógica de cores rotativas

---

## Benefícios
- Distinção visual clara entre clientes
- Facilita identificação rápida durante scroll
- Mantém design profissional com cores harmônicas
- Cores compatíveis com modo claro e escuro (Tailwind)
