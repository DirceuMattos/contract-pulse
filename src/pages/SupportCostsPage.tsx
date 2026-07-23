import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  DatabaseZap,
  Filter,
  FileSpreadsheet,
  Link2,
  Loader2,
  RotateCcw,
  Shield,
  Ticket,
  TimerReset,
  UsersRound,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useHR } from '@/contexts/HRContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/calculations';

const PJ_MONTHLY_HOURS = 168;
const CLT_MONTHLY_HOURS = 200;
const chartColors = ['#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];

type SupportCostRecord = {
  id: string;
  clientName: string;
  projectName: string;
  analystName: string;
  hours: number;
  date?: string;
  raw?: Record<string, unknown>;
};

type EnrichedSupportCostRecord = SupportCostRecord & {
  matchedClient?: { id: string; nomeFantasia?: string; razaoSocial: string };
  matchedContract?: { id: string; nome: string; clientId: string };
  estimatedCost: number;
  technicianMonthlyCost: number;
  technicianHourlyCost: number;
  technicianCostMatched: boolean;
  reconciliationStatus: 'conciliado' | 'pendente';
};

type ClientReportGroup = {
  clientName: string;
  hours: number;
  cost: number;
  records: EnrichedSupportCostRecord[];
};

type TechnicianCostGroup = {
  name: string;
  monthlyCost: number | null;
  hourlyCost: number;
  tickets: number;
  hours: number;
  cost: number;
  matched: boolean;
};

type MonthlyCostGroup = {
  monthKey: string;
  label: string;
  tickets: number;
  hours: number;
  cost: number;
};

type SupportCostsSyncResponse = {
  success?: boolean;
  count?: number;
  records?: SupportCostRecord[];
  error?: string;
  functionVersion?: string;
  rawShape?: {
    type?: string;
    rowsDetected?: number;
    recordsDetected?: number;
  };
  diagnostics?: {
    rowsDetected?: number;
    rowsWithoutHours?: number;
    recordsDetected?: number;
    sampleKeys?: string[][];
    rawShape?: unknown;
    monthDiagnostics?: Array<{
      month?: string;
      source?: string;
      rowsDetected?: number;
      recordsDetected?: number;
      totalHours?: number;
    }>;
  };
};

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function monthToDateRange(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  if (!year || !monthIndex) return null;

  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function dateToMonth(date: string) {
  return date.slice(0, 7);
}

function formatDateParts(year: number, month: number, day: number): string | null {
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseRecordDate(value: string | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    const usDate = formatDateParts(year, first, second);
    const brDate = formatDateParts(year, second, first);

    if (first > 12) return brDate;
    if (second > 12) return usDate;
    return usDate || brDate;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function isRecordInSelectedPeriod(record: SupportCostRecord, dateFrom: string, dateTo: string) {
  const recordDate = parseRecordDate(record.date);
  return Boolean(recordDate && recordDate >= dateFrom && recordDate <= dateTo);
}

function normalizeText(value: string | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isStrongNameMatch(leftValue: string | undefined, rightValue: string | undefined) {
  const left = normalizeText(leftValue);
  const right = normalizeText(rightValue);
  return Boolean(left && right && left === right);
}

function formatHours(value: number) {
  return `${value.toFixed(1)}h`;
}

function formatDurationFromMinutes(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'N/I';
  if (value < 60) return `${Math.round(value)} min`;
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return minutes > 0 ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours} h`;
}

function formatShortCurrency(value: number) {
  if (Math.abs(value) >= 1000000) return `R$ ${(value / 1000000).toFixed(1)} mi`;
  if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(0)} mil`;
  return formatCurrency(value);
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
}

function countMonthsInRange(dateFrom: string, dateTo: string) {
  const [fromYear, fromMonth] = dateFrom.slice(0, 7).split('-').map(Number);
  const [toYear, toMonth] = dateTo.slice(0, 7).split('-').map(Number);
  if (!fromYear || !fromMonth || !toYear || !toMonth) return 1;
  return Math.max(1, (toYear - fromYear) * 12 + toMonth - fromMonth + 1);
}

function parseMilvusDateTime(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim();
  const isoLike = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const parsed = new Date(isoLike);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function minutesBetween(start: unknown, end: unknown) {
  const startTime = parseMilvusDateTime(start);
  const endTime = parseMilvusDateTime(end);
  if (startTime === null || endTime === null || endTime < startTime) return null;
  return (endTime - startTime) / 60000;
}

function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function formatMilvusValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getMilvusEntries(record: EnrichedSupportCostRecord | null) {
  if (!record?.raw) return [];
  return Object.entries(record.raw)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .sort(([left], [right]) => left.localeCompare(right, 'pt-BR'));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getFunctionErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || '');
  if (raw.toLowerCase().includes('failed to send a request')) {
    return 'Não foi possível chamar a Edge Function support-costs-sync. Verifique se ela já foi deployada no Supabase/Lovable.';
  }
  return raw || 'Erro ao sincronizar Milvus.';
}

function getZeroImportDiagnosticMessage(payload: SupportCostsSyncResponse) {
  const diagnostics = payload.diagnostics;
  const functionVersion = payload.functionVersion || 'versão não informada';
  const rawShape = payload.rawShape;

  if (!diagnostics) {
    return [
      '0 registros importados.',
      `Versão da função: ${functionVersion}.`,
      `Retorno bruto: ${rawShape?.type || 'não informado'} / linhas: ${rawShape?.rowsDetected ?? 'n/i'}.`,
      'A função respondeu sem diagnóstico completo; isso indica função antiga ou deploy incompleto da Edge Function.',
    ].join(' ');
  }

  const firstKeys = diagnostics.sampleKeys?.[0]?.join(', ') || 'nenhuma chave detectada';
  const monthSummary = diagnostics.monthDiagnostics?.length
    ? ' Meses: ' + diagnostics.monthDiagnostics
      .map((month) => `${month.month || 'n/i'} ${month.source || 'fonte n/i'}: ${month.recordsDetected ?? 0} reg. / ${month.totalHours ?? 0}h`)
      .join('; ') + '.'
    : '';
  return [
    '0 registros importados.',
    `Versão da função: ${functionVersion}.`,
    `Linhas brutas detectadas: ${diagnostics.rowsDetected ?? 0}.`,
    `Linhas sem horas reconhecidas: ${diagnostics.rowsWithoutHours ?? 0}.`,
    `Campos do primeiro item: ${firstKeys}.`,
    monthSummary,
  ].join(' ');
}

function calculateSupportMonthlyCost(person: { tipoVinculo: string; remuneracaoMensal: number }, settings: { percentualEncargosCLT: number; percentualImpostosPJ: number }) {
  const base = person.remuneracaoMensal || 0;
  const percentual = person.tipoVinculo === 'clt'
    ? settings.percentualEncargosCLT
    : person.tipoVinculo === 'pj'
      ? settings.percentualImpostosPJ
      : 0;
  return base + (base * percentual / 100);
}

function getMonthlyHoursByLinkType(tipoVinculo: string) {
  return tipoVinculo === 'clt' ? CLT_MONTHLY_HOURS : PJ_MONTHLY_HOURS;
}

function KpiCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Card className={`border-l-4 ${tone}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold truncate">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SupportCostTable({
  records,
  canViewValues,
  valueText,
  groups,
}: {
  records: EnrichedSupportCostRecord[];
  canViewValues: boolean;
  valueText: (value: number) => string;
  groups: ClientReportGroup[];
}) {
  const [selectedRecord, setSelectedRecord] = useState<EnrichedSupportCostRecord | null>(null);
  const milvusEntries = getMilvusEntries(selectedRecord);

  if (records.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="font-medium">Nenhuma hora importada para os filtros atuais.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Sincronize o Milvus para visualizar clientes/projetos encontrados, horas atendidas e custo calculado.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-2 pr-3">Cliente Milvus</th>
              <th className="py-2 pr-3">Projeto Milvus</th>
              <th className="py-2 pr-3">Responsavel</th>
              <th className="py-2 pr-3 text-right">Horas</th>
              <th className="py-2 pr-3 text-right">Custo Calculado</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, groupIndex) => (
              <React.Fragment key={group.clientName}>
                <tr className="border-b bg-primary/15">
                  <td className="py-3 pr-3 font-semibold text-foreground" colSpan={3}>{group.clientName}</td>
                  <td className="py-3 pr-3 text-right font-semibold tabular-nums">{formatHours(group.hours)}</td>
                  <td className="py-3 pr-3 text-right font-semibold">{canViewValues ? valueText(group.cost) : 'Confidencial'}</td>
                </tr>
                {group.records.map((record, index) => (
                  <tr
                    key={group.clientName + '-' + record.id + '-' + index}
                    className={
                      groupIndex % 2 === 0
                        ? 'border-b bg-muted/20 last:border-0 cursor-pointer transition-colors hover:bg-muted/50'
                        : 'border-b bg-primary/[0.04] last:border-0 cursor-pointer transition-colors hover:bg-primary/10'
                    }
                    tabIndex={0}
                    onClick={() => setSelectedRecord(record)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedRecord(record);
                      }
                    }}
                  >
                    <td className="py-3 pr-3 text-muted-foreground">{record.clientName}</td>
                    <td className="py-3 pr-3">
                      <span>{record.projectName}</span>
                      {record.reconciliationStatus === 'pendente' && (
                        <Badge variant="secondary" className="ml-2">Pendente</Badge>
                      )}
                    </td>
                    <td className="py-3 pr-3">{record.analystName}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{formatHours(record.hours)}</td>
                    <td className="py-3 pr-3 text-right font-medium">{canViewValues ? valueText(record.estimatedCost) : 'Confidencial'}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={Boolean(selectedRecord)} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Origem Milvus</SheetTitle>
            <SheetDescription>
              Detalhes do atendimento importado para a apuracao de custos.
            </SheetDescription>
          </SheetHeader>

          {selectedRecord && (
            <div className="mt-6 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Cliente Milvus</p>
                  <p className="mt-1 font-medium">{selectedRecord.clientName || '—'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Projeto Milvus</p>
                  <p className="mt-1 font-medium">{selectedRecord.projectName || '—'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Responsavel</p>
                  <p className="mt-1 font-medium">{selectedRecord.analystName || '—'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Horas</p>
                  <p className="mt-1 font-medium">{formatHours(selectedRecord.hours)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="mt-1 font-medium">{selectedRecord.date || '—'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Custo calculado</p>
                  <p className="mt-1 font-medium">{canViewValues ? valueText(selectedRecord.estimatedCost) : 'Confidencial'}</p>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <p className="text-sm font-semibold">Conciliação Hub</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente conciliado</p>
                    <p className="mt-1 text-sm">{selectedRecord.matchedClient?.nomeFantasia || selectedRecord.matchedClient?.razaoSocial || 'Não conciliado'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contrato conciliado</p>
                    <p className="mt-1 text-sm">{selectedRecord.matchedContract?.nome || 'Não conciliado'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border">
                <div className="border-b px-3 py-2">
                  <p className="text-sm font-semibold">Dados originais Milvus</p>
                  <p className="text-xs text-muted-foreground">Campos recebidos na sincronizacao para esta linha.</p>
                </div>
                {milvusEntries.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">Nenhum dado bruto disponivel para esta linha.</p>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto">
                    {milvusEntries.map(([key, value]) => (
                      <div key={key} className="grid gap-1 border-b px-3 py-2 last:border-0 sm:grid-cols-[180px_1fr]">
                        <p className="break-all text-xs font-medium text-muted-foreground">{key}</p>
                        <p className="break-words text-sm">{formatMilvusValue(value)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function SupportExecutiveSummary({
  records,
  technicianGroups,
  monthlyGroups,
  canViewValues,
  valueText,
  periodMonths,
}: {
  records: EnrichedSupportCostRecord[];
  technicianGroups: TechnicianCostGroup[];
  monthlyGroups: MonthlyCostGroup[];
  canViewValues: boolean;
  valueText: (value: number) => string;
  periodMonths: number;
}) {
  const totalHours = records.reduce((sum, record) => sum + record.hours, 0);
  const totalCost = records.reduce((sum, record) => sum + record.estimatedCost, 0);
  const averageMonthlyCost = totalCost / periodMonths;
  const costPerTicket = records.length > 0 ? totalCost / records.length : 0;
  const averageWorkMinutes = records.length > 0 ? (totalHours * 60) / records.length : null;
  const firstResponseMinutes = median(records
    .map((record) => minutesBetween(record.raw?.data_criacao, record.raw?.data_inicial))
    .filter((value): value is number => value !== null));
  const resolutionMinutes = median(records
    .map((record) => minutesBetween(record.raw?.data_criacao, record.raw?.data_solucao ?? record.raw?.data_final))
    .filter((value): value is number => value !== null));

  if (records.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Custo total no periodo"
          value={valueText(totalCost)}
          description="Mao de obra apontada"
          icon={<CircleDollarSign className="h-5 w-5 text-emerald-600" />}
          tone="border-l-emerald-500"
        />
        <KpiCard
          title="Custo mensal medio"
          value={valueText(averageMonthlyCost)}
          description={`${periodMonths} mes(es) no periodo`}
          icon={<CalendarDays className="h-5 w-5 text-sky-600" />}
          tone="border-l-sky-500"
        />
        <KpiCard
          title="Volume atendido"
          value={`${records.length} tickets`}
          description={`${formatHours(totalHours)} trabalhadas`}
          icon={<Ticket className="h-5 w-5 text-violet-600" />}
          tone="border-l-violet-500"
        />
        <KpiCard
          title="Custo por ticket"
          value={valueText(costPerTicket)}
          description="Custo total / tickets"
          icon={<TimerReset className="h-5 w-5 text-amber-600" />}
          tone="border-l-amber-500"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo por tecnico</CardTitle>
            <p className="text-sm text-muted-foreground">
              Custo empresa mensal dividido pela carga mensal do vinculo. Quando nao ha RH conciliado, usa o custo-hora medio do time.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3">Tecnico</th>
                    <th className="py-2 pr-3 text-right">Custo empresa/mes</th>
                    <th className="py-2 pr-3 text-right">Custo-hora</th>
                    <th className="py-2 pr-3 text-right">Tickets</th>
                    <th className="py-2 pr-3 text-right">Horas</th>
                    <th className="py-2 pr-3 text-right">Custo no periodo</th>
                  </tr>
                </thead>
                <tbody>
                  {technicianGroups.map((group) => (
                    <tr key={group.name} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <span className="font-medium">{group.name}</span>
                        {!group.matched && <Badge variant="secondary" className="ml-2">Media</Badge>}
                      </td>
                      <td className="py-2 pr-3 text-right">{group.monthlyCost === null ? '-' : valueText(group.monthlyCost)}</td>
                      <td className="py-2 pr-3 text-right">{valueText(group.hourlyCost)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{group.tickets}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatHours(group.hours)}</td>
                      <td className="py-2 pr-3 text-right font-medium">{valueText(group.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tempo de atendimento</CardTitle>
            <p className="text-sm text-muted-foreground">Indicadores calculados com os campos de data recebidos do Milvus.</p>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">Trabalho por ticket</p>
              <p className="mt-1 text-2xl font-bold">{formatDurationFromMinutes(averageWorkMinutes)}</p>
              <p className="text-xs text-muted-foreground">media de horas apontadas</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">Primeira resposta</p>
              <p className="mt-1 text-2xl font-bold">{formatDurationFromMinutes(firstResponseMinutes)}</p>
              <p className="text-xs text-muted-foreground">mediana</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">Resolucao</p>
              <p className="mt-1 text-2xl font-bold">{formatDurationFromMinutes(resolutionMinutes)}</p>
              <p className="text-xs text-muted-foreground">mediana em tempo corrido</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolucao mensal</CardTitle>
          <p className="text-sm text-muted-foreground">Custo estimado por mes de abertura do ticket.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyGroups} margin={{ top: 12, right: 28, left: 8, bottom: 22 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => canViewValues ? formatShortCurrency(Number(value)) : String(value)} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'cost' ? valueText(value) : name === 'hours' ? formatHours(value) : value,
                    name === 'cost' ? 'Custo' : name === 'hours' ? 'Horas' : 'Tickets',
                  ]}
                />
                <Bar dataKey={canViewValues ? 'cost' : 'hours'} radius={[6, 6, 0, 0]} fill="#3b82f6">
                  <LabelList
                    dataKey={canViewValues ? 'cost' : 'hours'}
                    position="top"
                    formatter={(value: number) => canViewValues ? formatShortCurrency(value) : formatHours(value)}
                    className="fill-foreground text-[11px]"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Mes</th>
                  <th className="py-2 pr-3 text-right">Tickets</th>
                  <th className="py-2 pr-3 text-right">Horas</th>
                  <th className="py-2 pr-3 text-right">Custo estimado</th>
                </tr>
              </thead>
              <tbody>
                {monthlyGroups.map((group) => (
                  <tr key={group.monthKey} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{group.label}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{group.tickets}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatHours(group.hours)}</td>
                    <td className="py-2 pr-3 text-right font-medium">{valueText(group.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SupportCostsPage() {
  const initialRange = useMemo(() => currentMonthRange(), []);
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [clientId, setClientId] = useState('all');
  const [contractId, setContractId] = useState('all');
  const [analystName, setAnalystName] = useState('all');
  const [records, setRecords] = useState<SupportCostRecord[]>([]);
  const [loadingSync, setLoadingSync] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncedRange, setSyncedRange] = useState<{ from: string; to: string } | null>(null);
  const syncRequestRef = useRef(0);
  const { canModuleAction, userRole } = useAuth();
  const { clients, contracts, settings } = useData();
  const { hrPeople } = useHR();
  const canViewSupportCosts = canModuleAction('SUPPORT_COSTS', 'can_view_values');
  const canViewCalculationBase = userRole !== 'lider_tribo';

  const activePeople = useMemo(
    () => hrPeople.filter((person) => person.situacao === 'ativo'),
    [hrPeople],
  );

  const costSummary = useMemo(() => {
    const totalMonthlyCost = activePeople.reduce((sum, person) => sum + calculateSupportMonthlyCost(person, settings), 0);
    const totalMonthlyHours = activePeople.reduce((sum, person) => sum + getMonthlyHoursByLinkType(person.tipoVinculo), 0);
    const averageHourlyCost = totalMonthlyHours > 0
      ? totalMonthlyCost / totalMonthlyHours
      : 0;

    return {
      totalMonthlyCost,
      totalMonthlyHours,
      averageHourlyCost,
    };
  }, [activePeople, settings]);

  const technicianCostByName = useMemo(() => {
    const map = new Map<string, { monthlyCost: number; hourlyCost: number }>();
    for (const person of activePeople) {
      const normalizedName = normalizeText(person.nome);
      if (!normalizedName) continue;
      const monthlyCost = calculateSupportMonthlyCost(person, settings);
      const monthlyHours = getMonthlyHoursByLinkType(person.tipoVinculo);
      map.set(normalizedName, {
        monthlyCost,
        hourlyCost: monthlyHours > 0 ? monthlyCost / monthlyHours : costSummary.averageHourlyCost,
      });
    }
    return map;
  }, [activePeople, costSummary.averageHourlyCost, settings]);

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => (a.nomeFantasia || a.razaoSocial).localeCompare(b.nomeFantasia || b.razaoSocial, 'pt-BR')),
    [clients],
  );

  const filteredContracts = useMemo(() => {
    const list = clientId === 'all'
      ? contracts
      : contracts.filter((contract) => contract.clientId === clientId);
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [clientId, contracts]);

  const selectedClient = clients.find((client) => client.id === clientId);
  const selectedMilvusClientName = clientId.startsWith('milvus:')
    ? clientId.replace(/^milvus:/, '')
    : undefined;
  const monthFrom = dateToMonth(dateFrom);
  const monthTo = dateToMonth(dateTo);

  const clientOptions = useMemo(() => {
    const hubOptions = sortedClients.map((client) => ({
      value: client.id,
      label: client.nomeFantasia || client.razaoSocial,
      searchText: client.razaoSocial,
    }));

    const milvusClientNames = new Set<string>();
    for (const record of records) {
      if (!record.clientName || record.clientName === 'Nao informado') continue;
      const alreadyMapped = clients.some((client) => (
        isStrongNameMatch(record.clientName, client.nomeFantasia)
        || isStrongNameMatch(record.clientName, client.razaoSocial)
      ));
      if (!alreadyMapped) milvusClientNames.add(record.clientName);
    }

    const milvusOptions = Array.from(milvusClientNames)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((name) => ({
        value: `milvus:${name}`,
        label: `${name} (Milvus)`,
        searchText: name,
      }));

    return [
      { value: 'all', label: 'Todos os clientes' },
      ...hubOptions,
      ...milvusOptions,
    ];
  }, [clients, records, sortedClients]);

  const projectOptions = useMemo(() => {
    const hubOptions = filteredContracts.map((contract) => ({
      value: contract.id,
      label: contract.nome,
    }));

    const milvusProjects = new Set<string>();
    for (const record of records) {
      if (!record.projectName || record.projectName === 'Nao informado') continue;
      if (selectedMilvusClientName && !isStrongNameMatch(record.clientName, selectedMilvusClientName)) continue;
      if (clientId !== 'all' && !selectedMilvusClientName) {
        const matchedContract = contracts.find((contract) => {
          const milvusProject = normalizeText(record.projectName);
          return milvusProject
            && (
              normalizeText(contract.nome).includes(milvusProject)
              || milvusProject.includes(normalizeText(contract.nome))
            );
        });
        const matchesHubClient = matchedContract?.clientId === clientId
          || isStrongNameMatch(record.clientName, selectedClient?.nomeFantasia)
          || isStrongNameMatch(record.clientName, selectedClient?.razaoSocial);
        if (!matchesHubClient) continue;
      }
      const alreadyMapped = contracts.some((contract) => {
        const milvusProject = normalizeText(record.projectName);
        return milvusProject
          && (
            normalizeText(contract.nome).includes(milvusProject)
            || milvusProject.includes(normalizeText(contract.nome))
          );
      });
      if (!alreadyMapped) milvusProjects.add(record.projectName);
    }

    const milvusOptions = Array.from(milvusProjects)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((name) => ({
        value: `milvus-project:${name}`,
        label: `${name} (Milvus)`,
        searchText: name,
      }));

    return [
      { value: 'all', label: 'Todos os projetos' },
      ...hubOptions,
      ...milvusOptions,
    ];
  }, [clientId, contracts, filteredContracts, records, selectedClient, selectedMilvusClientName]);

  const analystOptions = useMemo(() => {
    const names = new Set(records.map((record) => record.analystName).filter(Boolean));
    return [
      { value: 'all', label: 'Todos os responsaveis' },
      ...Array.from(names)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .map((name) => ({ value: name, label: name })),
    ];
  }, [records]);

  const getTechnicianCost = useCallback((analyst: string) => {
    const normalizedAnalyst = normalizeText(analyst);
    const direct = technicianCostByName.get(normalizedAnalyst);
    if (direct) return { ...direct, matched: true };

    for (const [personName, cost] of technicianCostByName.entries()) {
      if (
        normalizedAnalyst
        && personName
        && (personName.includes(normalizedAnalyst) || normalizedAnalyst.includes(personName))
      ) {
        return { ...cost, matched: true };
      }
    }

    return {
      monthlyCost: 0,
      hourlyCost: costSummary.averageHourlyCost,
      matched: false,
    };
  }, [costSummary.averageHourlyCost, technicianCostByName]);

  const enrichedRecords = useMemo<EnrichedSupportCostRecord[]>(() => {
    return records.map((record) => {
      const matchedClient = clients.find((client) => {
        return isStrongNameMatch(record.clientName, client.nomeFantasia)
          || isStrongNameMatch(record.clientName, client.razaoSocial);
      });

      const matchedContract = contracts.find((contract) => {
        const milvusProject = normalizeText(record.projectName);
        return milvusProject
          && (
            normalizeText(contract.nome).includes(milvusProject)
            || milvusProject.includes(normalizeText(contract.nome))
          );
      });

      const technicianCost = getTechnicianCost(record.analystName);
      const estimatedCost = record.hours * technicianCost.hourlyCost;

      return {
        ...record,
        matchedClient,
        matchedContract,
        estimatedCost,
        technicianMonthlyCost: technicianCost.monthlyCost,
        technicianHourlyCost: technicianCost.hourlyCost,
        technicianCostMatched: technicianCost.matched,
        reconciliationStatus: matchedClient || matchedContract ? 'conciliado' : 'pendente',
      };
    });
  }, [clients, contracts, records, getTechnicianCost]);

  const filteredRecords = useMemo(() => {
    if (!syncedRange || syncedRange.from !== dateFrom || syncedRange.to !== dateTo) return [];

    return enrichedRecords.filter((record) => {
      if (parseRecordDate(record.date) && !isRecordInSelectedPeriod(record, dateFrom, dateTo)) return false;
      if (clientId !== 'all') {
        const matchesSelectedClient = selectedMilvusClientName
          ? isStrongNameMatch(record.clientName, selectedMilvusClientName)
          : record.matchedClient?.id === clientId
            || record.matchedContract?.clientId === clientId
            || isStrongNameMatch(record.clientName, selectedClient?.nomeFantasia)
            || isStrongNameMatch(record.clientName, selectedClient?.razaoSocial);
        if (!matchesSelectedClient) return false;
      }
      if (contractId !== 'all') {
        const selectedMilvusProjectName = contractId.startsWith('milvus-project:')
          ? contractId.replace(/^milvus-project:/, '')
          : undefined;
        const matchesSelectedProject = selectedMilvusProjectName
          ? isStrongNameMatch(record.projectName, selectedMilvusProjectName)
          : record.matchedContract?.id === contractId;
        if (!matchesSelectedProject) return false;
      }
      if (analystName !== 'all' && record.analystName !== analystName) return false;
      return true;
    });
  }, [analystName, clientId, contractId, dateFrom, dateTo, enrichedRecords, selectedClient, selectedMilvusClientName, syncedRange]);

  const totals = useMemo(() => {
    const totalHours = filteredRecords.reduce((sum, record) => sum + record.hours, 0);
    const totalCost = filteredRecords.reduce((sum, record) => sum + record.estimatedCost, 0);
    const clientsCount = new Set(filteredRecords.map((record) => record.clientName)).size;
    const pendingCount = filteredRecords.filter((record) => record.reconciliationStatus === 'pendente').length;
    return { totalHours, totalCost, clientsCount, pendingCount };
  }, [filteredRecords]);

  const periodMonths = useMemo(() => countMonthsInRange(dateFrom, dateTo), [dateFrom, dateTo]);

  const technicianGroups = useMemo<TechnicianCostGroup[]>(() => {
    const grouped = new Map<string, TechnicianCostGroup>();
    for (const record of filteredRecords) {
      const name = record.analystName || 'Nao informado';
      const current = grouped.get(name) || {
        name,
        monthlyCost: record.technicianCostMatched ? record.technicianMonthlyCost : null,
        hourlyCost: record.technicianHourlyCost,
        tickets: 0,
        hours: 0,
        cost: 0,
        matched: record.technicianCostMatched,
      };
      current.tickets += 1;
      current.hours += record.hours;
      current.cost += record.estimatedCost;
      grouped.set(name, current);
    }

    return Array.from(grouped.values()).sort((a, b) => b.cost - a.cost || b.hours - a.hours);
  }, [filteredRecords]);

  const monthlyGroups = useMemo<MonthlyCostGroup[]>(() => {
    const grouped = new Map<string, MonthlyCostGroup>();
    for (const record of filteredRecords) {
      const parsedDate = parseRecordDate(record.date);
      const monthKey = parsedDate ? parsedDate.slice(0, 7) : 'sem-data';
      const current = grouped.get(monthKey) || {
        monthKey,
        label: monthKey === 'sem-data' ? 'Sem data' : getMonthLabel(monthKey),
        tickets: 0,
        hours: 0,
        cost: 0,
      };
      current.tickets += 1;
      current.hours += record.hours;
      current.cost += record.estimatedCost;
      grouped.set(monthKey, current);
    }

    return Array.from(grouped.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredRecords]);

  const chartByClient = useMemo(() => {
    const grouped = new Map<string, { name: string; hours: number; cost: number }>();
    for (const record of filteredRecords) {
      const name = record.clientName || 'Não informado';
      const current = grouped.get(name) || { name, hours: 0, cost: 0 };
      current.hours += record.hours;
      current.cost += record.estimatedCost;
      grouped.set(name, current);
    }
    return Array.from(grouped.values()).sort((a, b) => b.cost - a.cost || b.hours - a.hours);
  }, [filteredRecords]);

  const chartByProject = useMemo(() => {
    const grouped = new Map<string, { name: string; hours: number; cost: number }>();
    for (const record of filteredRecords) {
      const name = record.matchedContract?.nome || record.projectName || 'Não informado';
      const current = grouped.get(name) || { name, hours: 0, cost: 0 };
      current.hours += record.hours;
      current.cost += record.estimatedCost;
      grouped.set(name, current);
    }
    return Array.from(grouped.values()).sort((a, b) => b.cost - a.cost || b.hours - a.hours);
  }, [filteredRecords]);

  const clientReportGroups = useMemo<ClientReportGroup[]>(() => {
    const grouped = new Map<string, ClientReportGroup>();
    for (const record of [...filteredRecords].sort((a, b) => {
      const clientCompare = a.clientName.localeCompare(b.clientName, 'pt-BR');
      if (clientCompare !== 0) return clientCompare;
      const projectCompare = a.projectName.localeCompare(b.projectName, 'pt-BR');
      if (projectCompare !== 0) return projectCompare;
      return a.analystName.localeCompare(b.analystName, 'pt-BR');
    })) {
      const clientName = record.clientName || 'Nao informado';
      const group = grouped.get(clientName) || { clientName, hours: 0, cost: 0, records: [] };
      group.hours += record.hours;
      group.cost += record.estimatedCost;
      group.records.push(record);
      grouped.set(clientName, group);
    }
    return Array.from(grouped.values()).sort((a, b) => a.clientName.localeCompare(b.clientName, 'pt-BR'));
  }, [filteredRecords]);

  const periodLabel = dateFrom && dateTo
    ? `${new Date(`${dateFrom}T12:00:00`).toLocaleDateString('pt-BR')} a ${new Date(`${dateTo}T12:00:00`).toLocaleDateString('pt-BR')}`
    : 'Período não definido';

  const valueText = (value: number) => canViewSupportCosts ? formatCurrency(value) : 'Confidencial';
  const chartValueKey = canViewSupportCosts ? 'cost' : 'hours';
  const canExportSupportCosts = canModuleAction('SUPPORT_COSTS', 'can_export');

  function handleMonthFromChange(month: string) {
    const range = monthToDateRange(month);
    if (range) setDateFrom(range.from);
  }

  function handleMonthToChange(month: string) {
    const range = monthToDateRange(month);
    if (range) setDateTo(range.to);
  }

  function clearFilters() {
    const range = currentMonthRange();
    setDateFrom(range.from);
    setDateTo(range.to);
    setClientId('all');
    setContractId('all');
    setAnalystName('all');
  }

  function exportClientReportXlsx() {
    if (clientReportGroups.length === 0) {
      toast.warning('Nenhum registro para exportar.');
      return;
    }

    const headers = [
      'Cliente Milvus',
      'Projeto Milvus',
      'Responsavel',
      'Horas',
      'Custo Calculado',
      'Data',
    ];

    const rows: unknown[][] = [];
    let totalHours = 0;
    let totalCost = 0;

    for (const group of clientReportGroups) {
      totalHours += group.hours;
      totalCost += group.cost;

      rows.push([
        group.clientName,
        '',
        '',
        Number(group.hours.toFixed(2)),
        canViewSupportCosts ? group.cost : 'Confidencial',
        '',
      ]);

      for (const record of group.records) {
        rows.push([
          record.clientName,
          record.projectName,
          record.analystName,
          Number(record.hours.toFixed(2)),
          canViewSupportCosts ? record.estimatedCost : 'Confidencial',
          record.date || '',
        ]);
      }

      rows.push([]);
    }

    rows.push([
      'Total geral',
      '',
      '',
      Number(totalHours.toFixed(2)),
      canViewSupportCosts ? totalCost : 'Confidencial',
      '',
    ]);

    const filename = `custos-suporte-tsi-clientes-${dateFrom}-a-${dateTo}.xlsx`;
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet['!cols'] = [
      { wch: 34 },
      { wch: 34 },
      { wch: 24 },
      { wch: 12 },
      { wch: 18 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
    toast.success('Planilha exportada com sucesso.');
  }

  const syncMilvus = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!dateFrom || !dateTo) {
      setRecords([]);
      setSyncedRange(null);
      if (!silent) toast.error('Informe inicio e fim do periodo.');
      return;
    }
    if (dateFrom > dateTo) {
      setRecords([]);
      setSyncedRange(null);
      if (!silent) toast.error('O mes inicial deve ser anterior ou igual ao mes final.');
      return;
    }

    const requestId = syncRequestRef.current + 1;
    syncRequestRef.current = requestId;
    setLoadingSync(true);
    setRecords([]);
    try {
      const { data, error } = await supabase.functions.invoke('support-costs-sync', {
        body: {
          dateFrom,
          dateTo,
        },
      });

      if (error) throw error;
      const payload = data as SupportCostsSyncResponse;
      if (payload?.success === false) throw new Error(payload.error || 'Erro ao sincronizar Milvus.');
      if (requestId !== syncRequestRef.current) return;

      setRecords(payload.records || []);
      setSyncedRange({ from: dateFrom, to: dateTo });
      setLastSyncAt(new Date().toISOString());
      const importedCount = payload.records?.length || 0;
      if (!silent && importedCount === 0) {
        toast.warning(getZeroImportDiagnosticMessage(payload), { duration: 12000 });
      } else if (!silent) {
        toast.success(importedCount + ' registro(s) de horas importado(s).');
      }
    } catch (error) {
      if (requestId === syncRequestRef.current) {
        setRecords([]);
        setSyncedRange(null);
      }
      if (!silent) toast.error(getFunctionErrorMessage(error));
    } finally {
      if (requestId === syncRequestRef.current) setLoadingSync(false);
    }
  }, [dateFrom, dateTo]);

  const syncMilvusRef = useRef(syncMilvus);

  useEffect(() => {
    syncMilvusRef.current = syncMilvus;
  }, [syncMilvus]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void syncMilvusRef.current({ silent: true });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, []);

  const renderChart = (title: string, data: { name: string; hours: number; cost: number }[]) => {
    const chartHeight = Math.max(460, data.length * 42 + 90);

    return (
    <Card className="border-l-4 border-l-primary/40 bg-muted/20 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {title}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Valores incluem remuneracao bruta dos RHs e encargos/impostos. Beneficios nao sao considerados.
            </p>
          </div>
          <Badge variant="secondary">{canViewSupportCosts ? 'Custo' : 'Horas'}</Badge>
        </div>
      </CardHeader>
      <CardContent style={{ height: chartHeight }}>
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Sincronize o Milvus para carregar os dados.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 42, left: 130, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => canViewSupportCosts ? formatShortCurrency(Number(value)) : String(value)}
              >
                <Label value={canViewSupportCosts ? 'Custo calculado' : 'Horas'} offset={-12} position="insideBottom" className="fill-muted-foreground text-[11px]" />
              </XAxis>
              <YAxis type="category" dataKey="name" width={128} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'cost' ? valueText(value) : formatHours(value),
                  name === 'cost' ? 'Custo calculado' : 'Horas',
                ]}
              />
              <Bar dataKey={chartValueKey} radius={[0, 5, 5, 0]}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                ))}
                <LabelList
                  dataKey={chartValueKey}
                  position="right"
                  formatter={(value: number) => canViewSupportCosts ? formatShortCurrency(value) : formatHours(value)}
                  className="fill-foreground text-[11px]"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custo do Suporte a Sistemas - TSI"
        description="Apuração de custo dos atendimentos de suporte a sistemas por período, cliente e projeto."
        animated={false}
      />

      {!canViewSupportCosts && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium">Valores financeiros ocultos</p>
              <p className="text-sm text-muted-foreground">
                Seu perfil pode acessar a visão operacional do módulo, mas os custos permanecem protegidos pelas permissões financeiras.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
            <Badge variant="outline">{periodLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-10">
          <label className="space-y-1 xl:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Mes/ano inicial</span>
            <input
              type="month"
              value={monthFrom}
              onChange={(event) => handleMonthFromChange(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 xl:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Mes/ano final</span>
            <input
              type="month"
              value={monthTo}
              onChange={(event) => handleMonthToChange(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 xl:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Cliente</span>
            <SearchableSelect
              value={clientId}
              onValueChange={(value) => {
                setClientId(value);
                setContractId('all');
              }}
              options={clientOptions}
              placeholder="Todos os clientes"
              searchPlaceholder="Buscar cliente..."
            />
          </label>
          <label className="space-y-1 xl:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Projeto / Contrato</span>
            <SearchableSelect
              value={contractId}
              onValueChange={setContractId}
              options={projectOptions}
              placeholder="Todos os projetos"
              searchPlaceholder="Buscar projeto..."
            />
          </label>
          <label className="space-y-1 xl:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Responsavel</span>
            <SearchableSelect
              value={analystName}
              onValueChange={setAnalystName}
              options={analystOptions}
              placeholder="Todos os responsaveis"
              searchPlaceholder="Buscar responsavel..."
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end md:col-span-2 xl:col-span-10">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={clearFilters}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Limpar
            </Button>
            <Button type="button" variant="default" className="w-full whitespace-nowrap sm:w-auto" onClick={() => syncMilvus({ silent: false })} disabled={loadingSync}>
              {loadingSync ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
              Sincronizar Milvus
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="client-report">Relatório por cliente</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
              title="Horas Milvus"
              value={formatHours(totals.totalHours)}
              description={lastSyncAt ? 'Atualizado em ' + new Date(lastSyncAt).toLocaleString('pt-BR') : 'Aguardando sincronizacao'}
              icon={<Clock3 className="h-5 w-5 text-sky-600" />}
              tone="border-l-sky-500"
            />
            <KpiCard
              title="Custo calculado"
              value={valueText(totals.totalCost)}
              description="Horas conciliadas x custo/hora medio"
              icon={<CircleDollarSign className="h-5 w-5 text-emerald-600" />}
              tone="border-l-emerald-500"
            />
            <KpiCard
              title="Custo medio/hora RH"
              value={valueText(costSummary.averageHourlyCost)}
              description={activePeople.length + ' RHs ativos / ' + Math.round(costSummary.totalMonthlyHours) + 'h base'}
              icon={<UsersRound className="h-5 w-5 text-violet-600" />}
              tone="border-l-violet-500"
            />
            <KpiCard
              title="Clientes atendidos"
              value={String(totals.clientsCount)}
              description={totals.pendingCount + ' registro(s) pendente(s)'}
              icon={<Link2 className="h-5 w-5 text-amber-600" />}
              tone="border-l-amber-500"
            />
          </div>

          <div className="space-y-4">
            {renderChart('Totais por cliente', chartByClient)}
            {renderChart('Totais por projeto', chartByProject)}
          </div>

          {canViewCalculationBase && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Base de calculo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Base mensal RH ativo</p>
                    <p className="mt-1 text-lg font-semibold">{valueText(costSummary.totalMonthlyCost)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Carga mensal usada</p>
                    <p className="mt-1 text-lg font-semibold">CLT {CLT_MONTHLY_HOURS}h / PJ {PJ_MONTHLY_HOURS}h</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Formula aplicada</p>
                    <p className="mt-1 text-lg font-semibold">horas x custo/h</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  O custo/hora usa remuneracao bruta mensal mais encargos/impostos, sem beneficios. CLT usa {CLT_MONTHLY_HOURS}h mensais e PJ usa {PJ_MONTHLY_HOURS}h mensais.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="client-report" className="space-y-4">
          <SupportExecutiveSummary
            records={filteredRecords}
            technicianGroups={technicianGroups}
            monthlyGroups={monthlyGroups}
            canViewValues={canViewSupportCosts}
            valueText={valueText}
            periodMonths={periodMonths}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Conciliação Milvus x Hub
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Valores incluem remuneracao bruta dos RHs e encargos/impostos. Beneficios nao sao considerados.
              </p>
            </CardHeader>
            {canExportSupportCosts && (
              <div className="flex justify-end px-6 pb-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={exportClientReportXlsx}
                  disabled={clientReportGroups.length === 0}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar XLSX
                </Button>
              </div>
            )}
            <CardContent>
              <SupportCostTable records={filteredRecords} groups={clientReportGroups} canViewValues={canViewSupportCosts} valueText={valueText} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
