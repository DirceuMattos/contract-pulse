import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Client, Contract, Resource, Settings, Alert, Snapshot, OverheadItem,
  HistoryEvent, DocumentAttachment, AttachmentDescriptionConfig, JobTitle, Team,
} from '@/types';
import {
  clientFromDb, clientToDb,
  contractFromDb, contractToDb,
  resourceFromDb, resourceToDb,
  overheadFromDb, overheadToDb,
  historyEventFromDb, historyEventToDb,
  snapshotFromDb, snapshotToDb,
  settingsFromDb, settingsToDb,
  attachmentFromDb, attachmentToDb,
  attachmentConfigFromDb, attachmentConfigToDb,
  jobTitleFromDb, jobTitleToDb,
  teamFromDb, teamToDb,
} from '@/lib/dbMappers';
import { autoLinkHRPerson } from '@/lib/autoLinkHR';
import {
  mockClients, mockContracts, mockResources, mockSnapshots,
  defaultSettings, mockOverheadItems, mockHistoryEvents,
  defaultAttachmentConfigs, mockAttachments, defaultJobTitles, defaultTeams,
} from '@/data/mockData';

interface DataContextType {
  clients: Client[];
  contracts: Contract[];
  resources: Resource[];
  settings: Settings;
  alerts: Alert[];
  snapshots: Snapshot[];
  overheadItems: OverheadItem[];
  historyEvents: HistoryEvent[];
  attachments: DocumentAttachment[];
  attachmentDescriptionConfigs: AttachmentDescriptionConfig[];
  jobTitles: JobTitle[];
  teams: Team[];
  distinctHRNames: { nome: string; custoBase: number; cargo?: string; senioridade?: string }[];
  loading: boolean;

  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Client>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  getClient: (id: string) => Client | undefined;

