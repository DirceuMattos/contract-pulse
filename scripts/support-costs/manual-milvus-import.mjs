#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const MILVUS_TICKETS_URL = 'https://apiintegracao.milvus.com.br/api/chamado/listagem';
const MILVUS_CLIENTS_URL = 'https://apiintegracao.milvus.com.br/api/cliente/busca';
const PAGE_SIZE = 50;
const SLICE_FIELDS = ['tecnico', 'prioridade', 'categoria_primaria', 'categoria_secundaria'];
const MAX_SLICES = 180;
const OUT_DIR = path.resolve(process.cwd(), 'scripts/support-costs/output');

function parseArgs(argv) {
  const args = {
    mode: 'audit',
    from: '',
    to: '',
    client: '',
    project: '',
    write: false,
    limitClients: 0,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--mode' && next) args.mode = next;
    if (arg === '--from' && next) args.from = next;
    if (arg === '--to' && next) args.to = next;
    if (arg === '--client' && next) args.client = next;
    if (arg === '--project' && next) args.project = next;
    if (arg === '--limit-clients' && next) args.limitClients = Number(next) || 0;
    if (arg === '--write') args.write = true;
    if (arg.startsWith('--') && next && !next.startsWith('--')) index += 1;
  }

  return args;
}

async function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = await readFile(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    if (!process.env[key.trim()]) process.env[key.trim()] = value;
  }
}

function requireEnv(name, fallbackName) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : '');
  if (!value) throw new Error(`Configure ${name}${fallbackName ? ` ou ${fallbackName}` : ''} no ambiente.`);
  return value;
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(ltda|me|eireli|sa|s\/a|organizacao|social|de|da|do|dos|das)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compactName(value) {
  return normalizeName(value).replace(/[^a-z0-9]/g, '');
}

function scoreNameMatch(source, target) {
  const sourceCompact = compactName(source);
  const targetCompact = compactName(target);
  if (!sourceCompact || !targetCompact) return 0;
  if (sourceCompact === targetCompact) return 1;
  if (sourceCompact.length >= 4 && targetCompact.includes(sourceCompact)) return 0.86;
  if (targetCompact.length >= 4 && sourceCompact.includes(targetCompact)) return 0.82;

  const sourceWords = new Set(normalizeName(source).split(/\s+/).filter((word) => word.length >= 3));
  const targetWords = new Set(normalizeName(target).split(/\s+/).filter((word) => word.length >= 3));
  if (sourceWords.size === 0 || targetWords.size === 0) return 0;
  const common = [...sourceWords].filter((word) => targetWords.has(word)).length;
  return common / Math.max(sourceWords.size, targetWords.size);
}

function bestHubClientMatch(name, clients) {
  const scored = clients
    .map((client) => {
      const fantasy = scoreNameMatch(name, client.nome_fantasia || '');
      const legal = scoreNameMatch(name, client.razao_social || '');
      return { item: client, score: Math.max(fantasy, legal) };
    })
    .filter((entry) => entry.score >= 0.55)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { item: null, status: 'pending', confidence: 0, method: 'auto-name' };
  if (scored.length > 1 && scored[0].score - scored[1].score < 0.08) {
    return { item: null, status: 'ambiguous', confidence: scored[0].score, method: 'auto-name' };
  }
  return { item: scored[0].item, status: 'matched', confidence: scored[0].score, method: 'auto-name' };
}

function bestHubContractMatch(name, contracts, preferredClientId) {
  const scored = contracts
    .map((contract) => {
      const nameScore = scoreNameMatch(name, contract.nome || '');
      const codeScore = scoreNameMatch(name, contract.codigo || '');
      const clientBoost = preferredClientId && contract.client_id === preferredClientId ? 0.08 : 0;
      return { item: contract, score: Math.min(1, Math.max(nameScore, codeScore) + clientBoost) };
    })
    .filter((entry) => entry.score >= 0.52)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { item: null, status: 'pending', confidence: 0, method: 'auto-name' };
  if (scored.length > 1 && scored[0].score - scored[1].score < 0.06) {
    return { item: null, status: 'ambiguous', confidence: scored[0].score, method: 'auto-name' };
  }
  return { item: scored[0].item, status: 'matched', confidence: scored[0].score, method: 'auto-name' };
}

