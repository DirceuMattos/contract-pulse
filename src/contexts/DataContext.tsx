import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client, Contract, Resource, Settings, Alert, Snapshot, OverheadItem, HistoryEvent, DocumentAttachment, AttachmentDescriptionConfig, JobTitle } from '@/types';
import { mockClients, mockContracts, mockResources, mockAlerts, mockSnapshots, defaultSettings, mockOverheadItems, mockHistoryEvents, defaultAttachmentConfigs, mockAttachments, defaultJobTitles } from '@/data/mockData';
import { deleteBlob, clearAllBlobs } from '@/lib/indexedDBStorage';


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
  
  // Client actions
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Client;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClient: (id: string) => Client | undefined;
  
  // Contract actions
  addContract: (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => Contract;
  updateContract: (id: string, data: Partial<Contract>) => void;
  deleteContract: (id: string) => void;
  getContract: (id: string) => Contract | undefined;
  getContractsByClient: (clientId: string) => Contract[];
  
  // Resource actions
  addResource: (resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => Resource;
  updateResource: (id: string, data: Partial<Resource>) => void;
  deleteResource: (id: string) => void;
  getResourcesByContract: (contractId: string) => Resource[];
  
  // Settings actions
  updateSettings: (data: Partial<Settings>) => void;
  
  // Snapshot actions
  addSnapshot: (snapshot: Omit<Snapshot, 'id' | 'createdAt'>) => Snapshot;
  getSnapshotsByContract: (contractId: string) => Snapshot[];
  
  // Overhead actions
  addOverheadItem: (item: Omit<OverheadItem, 'id' | 'createdAt' | 'updatedAt'>) => OverheadItem;
  updateOverheadItem: (id: string, data: Partial<OverheadItem>) => void;
  deleteOverheadItem: (id: string) => void;
  getOverheadByContract: (contractId: string) => OverheadItem[];

  // History event actions
  addHistoryEvent: (event: Omit<HistoryEvent, 'id' | 'createdAt' | 'updatedAt'>) => HistoryEvent;
  updateHistoryEvent: (id: string, data: Partial<HistoryEvent>) => void;
  deleteHistoryEvent: (id: string) => void;
  getHistoryEventsByContract: (contractId: string) => HistoryEvent[];

  // Attachment actions
  addAttachment: (attachment: Omit<DocumentAttachment, 'id'>) => DocumentAttachment;
  deleteAttachment: (id: string) => void;
  getAttachmentsByContract: (contractId: string) => DocumentAttachment[];
  
  // Attachment config actions
  addDescriptionConfig: (config: Omit<AttachmentDescriptionConfig, 'id'>) => AttachmentDescriptionConfig;
  updateDescriptionConfig: (id: string, data: Partial<AttachmentDescriptionConfig>) => void;
  getActiveDescriptionConfigs: () => AttachmentDescriptionConfig[];

  // Job title actions
  addJobTitle: (label: string) => JobTitle;
  updateJobTitle: (id: string, data: Partial<JobTitle>) => void;
  deleteJobTitle: (id: string) => void;
  getActiveJobTitles: () => JobTitle[];

  // Utils
  resetToDemo: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  clients: 'bnp_clients',
  contracts: 'bnp_contracts',
  resources: 'bnp_resources',
  settings: 'bnp_settings',
  alerts: 'bnp_alerts',
  snapshots: 'bnp_snapshots',
  overhead: 'bnp_overhead',
  historyEvents: 'bnp_history_events',
  attachments: 'bnp_attachments',
  attachmentConfigs: 'bnp_attachment_configs',
  jobTitles: 'bnp_job_titles',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(() => loadFromStorage(STORAGE_KEYS.clients, mockClients));
  const [contracts, setContracts] = useState<Contract[]>(() => loadFromStorage(STORAGE_KEYS.contracts, mockContracts));
  const [resources, setResources] = useState<Resource[]>(() => loadFromStorage(STORAGE_KEYS.resources, mockResources));
  const [settings, setSettings] = useState<Settings>(() => loadFromStorage(STORAGE_KEYS.settings, defaultSettings));
  const [alerts, setAlerts] = useState<Alert[]>(() => loadFromStorage(STORAGE_KEYS.alerts, mockAlerts));
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => loadFromStorage(STORAGE_KEYS.snapshots, mockSnapshots));
  const [overheadItems, setOverheadItems] = useState<OverheadItem[]>(() => loadFromStorage(STORAGE_KEYS.overhead, mockOverheadItems));
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>(() => loadFromStorage(STORAGE_KEYS.historyEvents, mockHistoryEvents));
  const [attachments, setAttachments] = useState<DocumentAttachment[]>(() => loadFromStorage(STORAGE_KEYS.attachments, mockAttachments));
  const [attachmentConfigs, setAttachmentConfigs] = useState<AttachmentDescriptionConfig[]>(() => loadFromStorage(STORAGE_KEYS.attachmentConfigs, defaultAttachmentConfigs));
  const [jobTitles, setJobTitles] = useState<JobTitle[]>(() => loadFromStorage(STORAGE_KEYS.jobTitles, defaultJobTitles));
  
  // Persist to localStorage
  useEffect(() => { saveToStorage(STORAGE_KEYS.clients, clients); }, [clients]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.contracts, contracts); }, [contracts]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.resources, resources); }, [resources]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.settings, settings); }, [settings]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.alerts, alerts); }, [alerts]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.snapshots, snapshots); }, [snapshots]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.overhead, overheadItems); }, [overheadItems]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.historyEvents, historyEvents); }, [historyEvents]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.attachments, attachments); }, [attachments]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.attachmentConfigs, attachmentConfigs); }, [attachmentConfigs]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.jobTitles, jobTitles); }, [jobTitles]);
  
  // Client actions
  const addClient = (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Client => {
    const now = new Date().toISOString();
    const client: Client = {
      ...data,
      id: `cli-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    setClients(prev => [...prev, client]);
    return client;
  };
  
  const updateClient = (id: string, data: Partial<Client>) => {
    setClients(prev => prev.map(c => 
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    ));
  };
  
  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    // Also delete related contracts
    const relatedContracts = contracts.filter(c => c.clientId === id);
    relatedContracts.forEach(contract => {
      deleteContract(contract.id);
    });
  };
  
  const getClient = (id: string) => clients.find(c => c.id === id);
  
  // Contract actions
  const addContract = (data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Contract => {
    const now = new Date().toISOString();
    const contract: Contract = {
      ...data,
      id: `ctr-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    setContracts(prev => [...prev, contract]);
    return contract;
  };
  
  const updateContract = (id: string, data: Partial<Contract>) => {
    setContracts(prev => prev.map(c => 
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    ));
  };
  
  const deleteContract = (id: string) => {
    // Cascade delete attachments blobs
    const contractAttachments = attachments.filter(a => a.contractId === id);
    contractAttachments.forEach(a => {
      if (!a.storageKey.startsWith('mock-')) {
        deleteBlob(a.storageKey);
      }
    });
    setAttachments(prev => prev.filter(a => a.contractId !== id));
    setContracts(prev => prev.filter(c => c.id !== id));
    setResources(prev => prev.filter(r => r.contractId !== id));
    setOverheadItems(prev => prev.filter(o => o.contractId !== id));
    setSnapshots(prev => prev.filter(s => s.contractId !== id));
    setAlerts(prev => prev.filter(a => a.contractId !== id));
    setHistoryEvents(prev => prev.filter(e => e.contractId !== id));
  };
  
  const getContract = (id: string) => contracts.find(c => c.id === id);
  
  const getContractsByClient = (clientId: string) => contracts.filter(c => c.clientId === clientId);
  
  // Resource actions
  const addResource = (data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>): Resource => {
    const now = new Date().toISOString();
    const resource: Resource = {
      ...data,
      id: `res-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    setResources(prev => [...prev, resource]);
    updateContract(data.contractId, { ultimaAtualizacaoRecursos: now });
    return resource;
  };
  
  const updateResource = (id: string, data: Partial<Resource>) => {
    const resource = resources.find(r => r.id === id);
    if (resource) {
      setResources(prev => prev.map(r => 
        r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r
      ));
      updateContract(resource.contractId, { ultimaAtualizacaoRecursos: new Date().toISOString() });
    }
  };
  
  const deleteResource = (id: string) => {
    const resource = resources.find(r => r.id === id);
    if (resource) {
      setResources(prev => prev.filter(r => r.id !== id));
      updateContract(resource.contractId, { ultimaAtualizacaoRecursos: new Date().toISOString() });
    }
  };
  
  const getResourcesByContract = (contractId: string) => resources.filter(r => r.contractId === contractId);
  
  // Settings actions
  const updateSettings = (data: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...data }));
  };
  
  // Snapshot actions
  const addSnapshot = (data: Omit<Snapshot, 'id' | 'createdAt'>): Snapshot => {
    const snapshot: Snapshot = {
      ...data,
      id: `snap-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    setSnapshots(prev => [...prev, snapshot]);
    return snapshot;
  };
  
  const getSnapshotsByContract = (contractId: string) => 
    snapshots.filter(s => s.contractId === contractId).sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  // Overhead actions
  const addOverheadItem = (data: Omit<OverheadItem, 'id' | 'createdAt' | 'updatedAt'>): OverheadItem => {
    const now = new Date().toISOString();
    const item: OverheadItem = {
      ...data,
      id: `ovh-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    setOverheadItems(prev => [...prev, item]);
    return item;
  };

  const updateOverheadItem = (id: string, data: Partial<OverheadItem>) => {
    setOverheadItems(prev => prev.map(o =>
      o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o
    ));
  };

  const deleteOverheadItem = (id: string) => {
    setOverheadItems(prev => prev.filter(o => o.id !== id));
  };

  const getOverheadByContract = (contractId: string) => overheadItems.filter(o => o.contractId === contractId);

  // History event actions
  const addHistoryEvent = (data: Omit<HistoryEvent, 'id' | 'createdAt' | 'updatedAt'>): HistoryEvent => {
    const now = new Date().toISOString();
    const event: HistoryEvent = {
      ...data,
      id: `hev-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    setHistoryEvents(prev => [...prev, event]);
    return event;
  };

  const updateHistoryEvent = (id: string, data: Partial<HistoryEvent>) => {
    setHistoryEvents(prev => prev.map(e =>
      e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
    ));
  };

  const deleteHistoryEvent = (id: string) => {
    setHistoryEvents(prev => prev.filter(e => e.id !== id));
  };

  const getHistoryEventsByContract = (contractId: string) => historyEvents.filter(e => e.contractId === contractId);
  
  // Attachment actions
  const addAttachment = (data: Omit<DocumentAttachment, 'id'>): DocumentAttachment => {
    const attachment: DocumentAttachment = {
      ...data,
      id: `att-${crypto.randomUUID().slice(0, 8)}`,
    };
    setAttachments(prev => [...prev, attachment]);
    return attachment;
  };

  const deleteAttachmentItem = (id: string) => {
    const att = attachments.find(a => a.id === id);
    if (att && !att.storageKey.startsWith('mock-')) {
      deleteBlob(att.storageKey);
    }
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const getAttachmentsByContract = (contractId: string) => attachments.filter(a => a.contractId === contractId);

  // Attachment config actions
  const addDescriptionConfig = (data: Omit<AttachmentDescriptionConfig, 'id'>): AttachmentDescriptionConfig => {
    const config: AttachmentDescriptionConfig = {
      ...data,
      id: `adc-${crypto.randomUUID().slice(0, 8)}`,
    };
    setAttachmentConfigs(prev => [...prev, config]);
    return config;
  };

  const updateDescriptionConfig = (id: string, data: Partial<AttachmentDescriptionConfig>) => {
    setAttachmentConfigs(prev => prev.map(c =>
      c.id === id ? { ...c, ...data } : c
    ));
  };

  const getActiveDescriptionConfigs = () => attachmentConfigs.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  // Job title actions
  const addJobTitle = (label: string): JobTitle => {
    const jt: JobTitle = {
      id: `jt-${crypto.randomUUID().slice(0, 8)}`,
      label,
      isActive: true,
    };
    setJobTitles(prev => [...prev, jt]);
    return jt;
  };

  const updateJobTitle = (id: string, data: Partial<JobTitle>) => {
    setJobTitles(prev => prev.map(jt => jt.id === id ? { ...jt, ...data } : jt));
  };

  const deleteJobTitle = (id: string) => {
    setJobTitles(prev => prev.filter(jt => jt.id !== id));
  };

  const getActiveJobTitles = () => jobTitles.filter(jt => jt.isActive).sort((a, b) => a.label.localeCompare(b.label));

  // Reset to demo data
  const resetToDemo = () => {
    setClients(mockClients);
    setContracts(mockContracts);
    setResources(mockResources);
    setSettings(defaultSettings);
    setAlerts(mockAlerts);
    setSnapshots(mockSnapshots);
    setOverheadItems(mockOverheadItems);
    setHistoryEvents(mockHistoryEvents);
    setAttachments(mockAttachments);
    setAttachmentConfigs(defaultAttachmentConfigs);
    setJobTitles(defaultJobTitles);
    clearAllBlobs();
  };
  
  return (
    <DataContext.Provider value={{
      clients,
      contracts,
      resources,
      settings,
      alerts,
      snapshots,
      overheadItems,
      historyEvents,
      addClient,
      updateClient,
      deleteClient,
      getClient,
      addContract,
      updateContract,
      deleteContract,
      getContract,
      getContractsByClient,
      addResource,
      updateResource,
      deleteResource,
      getResourcesByContract,
      updateSettings,
      addSnapshot,
      getSnapshotsByContract,
      addOverheadItem,
      updateOverheadItem,
      deleteOverheadItem,
      getOverheadByContract,
      addHistoryEvent,
      updateHistoryEvent,
      deleteHistoryEvent,
      getHistoryEventsByContract,
      attachments,
      attachmentDescriptionConfigs: attachmentConfigs,
      addAttachment,
      deleteAttachment: deleteAttachmentItem,
      getAttachmentsByContract,
      addDescriptionConfig,
      updateDescriptionConfig,
      getActiveDescriptionConfigs,
      jobTitles,
      addJobTitle,
      updateJobTitle,
      deleteJobTitle,
      getActiveJobTitles,
      resetToDemo,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
