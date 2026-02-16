/**
 * LocalProvider — wraps existing localStorage/IndexedDB stores.
 * 
 * This file is created as part of the data provider abstraction layer
 * to prepare for future backend integration (Etapa 2).
 * 
 * In this version, it simply documents the mapping between provider
 * interfaces and the existing DataContext/SimulationContext/SystemUsersContext.
 * 
 * The actual integration (replacing direct context calls with provider calls)
 * will be done in Etapa 2 to minimize regression risk.
 */

export const LOCAL_PROVIDER_VERSION = '1.0.0';

// The LocalProvider delegates to:
// - DataContext for: clients, contracts, resources, history, documents, overhead, settings, snapshots
// - SimulationContext for: calculator (simulations)
// - SystemUsersContext for: users
// - AccessLogContext for: accessLogs
//
// No functional changes are made in this version.