function unwrapRows(payload) {
  const queue = [payload];
  const rows = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    if (typeof current === 'string') {
      try {
        queue.push(JSON.parse(current));
      } catch {
        continue;
      }
      continue;
    }
    if (typeof current !== 'object') continue;
    for (const key of ['lista', 'data', 'rows', 'items', 'records', 'tickets', 'content', 'result']) {
      if (Array.isArray(current[key])) queue.push(...current[key]);
    }
    if (looksLikeTicketRow(current)) rows.push(current);
  }

  const seen = new Set();
  return rows.filter((row, index) => {
    const key = String(row.codigo || row.id || row.ticket || row.chamado || `row-${index}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function looksLikeTicketRow(record) {
  return ['cliente', 'nome_fantasia', 'assunto', 'codigo', 'tecnico', 'total_horas_atendimento', 'servico_realizado']
    .some((key) => record && Object.hasOwn(record, key));
}

function firstString(record, keys, fallback = 'Nao informado') {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

function parseDurationHours(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
  if (!match) return null;
  return Number(match[1]) + Number(match[2]) / 60 + Number(match[3] || 0) / 3600;
}

function firstNumber(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const duration = parseDurationHours(value);
      if (duration !== null) return duration;
      const parsed = Number(value.trim().replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function detectHours(record) {
  const hours = firstNumber(record, [
    'horas',
    'hours',
    'total_horas',
    'total_horas_atendimento',
    'horas_ticket',
    'horas_operador',
    'horas_internas',
    'horas_externas',
  ]);
  if (hours > 0) return hours;
  const minutes = firstNumber(record, ['minutos', 'minutes', 'total_minutos']);
  return minutes > 0 ? minutes / 60 : 0;
}

function formatDateParts(year, month, day) {
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateOnly(value) {
  if (!value) return null;
  const raw = String(value).trim();
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
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function normalizeTicket(row, index) {
  const rawTicket = row.rawTicket && typeof row.rawTicket === 'object' ? row.rawTicket : row;
  const clientName = firstString(row, ['cliente', 'nome_fantasia', 'clientName', 'nome_cliente'], 'Nao informado');
  const projectName = firstString(row, ['projeto', 'contrato', 'mesa_trabalho', 'unidade_de_negocio'], clientName);
  const date = parseDateOnly(firstString(row, ['data_inicial', 'data_criacao', 'data_abertura', 'data_solucao'], ''));
  return {
    id: firstString(row, ['codigo', 'id', 'ticket_id', 'chamado'], `manual-${index}`),
    clientName,
    projectName,
    analystName: firstString(row, ['tecnico', 'responsavel', 'analista', 'atendente'], 'Nao informado'),
    hours: detectHours(row),
    date,
    subject: firstString(row, ['assunto', 'subject', 'titulo'], ''),
    status: firstString(row, ['status', 'situacao'], ''),
    raw: { ...rawTicket, manualImportRow: row },
  };
}

function expandRowsWithNestedServices(rows) {
  const expanded = [];
  for (const row of rows) {
    let pushedNested = false;
    for (const key of ['servico_realizado', 'servicos_realizados', 'atendimentos', 'apontamentos', 'horas', 'lancamentos']) {
      const nested = parseNestedRows(row[key]);
      for (const item of nested) {
        const merged = { ...row, ...item, rawTicket: row };
        if (detectHours(merged) > 0) {
          expanded.push(merged);
          pushedNested = true;
        }
      }
    }
    if (!pushedNested) expanded.push(row);
  }
  return expanded;
}

function parseNestedRows(value) {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object' && !Array.isArray(item)) : [];
  } catch {
    return [];
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url} retornou ${response.status}: ${await response.text()}`);
  return await response.json();
}

async function fetchMilvusClients(token, searchTerm = '') {
  const params = new URLSearchParams({ status: '1' });
  if (searchTerm) params.set('nome_fantasia', searchTerm);
  return unwrapRows(await fetchJson(`${MILVUS_CLIENTS_URL}?${params.toString()}`, {
    headers: { Authorization: token, 'Content-Type': 'application/json' },
  }));
}

async function fetchMilvusSlice(token, filter) {
  return await fetchJson(MILVUS_TICKETS_URL, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page: 1,
      per_page: PAGE_SIZE,
      order_by: 'codigo',
      descending: true,
      filtro_body: filter,
    }),
  });
}

