import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, RotateCcw, Lightbulb } from 'lucide-react';
import { generateSuggestedResources, getAppliedRules } from '@/lib/simulationEngine';
import { useData } from '@/contexts/DataContext';
import type { ContractSimulation, SimulationHRItem, SimulationOtherCost, SimulationOverhead } from '@/types';

interface Props {
  data: ContractSimulation;
  onChange: (updates: Partial<ContractSimulation>) => void;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function Step4Resources({ data, onChange }: Props) {
  const [showSuggestion] = useState(true);
  const { settings } = useData();
  const chargesCLT = settings.percentualEncargosCLT;
  const chargesPJ = settings.percentualImpostosPJ;

  const hr = data.usingSuggested ? data.suggestedHR : data.customHR;
  const oc = data.usingSuggested ? data.suggestedOtherCosts : data.customOtherCosts;
  const oh = data.usingSuggested ? data.suggestedOverhead : data.customOverhead;

  const rules = getAppliedRules(data.questionnaire, data.complexityLevel);

  const resetToSuggested = () => {
    const suggested = generateSuggestedResources(data.questionnaire, data.complexityLevel, chargesCLT, chargesPJ);
    onChange({
      usingSuggested: true,
      suggestedHR: suggested.hr,
      suggestedOtherCosts: suggested.otherCosts,
      suggestedOverhead: suggested.overhead,
    });
  };

  const getSourceHR = (): SimulationHRItem[] =>
    JSON.parse(JSON.stringify(data.usingSuggested ? data.suggestedHR : data.customHR));

  const getSourceOC = (): SimulationOtherCost[] =>
    JSON.parse(JSON.stringify(data.usingSuggested ? data.suggestedOtherCosts : data.customOtherCosts));

  const getSourceOH = (): SimulationOverhead =>
    data.usingSuggested ? { ...data.suggestedOverhead } : { ...data.customOverhead };

  const updateHR = (id: string, field: keyof SimulationHRItem, value: unknown) => {
    const list = getSourceHR();
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], [field]: value };
      if (field === 'hiringType') {
        list[idx].chargesPercent = value === 'pj' ? chargesPJ : chargesCLT;
      }
    }
    onChange({ customHR: list, usingSuggested: false });
  };

  const addHR = () => {
    const list = getSourceHR();
    list.push({ id: `hr-${Date.now()}`, role: 'Novo recurso', hiringType: 'clt', quantity: 1, grossMonthly: 10000, chargesPercent: chargesCLT });
    onChange({ customHR: list, usingSuggested: false });
  };

  const removeHR = (id: string) => {
    const list = getSourceHR().filter(i => i.id !== id);
    onChange({ customHR: list, usingSuggested: false });
  };

  const updateOC = (id: string, field: keyof SimulationOtherCost, value: unknown) => {
    const list = getSourceOC();
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) list[idx] = { ...list[idx], [field]: value };
    onChange({ customOtherCosts: list, usingSuggested: false });
  };

  const addOC = () => {
    const list = getSourceOC();
    list.push({ id: `oc-${Date.now()}`, category: 'Outros', description: 'Novo custo', valueMonthly: 0 });
    onChange({ customOtherCosts: list, usingSuggested: false });
  };

  const removeOC = (id: string) => {
    const list = getSourceOC().filter(i => i.id !== id);
    onChange({ customOtherCosts: list, usingSuggested: false });
  };

  const updateOverhead = (field: keyof SimulationOverhead, value: number) => {
    const current = getSourceOH();
    current[field] = value;
    onChange({ customOverhead: current, usingSuggested: false });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Estrutura de Recursos</h3>
          <p className="text-sm text-muted-foreground">
            {data.usingSuggested ? 'Exibindo sugestão automática. Edite para personalizar.' : 'Recursos personalizados.'}
          </p>
        </div>
        <div className="flex gap-2">
          {!data.usingSuggested && (
            <Button variant="outline" size="sm" onClick={resetToSuggested}>
              <RotateCcw className="w-4 h-4 mr-1" /> Resetar
            </Button>
          )}
        </div>
      </div>

      {showSuggestion && (
        <Accordion type="single" collapsible>
          <AccordionItem value="rules">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" /> Como foi calculado</span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {rules.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* RH Table */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground">Recursos Humanos</h4>
          <Button variant="outline" size="sm" onClick={addHR}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Função</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-20">Qtd</TableHead>
                <TableHead>Salário bruto</TableHead>
                <TableHead className="w-20">Encargos%</TableHead>
                <TableHead className="w-28">Custo total</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hr.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Input className="h-8 text-sm" value={item.role} onChange={e => updateHR(item.id, 'role', e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Select value={item.hiringType} onValueChange={v => updateHR(item.id, 'hiringType', v)}>
                      <SelectTrigger className="h-8 text-sm w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clt">CLT</SelectItem>
                        <SelectItem value="pj">PJ</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 text-sm" type="number" step={0.1} min={0} value={item.quantity} onChange={e => updateHR(item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 text-sm" type="number" step={500} min={0} value={item.grossMonthly ?? ''} onChange={e => updateHR(item.id, 'grossMonthly', e.target.value === '' ? 0 : parseFloat(e.target.value))} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 text-sm" type="number" min={0} max={200} value={item.chargesPercent} onChange={e => updateHR(item.id, 'chargesPercent', parseFloat(e.target.value) || 0)} />
                  </TableCell>
                  <TableCell className="text-sm font-medium text-foreground">
                    {formatCurrency((item.quantity || 0) * (item.grossMonthly || 0) * (1 + (item.chargesPercent || 0) / 100))}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeHR(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Other costs */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground">Outros Custos</h4>
          <Button variant="outline" size="sm" onClick={addOC}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor mensal</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.consultancyCost ?? 0) > 0 && (
                <TableRow className="bg-muted/50">
                  <TableCell className="text-sm text-muted-foreground">Consultoria Comercial</TableCell>
                  <TableCell className="text-sm text-muted-foreground">Custo informado no Passo 1</TableCell>
                  <TableCell className="text-sm font-medium text-muted-foreground">{formatCurrency(data.consultancyCost!)}</TableCell>
                  <TableCell />
                </TableRow>
              )}
              {oc.map(item => (
                <TableRow key={item.id}>
                  <TableCell><Input className="h-8 text-sm" value={item.category} onChange={e => updateOC(item.id, 'category', e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 text-sm" value={item.description} onChange={e => updateOC(item.id, 'description', e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 text-sm" type="number" step={500} min={0} value={item.valueMonthly ?? ''} onChange={e => updateOC(item.id, 'valueMonthly', e.target.value === '' ? 0 : parseFloat(e.target.value))} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeOC(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Overhead */}
      <Card className="p-4 space-y-3">
        <h4 className="font-medium text-foreground">Overhead (%)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Infraestrutura</Label>
            <Input type="number" min={0} max={100} step={0.5} value={oh.infraPercent} onChange={e => updateOverhead('infraPercent', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Administrativo</Label>
            <Input type="number" min={0} max={100} step={0.5} value={oh.adminPercent} onChange={e => updateOverhead('adminPercent', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Governança</Label>
            <Input type="number" min={0} max={100} step={0.5} value={oh.governancePercent} onChange={e => updateOverhead('governancePercent', parseFloat(e.target.value) || 0)} />
          </div>
        </div>
      </Card>
    </div>
  );
}
