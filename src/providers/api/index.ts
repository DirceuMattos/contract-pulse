import type { DataProviders } from '@/providers/types';

const NOT_AVAILABLE = 'API provider not available in this version';

function stub(): never {
  throw new Error(NOT_AVAILABLE);
}

export const apiProviders: DataProviders = {
  clients: { list: stub, getById: stub, create: stub, update: stub, delete: stub },
  contracts: { list: stub, getById: stub, create: stub, update: stub, delete: stub, getByClient: stub },
  resources: { listByContract: stub, create: stub, update: stub, delete: stub },
  history: { listByContract: stub, create: stub, update: stub, delete: stub },
  documents: { listByContract: stub, create: stub, delete: stub },
  overhead: { listByContract: stub, create: stub, update: stub, delete: stub },
  settings: { get: stub, update: stub },
  snapshots: { listByContract: stub, create: stub },
  users: { list: stub, getById: stub, create: stub, update: stub, delete: stub, validateCredentials: stub },
  accessLogs: { list: stub, getByUser: stub, clear: stub },
  calculator: { listSimulations: stub, getSimulation: stub, createSimulation: stub, updateSimulation: stub, deleteSimulation: stub, duplicateSimulation: stub },
};
