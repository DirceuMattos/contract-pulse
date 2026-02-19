

## Busca automatica de endereco pelo CEP

### O que muda
Ao digitar um CEP valido (8 digitos) no formulario de cliente, o sistema consultara a API publica ViaCEP e preenchera automaticamente os campos: logradouro, bairro, cidade e UF.

### Como funciona
- Quando o usuario terminar de digitar o CEP (8 digitos numericos), uma requisicao sera feita a `https://viacep.com.br/ws/{cep}/json/`
- Se o CEP for encontrado, os campos de endereco serao preenchidos automaticamente
- Se o CEP nao for encontrado ou houver erro, um toast informara o usuario
- O usuario ainda podera editar manualmente os campos preenchidos

### Detalhes tecnicos

**Arquivo alterado:** `src/components/forms/ClientForm.tsx`

1. Criar uma funcao `fetchAddressByCep` que:
   - Remove caracteres nao numericos do CEP
   - Valida se tem 8 digitos
   - Faz `fetch` para `https://viacep.com.br/ws/{cep}/json/`
   - Retorna os dados ou null em caso de erro

2. Adicionar um `useEffect` ou handler `onBlur` no campo CEP que:
   - Dispara a busca quando o CEP tiver 8 digitos
   - Preenche via `form.setValue()` os campos: logradouro, bairro, cidade e UF
   - Exibe toast de erro se o CEP nao for encontrado

3. Adicionar um estado `isFetchingCep` para mostrar feedback visual (loading) no campo CEP durante a busca

**Nenhuma dependencia adicional** -- usa apenas `fetch` nativo e a API publica gratuita ViaCEP.

**Nenhuma alteracao no banco de dados.**

