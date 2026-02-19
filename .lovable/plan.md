

## Correcoes: Campos de Data e Campos de Valor Moeda

### 1. Campos de Data -- Permitir digitacao alem do calendario

**Problema:** Atualmente os campos de data usam apenas um Popover com Calendar (ContractForm, HistoryEventForm) ou `<Input type="date">` nativo (ResourceForm, Step1Identification). O usuario so consegue selecionar pelo calendario, o que dificulta a insercao rapida.

**Solucao:** Adicionar um campo de texto com mascara `dd/MM/yyyy` ao lado do botao de calendario. O usuario podera digitar a data diretamente OU clicar no icone do calendario para abrir o Popover. Ambos os modos atualizarao o mesmo valor.

**Arquivos afetados:**
- `src/components/forms/ContractForm.tsx` -- 4 campos de data (dataInicio, dataFim, renewalBaseDate, dataBaseReajuste)
- `src/components/forms/HistoryEventForm.tsx` -- 1 campo (data do evento)
- `src/components/forms/ResourceForm.tsx` -- 2 campos (dataInicio, dataFim)
- `src/components/calculator/Step1Identification.tsx` -- 1 campo (expectedStartDate)

**Abordagem:** Criar um componente reutilizavel `DatePickerInput` que combina:
- Um Input de texto com placeholder `dd/mm/aaaa` e mascara de digitacao
- Um botao com icone de calendario que abre o Popover com Calendar
- Parsing automatico da data digitada ao sair do campo (onBlur) ou ao completar 10 caracteres
- Sincronizacao bidirecional: ao selecionar no calendario preenche o input, ao digitar atualiza o calendario

---

### 2. Campos de Valor Moeda -- Zero a frente e dificuldade de edicao

**Problema:** Campos `type="number"` com `parseFloat(value) || 0` convertem string vazia para `0`, exibindo um zero indesejado. Alem disso, o comportamento nativo de `type="number"` dificulta a edicao (scroll altera valor, setas, etc.).

**Solucao:** Nos campos de valor monetario, usar `value ?? ''` em vez de `value || ''` e tratar o onChange para nao forcar zero quando o campo esta vazio. Isso permite que o campo fique limpo ate o usuario digitar um valor.

**Arquivos afetados:**
- `src/components/forms/ContractForm.tsx` -- campos valorMensalReferencia, valorTotalContrato (ja usam `?? ''`, mas o onChange forca 0)
- `src/components/forms/ResourceForm.tsx` -- campo custoBase (onChange forca 0)
- `src/pages/SettingsPage.tsx` -- campo valorDolar (onChange forca 0)
- `src/components/calculator/Step1Identification.tsx` -- campo consultancyCost
- `src/components/calculator/Step4Resources.tsx` -- campos grossMonthly, valueMonthly

**Abordagem:** Em todos os campos monetarios:
- Manter `type="number"` para manter teclado numerico no mobile
- Mudar o `onChange` para: `field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))` (ou `0` apenas no submit)
- Usar `value={field.value ?? ''}` para exibir campo vazio quando nao ha valor

---

### Detalhes tecnicos

**Novo componente:** `src/components/ui/date-picker-input.tsx`
- Props: `value: string` (formato `yyyy-MM-dd`), `onChange: (value: string) => void`, `placeholder?`, `disabled?`
- Interno: um Input de texto + Popover com Calendar
- Usa `date-fns` para parse/format entre `dd/MM/yyyy` (display) e `yyyy-MM-dd` (valor)
- Mascara automatica: ao digitar numeros, insere `/` automaticamente

**Alteracoes nos formularios:**
- Substituir todos os blocos Popover+Calendar+Button por `<DatePickerInput>`
- Substituir `<Input type="date">` por `<DatePickerInput>`
- Nos campos monetarios, ajustar apenas o `onChange` e `value` para evitar zero indesejado