function sliceValues(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter((value) => value !== undefined && value !== null).map(String))]
    .filter(Boolean)
    .slice(0, 30);
}

async function fetchClientTickets(token, clientName, dateFrom, dateTo) {
  const collected = new Map();
  const visited = new Set();
  const queue = [{ filter: { status: 'Todos', cliente: clientName }, depth: 0 }];
  const diagnostics = [];

  while (queue.length > 0 && visited.size < MAX_SLICES) {
    const current = queue.shift();
    const sliceKey = JSON.stringify(Object.keys(current.filter).sort().map((key) => [key, current.filter[key]]));
    if (visited.has(sliceKey)) continue;
    visited.add(sliceKey);

    const payload = await fetchMilvusSlice(token, current.filter);
    const rows = unwrapRows(payload);
    for (const row of rows) {
      const key = String(row.codigo || row.id || row.chamado || `slice-${visited.size}-${collected.size}`);
      collected.set(key, row);
    }

    const oldestDate = rows
      .map((row) => parseDateOnly(firstString(row, ['data_inicial', 'data_criacao', 'data_abertura', 'data_solucao'], '')))
      .filter(Boolean)
      .sort()[0] || null;
    const complete = rows.length < PAGE_SIZE || Boolean(oldestDate && oldestDate < dateFrom);
    diagnostics.push({ filter: current.filter, rows: rows.length, oldestDate, complete });
    if (complete || current.depth >= SLICE_FIELDS.length) continue;

    const field = SLICE_FIELDS[current.depth];
    for (const value of sliceValues(rows, field)) {
      queue.push({ filter: { ...current.filter, [field]: value }, depth: current.depth + 1 });
    }
  }

  const normalized = expandRowsWithNestedServices([...collected.values()])
    .map((row, index) => normalizeTicket(row, index))
    .filter((record) => record.hours > 0 && record.date && record.date >= dateFrom && record.date <= dateTo);

  return { records: normalized, diagnostics };
}

async function loadHubCatalog(supabase) {
  const [{ data: clients, error: clientsError }, { data: contracts, error: contractsError }] = await Promise.all([
    supabase.from('clients').select('id, razao_social, nome_fantasia, cnpj'),
    supabase.from('contracts').select('id, nome, codigo, client_id'),
  ]);
  if (clientsError) throw clientsError;
  if (contractsError) throw contractsError;
  return { clients: clients || [], contracts: contracts || [] };
}

async function writeJsonReport(fileName, data) {
  await mkdir(OUT_DIR, { recursive: true });
  const filePath = path.join(OUT_DIR, fileName);
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  return filePath;
}

async function writeCsvReport(fileName, headers, rows) {
  await mkdir(OUT_DIR, { recursive: true });
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const text = [headers, ...rows].map((row) => row.map(escape).join(';')).join('\n');
  const filePath = path.join(OUT_DIR, fileName);
  await writeFile(filePath, text, 'utf8');
  return filePath;
}

