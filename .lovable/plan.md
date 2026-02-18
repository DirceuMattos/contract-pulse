

# Ajuste no Menu Lateral

## Alterações

### 1. Reordenar e renomear item no Sidebar (`src/components/layout/Sidebar.tsx`)

- Mover o item "Calculadora" da posição atual (7a posição) para logo abaixo de "Dashboard" (2a posição)
- Renomear o label de **"Calculadora"** para **"Simulador de Contratos"**

Ordem final dos itens no menu:
1. Dashboard
2. **Simulador de Contratos** (era "Calculadora", estava na 6a posição)
3. Clientes
4. Contratos
5. Alertas
6. Squads
7. Usuários
8. Configurações
9. Importar/Exportar
10. Integrações
11. Ajuda

### 2. Atualizar label no catálogo de módulos (`src/types/moduleAccess.ts`)

- Alterar o `label` do módulo `CALCULATOR` de `'Calculadora'` para `'Simulador de Contratos'`
- Alterar a `description` para refletir o novo nome

---

## Detalhes técnicos

**Arquivo `src/components/layout/Sidebar.tsx`**: Reordenar o array `navItems` movendo o objeto com `path: '/calculadora'` para a segunda posição e alterando seu `label`.

**Arquivo `src/types/moduleAccess.ts`**: Atualizar o `label` e `description` do módulo `CALCULATOR` no `MODULE_CATALOG`.

Nenhuma outra alteração necessária -- as rotas, ícones e permissões permanecem iguais.