  addContract: (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Contract>;
  updateContract: (id: string, data: Partial<Contract>) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  getContract: (id: string) => Contract | undefined;
  getContractsByClient: (clientId: string) => Contract[];

  addResource: (resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Resource>;
  updateResource: (id: string, data: Partial<Resource>) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  getResourcesByContract: (contractId: string) => Resource[];
  refreshResources: () => Promise<void>;

  updateSettings: (data: Partial<Settings>) => Promise<void>;

  addSnapshot: (snapshot: Omit<Snapshot, 'id' | 'createdAt'>) => Promise<Snapshot>;
  getSnapshotsByContract: (contractId: string) => Snapshot[];

  addOverheadItem: (item: Omit<OverheadItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<OverheadItem>;
  updateOverheadItem: (id: string, data: Partial<OverheadItem>) => Promise<void>;
  deleteOverheadItem: (id: string) => Promise<void>;
  getOverheadByContract: (contractId: string) => OverheadItem[];

  addHistoryEvent: (event: Omit<HistoryEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<HistoryEvent>;
  updateHistoryEvent: (id: string, data: Partial<HistoryEvent>) => Promise<void>;
  deleteHistoryEvent: (id: string) => Promise<void>;
  getHistoryEventsByContract: (contractId: string) => HistoryEvent[];

  addAttachment: (attachment: Omit<DocumentAttachment, 'id'>) => Promise<DocumentAttachment>;
  updateAttachment: (id: string, data: Partial<DocumentAttachment>) => Promise<void>;
  deleteAttachment: (id: string) => Promise<void>;
  getAttachmentsByContract: (contractId: string) => DocumentAttachment[];

  addDescriptionConfig: (config: Omit<AttachmentDescriptionConfig, 'id'>) => Promise<AttachmentDescriptionConfig>;
  updateDescriptionConfig: (id: string, data: Partial<AttachmentDescriptionConfig>) => Promise<void>;
  getActiveDescriptionConfigs: () => AttachmentDescriptionConfig[];

  addJobTitle: (label: string, teamId?: string) => Promise<JobTitle>;
  updateJobTitle: (id: string, data: Partial<JobTitle>) => Promise<void>;
  deleteJobTitle: (id: string) => Promise<void>;
  getActiveJobTitles: () => JobTitle[];

  addTeam: (name: string, description?: string, sortOrder?: number) => Promise<Team>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<boolean>;
  getActiveTeams: () => Team[];

  resetToDemo: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [alerts] = useState<Alert[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [overheadItems, setOverheadItems] = useState<OverheadItem[]>([]);
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [attachmentConfigs, setAttachmentConfigs] = useState<AttachmentDescriptionConfig[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const handleError = useCallback((err: unknown, message: string) => {
    console.error(message, err);
    toast({ title: 'Erro', description: message, variant: 'destructive' });
  }, [toast]);

  // ─── Load all data via direct auth listener ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      setLoading(true);
      try {
        const [
          { data: clientsData },
          { data: contractsData },
          { data: resourcesData },
          { data: overheadData },
          { data: historyData },
          { data: snapshotsData },
          { data: settingsData },
          { data: attachmentsData },
          { data: configsData },
          { data: jobTitlesData },
          { data: teamsData },
        ] = await Promise.all([
          supabase.from('clients').select('*').order('created_at'),
          supabase.from('contracts').select('*').order('created_at'),
          supabase.from('resources').select('*').order('created_at'),
          supabase.from('overhead_items').select('*').order('created_at'),
          supabase.from('history_events').select('*').order('event_date'),
          supabase.from('snapshots').select('*').order('created_at'),
          supabase.from('settings').select('*').limit(1),
          supabase.from('document_attachments').select('*').order('uploaded_at'),
          supabase.from('attachment_description_configs').select('*').order('sort_order'),
          supabase.from('job_titles').select('*').order('label'),
          supabase.from('teams').select('*').order('sort_order'),
        ]);

        if (cancelled) return;

        setClients((clientsData ?? []).map(r => clientFromDb(r as unknown as Record<string, unknown>)));
        setContracts((contractsData ?? []).map(r => contractFromDb(r as unknown as Record<string, unknown>)));
        setResources((resourcesData ?? []).map(r => resourceFromDb(r as unknown as Record<string, unknown>)));
        setOverheadItems((overheadData ?? []).map(r => overheadFromDb(r as unknown as Record<string, unknown>)));
        setHistoryEvents((historyData ?? []).map(r => historyEventFromDb(r as unknown as Record<string, unknown>)));
        setSnapshots((snapshotsData ?? []).map(r => snapshotFromDb(r as unknown as Record<string, unknown>)));
        setAttachments((attachmentsData ?? []).map(r => attachmentFromDb(r as unknown as Record<string, unknown>)));
        setAttachmentConfigs((configsData ?? []).map(r => attachmentConfigFromDb(r as unknown as Record<string, unknown>)));
        setJobTitles((jobTitlesData ?? []).map(r => jobTitleFromDb(r as unknown as Record<string, unknown>)));
        setTeams((teamsData ?? []).map(r => teamFromDb(r as unknown as Record<string, unknown>)));

        if (settingsData && settingsData.length > 0) {
          const row = settingsData[0] as unknown as Record<string, unknown>;
          setSettingsId(row.id as string);
          setSettings(settingsFromDb(row));
        }
      } catch (err) {
        if (!cancelled) console.error('Erro ao carregar dados do banco.', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const clearAll = () => {
      setClients([]);
      setContracts([]);
      setResources([]);
      setSettings(defaultSettings);
      setSnapshots([]);
      setOverheadItems([]);
      setHistoryEvents([]);
      setAttachments([]);
      setAttachmentConfigs([]);
      setJobTitles([]);
      setTeams([]);
      setSettingsId(null);
      setLoading(false);
    };

    // Listen directly to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadAll();
      } else if (event === 'SIGNED_OUT') {
        clearAll();
      }
    });

    // Check if there's already a session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadAll();
      } else {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ─── CLIENT ───────────────────────────────────────────────────────────────────
  const addClient = useCallback(async (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> => {
    const { data: row, error } = await supabase.from('clients').insert(clientToDb(data) as any).select().single();
    if (error) { handleError(error, 'Erro ao adicionar cliente.'); throw error; }
    const client = clientFromDb(row as unknown as Record<string, unknown>);
    setClients(prev => [...prev, client]);
    return client;
  }, [handleError]);

  const updateClient = useCallback(async (id: string, data: Partial<Client>): Promise<void> => {
    const prev = clients.find(c => c.id === id)!;
    const merged = { ...prev, ...data };
    const dbData: Record<string, unknown> = clientToDb(merged);
    setClients(prevList => prevList.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c));
    const { error } = await supabase.from('clients').update(dbData).eq('id', id);
    if (error) { setClients(prevList => prevList.map(c => c.id === id ? prev : c)); handleError(error, 'Erro ao atualizar cliente.'); }
  }, [clients, handleError]);

  const deleteClient = useCallback(async (id: string): Promise<void> => {
    // Verifica se há contratos vinculados antes de tentar excluir
    const linkedContracts = contracts.filter(c => c.clientId === id);
    if (linkedContracts.length > 0) {
      handleError(
        { message: `Este cliente possui ${linkedContracts.length} contrato(s) vinculado(s). Remova os contratos antes de excluir o cliente.` },
        'Não é possível excluir o cliente.'
      );
      return;
    }
    const snapshot = clients;
    setClients(prev => prev.filter(c => c.id !== id));
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { setClients(snapshot); handleError(error, 'Erro ao excluir cliente.'); }
  }, [clients, contracts, handleError]);

  const getClient = useCallback((id: string) => clients.find(c => c.id === id), [clients]);

  // ─── CONTRACT ─────────────────────────────────────────────────────────────────
  const addContract = useCallback(async (data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contract> => {
    const { data: row, error } = await supabase.from('contracts').insert(contractToDb(data) as any).select().single();
    if (error) { handleError(error, 'Erro ao adicionar contrato.'); throw error; }
    const contract = contractFromDb(row as unknown as Record<string, unknown>);
    setContracts(prev => [...prev, contract]);
    return contract;
  }, [handleError]);

  const updateContract = useCallback(async (id: string, data: Partial<Contract>): Promise<void> => {
    const prev = contracts.find(c => c.id === id)!;
    if (!prev) return;
    const merged = { ...prev, ...data };
    const dbData = contractToDb(merged);
    if (data.ultimaAtualizacaoRecursos) dbData.ultima_atualizacao_recursos = data.ultimaAtualizacaoRecursos;
    setContracts(prevList => prevList.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c));
    const { error } = await supabase.from('contracts').update(dbData).eq('id', id);
    if (error) { setContracts(prevList => prevList.map(c => c.id === id ? prev : c)); handleError(error, 'Erro ao atualizar contrato.'); }
  }, [contracts, handleError]);

  const deleteContract = useCallback(async (id: string): Promise<void> => {
    const snapshot = { contracts, resources, overheadItems, snapshots, historyEvents, attachments };
    setContracts(prev => prev.filter(c => c.id !== id));
    setResources(prev => prev.filter(r => r.contractId !== id));
    setOverheadItems(prev => prev.filter(o => o.contractId !== id));
    setSnapshots(prev => prev.filter(s => s.contractId !== id));
    setHistoryEvents(prev => prev.filter(e => e.contractId !== id));
    setAttachments(prev => prev.filter(a => a.contractId !== id));
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) {
      setContracts(snapshot.contracts);
      setResources(snapshot.resources);
      setOverheadItems(snapshot.overheadItems);
      setSnapshots(snapshot.snapshots);
      setHistoryEvents(snapshot.historyEvents);
      setAttachments(snapshot.attachments);
      handleError(error, 'Erro ao excluir contrato.');
    }
  }, [contracts, resources, overheadItems, snapshots, historyEvents, attachments, handleError]);

  const getContract = useCallback((id: string) => contracts.find(c => c.id === id), [contracts]);
  const getContractsByClient = useCallback((clientId: string) => contracts.filter(c => c.clientId === clientId), [contracts]);

  // ─── RESOURCE ─────────────────────────────────────────────────────────────────
  const addResource = useCallback(async (data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>): Promise<Resource> => {
    // Auto-link to HR Master if not already linked
    const hrPersonId = await autoLinkHRPerson(data.nome, data.tipo, data.hrPersonId);
    const enriched = hrPersonId ? { ...data, hrPersonId } : data;
    const { data: row, error } = await supabase.from('resources').insert(resourceToDb(enriched) as any).select().single();
    if (error) { handleError(error, 'Erro ao adicionar recurso.'); throw error; }
    const resource = resourceFromDb(row as unknown as Record<string, unknown>);
    setResources(prev => [...prev, resource]);
    await updateContract(data.contractId, { ultimaAtualizacaoRecursos: new Date().toISOString() });
    return resource;
  }, [handleError, updateContract]);

  const updateResource = useCallback(async (id: string, data: Partial<Resource>): Promise<void> => {
    const prev = resources.find(r => r.id === id)!;
    if (!prev) return;
    // Auto-link if name changed and not already linked
    if (data.nome && !data.hrPersonId && !prev.hrPersonId) {
      const hrPersonId = await autoLinkHRPerson(data.nome, data.tipo ?? prev.tipo);
      if (hrPersonId) data = { ...data, hrPersonId };
    }
    const merged = { ...prev, ...data };
    setResources(prevList => prevList.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r));
    const { error } = await supabase.from('resources').update(resourceToDb(merged)).eq('id', id);
    if (error) { setResources(prevList => prevList.map(r => r.id === id ? prev : r)); handleError(error, 'Erro ao atualizar recurso.'); }
    else await updateContract(prev.contractId, { ultimaAtualizacaoRecursos: new Date().toISOString() });
  }, [resources, handleError, updateContract]);

  const deleteResource = useCallback(async (id: string): Promise<void> => {
    const prev = resources.find(r => r.id === id);
    setResources(p => p.filter(r => r.id !== id));
    // Remove pendências de substituição vinculadas antes de excluir o recurso
    // (sem isso, a FK pending_replacements_resource_id_fkey bloqueia o delete)
    const { error: pendingErr } = await supabase.from('pending_replacements').delete().eq('resource_id', id);
    if (pendingErr) { setResources(p => prev ? [...p, prev] : p); handleError(pendingErr, 'Erro ao excluir recurso.'); return; }
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) { setResources(p => prev ? [...p, prev] : p); handleError(error, 'Erro ao excluir recurso.'); }
    else if (prev) await updateContract(prev.contractId, { ultimaAtualizacaoRecursos: new Date().toISOString() });
  }, [resources, handleError, updateContract]);

  const getResourcesByContract = useCallback((contractId: string) => resources.filter(r => r.contractId === contractId), [resources]);

  const refreshResources = useCallback(async () => {
    const { data } = await supabase.from('resources').select('*').order('created_at');
    if (data) setResources(data.map(r => resourceFromDb(r as unknown as Record<string, unknown>)));
  }, []);

  // ─── SETTINGS ─────────────────────────────────────────────────────────────────
  const updateSettings = useCallback(async (data: Partial<Settings>): Promise<void> => {
    const prev = settings;
    setSettings(s => ({ ...s, ...data }));
    if (settingsId) {
      const { error } = await supabase.from('settings').update(settingsToDb(data)).eq('id', settingsId);
      if (error) { setSettings(prev); handleError(error, 'Erro ao atualizar configurações.'); }
    }
  }, [settings, settingsId, handleError]);

  // ─── SNAPSHOT ─────────────────────────────────────────────────────────────────
  const addSnapshot = useCallback(async (data: Omit<Snapshot, 'id' | 'createdAt'>): Promise<Snapshot> => {
    const { data: row, error } = await supabase.from('snapshots').insert(snapshotToDb(data) as any).select().single();
    if (error) { handleError(error, 'Erro ao salvar snapshot.'); throw error; }
    const snapshot = snapshotFromDb(row as unknown as Record<string, unknown>);
    setSnapshots(prev => [...prev, snapshot]);
    return snapshot;
  }, [handleError]);

  const getSnapshotsByContract = useCallback((contractId: string) =>
    snapshots.filter(s => s.contractId === contractId).sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ), [snapshots]);

  // ─── OVERHEAD ─────────────────────────────────────────────────────────────────
  const addOverheadItem = useCallback(async (data: Omit<OverheadItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<OverheadItem> => {
    const { data: row, error } = await supabase.from('overhead_items').insert(overheadToDb(data) as any).select().single();
    if (error) { handleError(error, 'Erro ao adicionar overhead.'); throw error; }
    const item = overheadFromDb(row as unknown as Record<string, unknown>);
    setOverheadItems(prev => [...prev, item]);
    return item;
  }, [handleError]);

  const updateOverheadItem = useCallback(async (id: string, data: Partial<OverheadItem>): Promise<void> => {
    const prev = overheadItems.find(o => o.id === id)!;
    if (!prev) return;
    const merged = { ...prev, ...data };
    setOverheadItems(prevList => prevList.map(o => o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o));
    const { error } = await supabase.from('overhead_items').update(overheadToDb(merged)).eq('id', id);
    if (error) { setOverheadItems(prevList => prevList.map(o => o.id === id ? prev : o)); handleError(error, 'Erro ao atualizar overhead.'); }
  }, [overheadItems, handleError]);

  const deleteOverheadItem = useCallback(async (id: string): Promise<void> => {
    setOverheadItems(p => p.filter(o => o.id !== id));
    const { error } = await supabase.from('overhead_items').delete().eq('id', id);
    if (error) handleError(error, 'Erro ao excluir overhead.');
  }, [handleError]);

  const getOverheadByContract = useCallback((contractId: string) => overheadItems.filter(o => o.contractId === contractId), [overheadItems]);

  // ─── HISTORY EVENT ────────────────────────────────────────────────────────────
  const addHistoryEvent = useCallback(async (data: Omit<HistoryEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<HistoryEvent> => {
    const { data: row, error } = await supabase.from('history_events').insert(historyEventToDb(data) as any).select().single();
    if (error) { handleError(error, 'Erro ao adicionar evento.'); throw error; }
    const event = historyEventFromDb(row as unknown as Record<string, unknown>);
    setHistoryEvents(prev => [...prev, event]);
    return event;
  }, [handleError]);

  const updateHistoryEvent = useCallback(async (id: string, data: Partial<HistoryEvent>): Promise<void> => {
    const prev = historyEvents.find(e => e.id === id)!;
    if (!prev) return;
    const merged = { ...prev, ...data };
    setHistoryEvents(prevList => prevList.map(e => e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e));
    const { error } = await supabase.from('history_events').update(historyEventToDb(merged)).eq('id', id);
    if (error) { setHistoryEvents(prevList => prevList.map(e => e.id === id ? prev : e)); handleError(error, 'Erro ao atualizar evento.'); }
  }, [historyEvents, handleError]);

  const deleteHistoryEvent = useCallback(async (id: string): Promise<void> => {
    setHistoryEvents(p => p.filter(e => e.id !== id));
    const { error } = await supabase.from('history_events').delete().eq('id', id);
    if (error) handleError(error, 'Erro ao excluir evento.');
  }, [handleError]);

  const getHistoryEventsByContract = useCallback((contractId: string) => historyEvents.filter(e => e.contractId === contractId), [historyEvents]);

  // ─── ATTACHMENT ───────────────────────────────────────────────────────────────
  const addAttachment = useCallback(async (data: Omit<DocumentAttachment, 'id'>): Promise<DocumentAttachment> => {
    const { data: row, error } = await supabase.from('document_attachments').insert(attachmentToDb(data) as any).select().single();
    if (error) { handleError(error, 'Erro ao adicionar anexo.'); throw error; }
    const att = attachmentFromDb(row as unknown as Record<string, unknown>);
    setAttachments(prev => [...prev, att]);
    return att;
  }, [handleError]);

  const updateAttachment = useCallback(async (id: string, data: Partial<DocumentAttachment>): Promise<void> => {
    const dbData: Record<string, unknown> = {};
    if (data.storageKey !== undefined) dbData.storage_key = data.storageKey;
    if (data.fileName !== undefined) dbData.file_name = data.fileName;
    if (data.descriptionType !== undefined) dbData.description_type = data.descriptionType;
    if (data.descriptionText !== undefined) dbData.description_text = data.descriptionText;
    if (data.notes !== undefined) dbData.notes = data.notes;
    const { error } = await supabase.from('document_attachments').update(dbData).eq('id', id);
    if (error) { handleError(error, 'Erro ao atualizar anexo.'); return; }
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
  }, [handleError]);

  const deleteAttachment = useCallback(async (id: string): Promise<void> => {
    const att = attachments.find(a => a.id === id);
    setAttachments(p => p.filter(a => a.id !== id));
    if (att && att.storageKey && !att.storageKey.startsWith('mock-')) {
      await supabase.storage.from('contract-documents').remove([att.storageKey]);
    }
    const { error } = await supabase.from('document_attachments').delete().eq('id', id);
    if (error) handleError(error, 'Erro ao excluir anexo.');
  }, [attachments, handleError]);

  const getAttachmentsByContract = useCallback((contractId: string) => attachments.filter(a => a.contractId === contractId), [attachments]);

  // ─── ATTACHMENT CONFIG ────────────────────────────────────────────────────────
  const addDescriptionConfig = useCallback(async (data: Omit<AttachmentDescriptionConfig, 'id'>): Promise<AttachmentDescriptionConfig> => {
    const { data: row, error } = await supabase.from('attachment_description_configs').insert(attachmentConfigToDb(data) as any).select().single();
    if (error) { handleError(error, 'Erro ao adicionar configuração.'); throw error; }
    const config = attachmentConfigFromDb(row as unknown as Record<string, unknown>);
    setAttachmentConfigs(prev => [...prev, config]);
    return config;
  }, [handleError]);

  const updateDescriptionConfig = useCallback(async (id: string, data: Partial<AttachmentDescriptionConfig>): Promise<void> => {
    const prev = attachmentConfigs.find(c => c.id === id)!;
    if (!prev) return;
    setAttachmentConfigs(prevList => prevList.map(c => c.id === id ? { ...c, ...data } : c));
    const { error } = await supabase.from('attachment_description_configs').update(attachmentConfigToDb({ ...prev, ...data })).eq('id', id);
    if (error) { setAttachmentConfigs(prevList => prevList.map(c => c.id === id ? prev : c)); handleError(error, 'Erro ao atualizar configuração.'); }
  }, [attachmentConfigs, handleError]);

  const getActiveDescriptionConfigs = useCallback(() =>
    attachmentConfigs.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder), [attachmentConfigs]);

  // ─── JOB TITLE ────────────────────────────────────────────────────────────────
  const addJobTitle = useCallback(async (label: string, teamId?: string): Promise<JobTitle> => {
    const { data: row, error } = await supabase.from('job_titles').insert(jobTitleToDb({ label, isActive: true, teamId }) as any).select().single();
    if (error) { handleError(error, 'Erro ao adicionar cargo.'); throw error; }
    const jt = jobTitleFromDb(row as unknown as Record<string, unknown>);
    setJobTitles(prev => [...prev, jt]);
    return jt;
  }, [handleError]);

  const updateJobTitle = useCallback(async (id: string, data: Partial<JobTitle>): Promise<void> => {
    const prev = jobTitles.find(jt => jt.id === id)!;
    if (!prev) return;
    setJobTitles(prevList => prevList.map(jt => jt.id === id ? { ...jt, ...data } : jt));
    const { error } = await supabase.from('job_titles').update(jobTitleToDb({ ...prev, ...data })).eq('id', id);
    if (error) { setJobTitles(prevList => prevList.map(jt => jt.id === id ? prev : jt)); handleError(error, 'Erro ao atualizar cargo.'); }
  }, [jobTitles, handleError]);

  const deleteJobTitle = useCallback(async (id: string): Promise<void> => {
    setJobTitles(p => p.filter(jt => jt.id !== id));
    const { error } = await supabase.from('job_titles').delete().eq('id', id);
    if (error) handleError(error, 'Erro ao excluir cargo.');
  }, [handleError]);

  const getActiveJobTitles = useCallback(() => jobTitles.filter(jt => jt.isActive).sort((a, b) => a.label.localeCompare(b.label)), [jobTitles]);

  // ─── TEAM ─────────────────────────────────────────────────────────────────────
  const addTeam = useCallback(async (name: string, description?: string, sortOrder?: number): Promise<Team> => {
    const effectiveSort = sortOrder ?? (teams.reduce((max, t) => Math.max(max, t.sortOrder), 0) + 1);
    const { data: row, error } = await supabase.from('teams').insert(teamToDb({ name, description, isActive: true, sortOrder: effectiveSort }) as any).select().single();
    if (error) { handleError(error, 'Erro ao adicionar equipe.'); throw error; }
    const team = teamFromDb(row as unknown as Record<string, unknown>);
    setTeams(prev => [...prev, team]);
    return team;
  }, [teams, handleError]);

  const updateTeam = useCallback(async (id: string, data: Partial<Team>): Promise<void> => {
    const prev = teams.find(t => t.id === id)!;
    if (!prev) return;
    setTeams(prevList => prevList.map(t => t.id === id ? { ...t, ...data } : t));
    const { error } = await supabase.from('teams').update(teamToDb({ ...prev, ...data })).eq('id', id);
    if (error) { setTeams(prevList => prevList.map(t => t.id === id ? prev : t)); handleError(error, 'Erro ao atualizar equipe.'); }
  }, [teams, handleError]);

  const deleteTeam = useCallback(async (id: string): Promise<boolean> => {
    const hasLinkedJobs = jobTitles.some(jt => jt.teamId === id);
    if (hasLinkedJobs) return false;
    setTeams(p => p.filter(t => t.id !== id));
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) { handleError(error, 'Erro ao excluir equipe.'); return false; }
    return true;
  }, [jobTitles, handleError]);

  const getActiveTeams = useCallback(() => teams.filter(t => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder), [teams]);

  // ─── RESET TO DEMO ────────────────────────────────────────────────────────────
  const resetToDemo = useCallback(async (): Promise<void> => {
    try {
      // Delete all data (cascade handles related tables)
      await Promise.all([
        supabase.from('document_attachments').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('history_events').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('overhead_items').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('resources').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('job_titles').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);
      await Promise.all([
        supabase.from('contracts').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('attachment_description_configs').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);
      await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insert demo data (without id/createdAt/updatedAt so DB generates them)
      const [
        { data: insertedClients },
        { data: insertedTeams },
        { data: insertedConfigs },
      ] = await Promise.all([
        supabase.from('clients').insert(mockClients.map(c => clientToDb(c)) as any).select(),
        supabase.from('teams').insert(defaultTeams.map(t => teamToDb(t)) as any).select(),
        supabase.from('attachment_description_configs').insert(defaultAttachmentConfigs.map(c => attachmentConfigToDb(c)) as any).select(),
      ]);

      const clientIdMap: Record<string, string> = {};
      (insertedClients ?? []).forEach((row, i) => {
        clientIdMap[mockClients[i].id] = (row as unknown as Record<string, unknown>).id as string;
      });

      const mappedContracts = mockContracts.map(c => ({ ...contractToDb({ ...c, clientId: clientIdMap[c.clientId] ?? c.clientId }) }));
      const { data: insertedContracts } = await supabase.from('contracts').insert(mappedContracts as any).select();

      const contractIdMap: Record<string, string> = {};
      (insertedContracts ?? []).forEach((row, i) => {
        contractIdMap[mockContracts[i].id] = (row as unknown as Record<string, unknown>).id as string;
      });

      const mapContractId = (id: string) => contractIdMap[id] ?? id;

      await Promise.all([
        supabase.from('resources').insert(mockResources.map(r => resourceToDb({ ...r, contractId: mapContractId(r.contractId) })) as any),
        supabase.from('overhead_items').insert(mockOverheadItems.map(o => overheadToDb({ ...o, contractId: mapContractId(o.contractId) })) as any),
        supabase.from('history_events').insert(mockHistoryEvents.map(e => historyEventToDb({ ...e, contractId: mapContractId(e.contractId) })) as any),
        supabase.from('snapshots').insert(mockSnapshots.map(s => snapshotToDb({ ...s, contractId: mapContractId(s.contractId) })) as any),
        supabase.from('document_attachments').insert(mockAttachments.map(a => attachmentToDb({ ...a, contractId: mapContractId(a.contractId) })) as any),
      ]);

      if (settingsId) {
        await supabase.from('settings').update(settingsToDb(defaultSettings)).eq('id', settingsId);
      }

      // Reload
      const [
        { data: clientsData },
        { data: contractsData },
        { data: resourcesData },
        { data: overheadData },
        { data: historyData },
        { data: snapshotsData },
        { data: attachmentsData },
        { data: configsData },
        { data: teamsData },
      ] = await Promise.all([
        supabase.from('clients').select('*').order('created_at'),
        supabase.from('contracts').select('*').order('created_at'),
        supabase.from('resources').select('*').order('created_at'),
        supabase.from('overhead_items').select('*').order('created_at'),
        supabase.from('history_events').select('*').order('event_date'),
        supabase.from('snapshots').select('*').order('created_at'),
        supabase.from('document_attachments').select('*').order('uploaded_at'),
        supabase.from('attachment_description_configs').select('*').order('sort_order'),
        supabase.from('teams').select('*').order('sort_order'),
      ]);

      setClients((clientsData ?? []).map(r => clientFromDb(r as unknown as Record<string, unknown>)));
      setContracts((contractsData ?? []).map(r => contractFromDb(r as unknown as Record<string, unknown>)));
      setResources((resourcesData ?? []).map(r => resourceFromDb(r as unknown as Record<string, unknown>)));
      setOverheadItems((overheadData ?? []).map(r => overheadFromDb(r as unknown as Record<string, unknown>)));
      setHistoryEvents((historyData ?? []).map(r => historyEventFromDb(r as unknown as Record<string, unknown>)));
      setSnapshots((snapshotsData ?? []).map(r => snapshotFromDb(r as unknown as Record<string, unknown>)));
      setAttachments((attachmentsData ?? []).map(r => attachmentFromDb(r as unknown as Record<string, unknown>)));
      setAttachmentConfigs((configsData ?? []).map(r => attachmentConfigFromDb(r as unknown as Record<string, unknown>)));
      setTeams((teamsData ?? []).map(r => teamFromDb(r as unknown as Record<string, unknown>)));
      setSettings(defaultSettings);

      // Seed job_titles after teams are inserted
      const { data: newTeams } = await supabase.from('teams').select('*').order('sort_order');
      const teamNameMap: Record<string, string> = {};
      (newTeams ?? []).forEach(row => {
        const t = teamFromDb(row as unknown as Record<string, unknown>);
        teamNameMap[t.name] = t.id;
      });
      const mappedJobTitles = defaultJobTitles.map(jt => ({
        ...jobTitleToDb({ ...jt, teamId: jt.teamId ? teamNameMap[jt.teamId] ?? jt.teamId : undefined }),
      }));
      await supabase.from('job_titles').insert(mappedJobTitles);
      const { data: jtData } = await supabase.from('job_titles').select('*').order('label');
      setJobTitles((jtData ?? []).map(r => jobTitleFromDb(r as unknown as Record<string, unknown>)));
      setTeams((newTeams ?? []).map(r => teamFromDb(r as unknown as Record<string, unknown>)));
      (insertedConfigs ?? []); // unused but triggers re-render

      toast({ title: 'Dados de demonstração restaurados com sucesso.' });
    } catch (err) {
      handleError(err, 'Erro ao restaurar dados de demonstração.');
    }
  }, [settingsId, handleError, toast]);

  // Derive distinct HR names with latest custoBase from loaded resources
  const distinctHRNames = useMemo(() => {
    const hrResources = resources
      .filter(r => r.tipo === 'clt' || r.tipo === 'pj')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    // Return with original casing from first occurrence (most recent)
    const seen = new Set<string>();
    const result: { nome: string; custoBase: number; cargo?: string; senioridade?: string }[] = [];
    for (const r of hrResources) {
      const key = r.nome.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push({ nome: r.nome.trim(), custoBase: r.custoBase, cargo: r.cargo || undefined, senioridade: r.senioridade || undefined });
      }
    }
    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [resources]);

  return (
    <DataContext.Provider value={{
      clients, contracts, resources, settings, alerts, snapshots,
      overheadItems, historyEvents, attachments,
      attachmentDescriptionConfigs: attachmentConfigs,
      jobTitles, teams, distinctHRNames, loading,
      addClient, updateClient, deleteClient, getClient,
      addContract, updateContract, deleteContract, getContract, getContractsByClient,
      addResource, updateResource, deleteResource, getResourcesByContract, refreshResources,
      updateSettings,
      addSnapshot, getSnapshotsByContract,
      addOverheadItem, updateOverheadItem, deleteOverheadItem, getOverheadByContract,
      addHistoryEvent, updateHistoryEvent, deleteHistoryEvent, getHistoryEventsByContract,
      addAttachment, updateAttachment, deleteAttachment, getAttachmentsByContract,
      addDescriptionConfig, updateDescriptionConfig, getActiveDescriptionConfigs,
      addJobTitle, updateJobTitle, deleteJobTitle, getActiveJobTitles,
      addTeam, updateTeam, deleteTeam, getActiveTeams,
      resetToDemo,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