async function auditClients({ supabase, milvusToken, limitClients }) {
  const { clients, contracts } = await loadHubCatalog(supabase);
  const milvusRows = await fetchMilvusClients(milvusToken);
  const milvusNames = [...new Set(milvusRows
    .map((row) => firstString(row, ['nome_fantasia', 'nome', 'razao_social', 'cliente'], ''))
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const selectedNames = limitClients > 0 ? milvusNames.slice(0, limitClients) : milvusNames;

  const audit = selectedNames.map((name) => {
    const match = bestHubClientMatch(name, clients);
    return {
      milvus_client_name: name,
      status: match.status,
      confidence: Number(match.confidence.toFixed(4)),
      hub_client_id: match.item?.id || '',
      hub_client_name: match.item ? (match.item.nome_fantasia || match.item.razao_social || '') : '',
    };
  });

  const summary = {
    generated_at: new Date().toISOString(),
    milvus_clients_found: milvusNames.length,
    hub_clients_found: clients.length,
    hub_contracts_found: contracts.length,
    matched: audit.filter((row) => row.status === 'matched').length,
    pending: audit.filter((row) => row.status === 'pending').length,
    ambiguous: audit.filter((row) => row.status === 'ambiguous').length,
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = await writeJsonReport(`client-audit-${stamp}.json`, { summary, audit });
  const csvPath = await writeCsvReport(
    `client-audit-${stamp}.csv`,
    ['Cliente Milvus', 'Status', 'Confianca', 'Cliente Hub', 'ID Hub'],
    audit.map((row) => [row.milvus_client_name, row.status, row.confidence, row.hub_client_name, row.hub_client_id]),
  );

  return { summary, jsonPath, csvPath, audit };
}

async function upsertSupportCosts({ supabase, records, dateFrom, dateTo, hubClients, hubContracts, write }) {
  const clientCache = new Map();
  const projectCache = new Map();
  const runPayload = {
    date_from: dateFrom,
    date_to: dateTo,
    requested_client_name: null,
    requested_client_names: [],
    status: write ? 'running' : 'success',
    diagnostics: { mode: 'manual-import', dryRun: !write },
  };

  let syncRunId = null;
  if (write) {
    const { data, error } = await supabase.from('support_cost_sync_runs').insert(runPayload).select('id').single();
    if (error) throw error;
    syncRunId = data.id;
  }

  const ticketRows = [];
  const inconsistencies = [];

  for (const record of records) {
    const clientKey = compactName(record.clientName) || compactName('nao-informado');
    let clientEntry = clientCache.get(clientKey);
    if (!clientEntry) {
      const match = bestHubClientMatch(record.clientName, hubClients);
      clientEntry = { match, milvusClientId: null };
      if (write) {
        const { data, error } = await supabase
          .from('support_milvus_clients')
          .upsert({
            milvus_client_name: record.clientName,
            milvus_client_key: clientKey,
            raw: { manualImportSample: record.raw },
            last_seen_at: new Date().toISOString(),
          }, { onConflict: 'milvus_client_key' })
          .select('id')
          .single();
        if (error) throw error;
        clientEntry.milvusClientId = data.id;

        await supabase
          .from('support_milvus_client_mappings')
          .upsert({
            milvus_client_id: data.id,
            hub_client_id: match.item?.id || null,
            status: match.status,
            match_method: match.method,
            confidence: match.confidence,
            notes: match.status === 'matched' ? null : 'Revisar relacao Cliente Milvus x Cliente Hub.',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'milvus_client_id', ignoreDuplicates: true });
      }
      clientCache.set(clientKey, clientEntry);
    }

    const projectKey = `${clientKey}:${compactName(record.projectName || record.clientName)}`;
    let projectEntry = projectCache.get(projectKey);
    if (!projectEntry) {
      const projectMatch = bestHubContractMatch(record.projectName || record.clientName, hubContracts, clientEntry.match.item?.id || null);
      projectEntry = { match: projectMatch, milvusProjectId: null };
      if (write && clientEntry.milvusClientId) {
        const { data, error } = await supabase
          .from('support_milvus_projects')
          .upsert({
            milvus_client_id: clientEntry.milvusClientId,
            milvus_project_name: record.projectName || record.clientName,
            milvus_project_key: compactName(record.projectName || record.clientName),
            raw: { manualImportSample: record.raw },
            last_seen_at: new Date().toISOString(),
          }, { onConflict: 'milvus_client_id,milvus_project_key' })
          .select('id')
          .single();
        if (error) throw error;
        projectEntry.milvusProjectId = data.id;

        await supabase
          .from('support_milvus_project_mappings')
          .upsert({
            milvus_project_id: data.id,
            hub_contract_id: projectMatch.item?.id || null,
            status: projectMatch.status,
            match_method: projectMatch.method,
            confidence: projectMatch.confidence,
            notes: projectMatch.status === 'matched' ? null : 'Revisar relacao Projeto Milvus x Contrato Hub.',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'milvus_project_id', ignoreDuplicates: true });
      }
      projectCache.set(projectKey, projectEntry);
    }

    if (clientEntry.match.status !== 'matched') {
      inconsistencies.push({
        sync_run_id: syncRunId,
        reason_code: `client_${clientEntry.match.status}`,
        reason_detail: `Cliente Milvus sem match confiavel: ${record.clientName}`,
        milvus_client_id: clientEntry.milvusClientId,
        milvus_project_id: projectEntry.milvusProjectId,
        milvus_ticket_code: record.id,
        payload: record.raw,
      });
    }

    if (projectEntry.match.status !== 'matched') {
      inconsistencies.push({
        sync_run_id: syncRunId,
        reason_code: `project_${projectEntry.match.status}`,
        reason_detail: `Projeto/contrato Milvus sem match confiavel: ${record.projectName}`,
        milvus_client_id: clientEntry.milvusClientId,
        milvus_project_id: projectEntry.milvusProjectId,
        milvus_ticket_code: record.id,
        payload: record.raw,
      });
    }

    ticketRows.push({
      sync_run_id: syncRunId,
      milvus_ticket_code: record.id,
      milvus_ticket_id: String(record.raw?.id || record.id),
      milvus_client_id: clientEntry.milvusClientId,
      milvus_project_id: projectEntry.milvusProjectId,
      hub_client_id: projectEntry.match.item?.client_id || clientEntry.match.item?.id || null,
      hub_contract_id: projectEntry.match.item?.id || null,
      client_name: record.clientName,
      project_name: record.projectName,
      analyst_name: record.analystName,
      ticket_date: record.date,
      hours: record.hours,
      subject: record.subject,
      status: record.status,
      raw: record.raw,
      updated_at: new Date().toISOString(),
    });
  }

  if (write && ticketRows.length > 0) {
    for (let index = 0; index < ticketRows.length; index += 500) {
      const chunk = ticketRows.slice(index, index + 500);
      const { error } = await supabase.from('support_cost_tickets').upsert(chunk, { onConflict: 'milvus_ticket_code' });
      if (error) throw error;
    }
  }

  if (write && inconsistencies.length > 0) {
    for (let index = 0; index < inconsistencies.length; index += 500) {
      const chunk = inconsistencies.slice(index, index + 500);
      const { error } = await supabase.from('support_cost_inconsistencies').insert(chunk);
      if (error) throw error;
    }
  }

  if (write) {
    const totalHours = records.reduce((sum, record) => sum + record.hours, 0);
    const monthKey = dateFrom.slice(0, 7) === dateTo.slice(0, 7) ? dateFrom.slice(0, 7) : `${dateFrom}_${dateTo}`;
    await supabase
      .from('support_cost_monthly_loads')
      .upsert({
        month_key: monthKey,
        period_start: dateFrom,
        period_end: dateTo,
        status: 'imported',
        sync_run_id: syncRunId,
        tickets_count: records.length,
        total_hours: Number(totalHours.toFixed(4)),
        inconsistency_count: inconsistencies.length,
        last_synced_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'month_key' });

    await supabase
      .from('support_cost_sync_runs')
      .update({
        status: 'success',
        records_detected: records.length,
        tickets_stored: records.length,
        inconsistency_count: inconsistencies.length,
        diagnostics: { mode: 'manual-import', totalHours: Number(totalHours.toFixed(4)) },
        ended_at: new Date().toISOString(),
      })
      .eq('id', syncRunId);
  }

  return { tickets: ticketRows.length, inconsistencies: inconsistencies.length, syncRunId };
}

async function importClosedPeriod({ supabase, milvusToken, dateFrom, dateTo, clientName, limitClients, write }) {
  const { clients, contracts } = await loadHubCatalog(supabase);
  const clientNames = clientName
    ? [clientName]
    : (await auditClients({ supabase, milvusToken, limitClients })).audit.map((row) => row.milvus_client_name);

  const recordsByKey = new Map();
  const clientDiagnostics = [];

  for (const name of clientNames) {
    const result = await fetchClientTickets(milvusToken, name, dateFrom, dateTo);
    for (const record of result.records) {
      const key = `${record.id}|${record.date}|${record.clientName}|${record.projectName}|${record.analystName}|${record.hours.toFixed(6)}`;
      recordsByKey.set(key, record);
    }
    clientDiagnostics.push({
      client: name,
      tickets: result.records.length,
      hours: Number(result.records.reduce((sum, record) => sum + record.hours, 0).toFixed(4)),
      slices: result.diagnostics.length,
    });
  }

  const records = [...recordsByKey.values()].sort((a, b) => (
    String(a.date).localeCompare(String(b.date))
    || a.clientName.localeCompare(b.clientName, 'pt-BR')
    || a.projectName.localeCompare(b.projectName, 'pt-BR')
  ));

  const persist = await upsertSupportCosts({
    supabase,
    records,
    dateFrom,
    dateTo,
    hubClients: clients,
    hubContracts: contracts,
    write,
  });

  const summary = {
    generated_at: new Date().toISOString(),
    dry_run: !write,
    period: { from: dateFrom, to: dateTo },
    clients_processed: clientNames.length,
    tickets_detected: records.length,
    total_hours: Number(records.reduce((sum, record) => sum + record.hours, 0).toFixed(4)),
    inconsistencies: persist.inconsistencies,
    sync_run_id: persist.syncRunId,
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = await writeJsonReport(`manual-import-${dateFrom}-to-${dateTo}-${stamp}.json`, {
    summary,
    clientDiagnostics,
    records,
  });
  const csvPath = await writeCsvReport(
    `manual-import-${dateFrom}-to-${dateTo}-${stamp}.csv`,
    ['Data', 'Cliente', 'Projeto', 'Responsavel', 'Horas', 'Ticket', 'Assunto'],
    records.map((record) => [record.date, record.clientName, record.projectName, record.analystName, record.hours, record.id, record.subject]),
  );

  return { summary, jsonPath, csvPath };
}

async function main() {
  await loadEnvFile(path.resolve(process.cwd(), '.env'));
  await loadEnvFile(path.resolve(process.cwd(), '.env.local'));

  const args = parseArgs(process.argv);
  const supabaseUrl = requireEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const milvusToken = requireEnv('MILVUS_TOKEN');
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  if (args.mode === 'audit') {
    const result = await auditClients({ supabase, milvusToken, limitClients: args.limitClients });
    console.log(JSON.stringify({
      mode: 'audit',
      ...result.summary,
      files: { json: result.jsonPath, csv: result.csvPath },
    }, null, 2));
    return;
  }

  if (args.mode === 'import') {
    if (!args.from || !args.to) throw new Error('Use --from YYYY-MM-DD --to YYYY-MM-DD para importar.');
    const result = await importClosedPeriod({
      supabase,
      milvusToken,
      dateFrom: args.from,
      dateTo: args.to,
      clientName: args.client,
      limitClients: args.limitClients,
      write: args.write,
    });
    console.log(JSON.stringify({
      mode: 'import',
      ...result.summary,
      files: { json: result.jsonPath, csv: result.csvPath },
    }, null, 2));
    if (!args.write) {
      console.log('\nDry-run concluido. Para gravar no banco, revise os arquivos e rode novamente com --write.');
    }
    return;
  }

  throw new Error('Modo invalido. Use --mode audit ou --mode import.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
