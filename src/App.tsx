// app-version: 2026-07-09-v2
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AccessLogProvider } from "@/contexts/AccessLogContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DataProvider } from "@/contexts/DataContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SystemUsersProvider } from "@/contexts/SystemUsersContext";
import { SimulationProvider } from "@/contexts/SimulationContext";
import { SubprojectProvider } from "@/contexts/SubprojectContext";
import { HRProvider } from "@/contexts/HRContext";
import { MainLayout } from "@/components/layout/MainLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import HRDashboardPage from "@/pages/HRDashboardPage";
import HelpPage from "@/pages/HelpPage";
import HelpReportsPage from "@/pages/HelpReportsPage";
import HelpSquadsPage from "@/pages/HelpSquadsPage";
import HelpClientsPage from "@/pages/HelpClientsPage";
import HelpContractsPage from "@/pages/HelpContractsPage";
import HelpAccessLogsPage from "@/pages/HelpAccessLogsPage";
import HelpAIPage from "@/pages/HelpAIPage";
import HelpAlertsPage from "@/pages/HelpAlertsPage";
import HelpCalculatorPage from "@/pages/HelpCalculatorPage";
import HelpDashboardPage from "@/pages/HelpDashboardPage";
import HelpHRPage from "@/pages/HelpHRPage";
import HelpImportExportPage from "@/pages/HelpImportExportPage";
import HelpJobsPage from "@/pages/HelpJobsPage";
import HelpProfilesPage from "@/pages/HelpProfilesPage";
import HelpReceivablesPage from "@/pages/HelpReceivablesPage";
import HelpSettingsPage from "@/pages/HelpSettingsPage";
import HelpTransportPage from "@/pages/HelpTransportPage";
import HelpUsersPage from "@/pages/HelpUsersPage";
import ClientsPage from "@/pages/ClientsPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import ClientFormPage from "@/pages/ClientFormPage";
import ContractsPage from "@/pages/ContractsPage";
import ContractDetailPage from "@/pages/ContractDetailPage";
import ContractFormPage from "@/pages/ContractFormPage";
import ContractResourcesPage from "@/pages/ContractResourcesPage";
import ImportExportPage from "@/pages/ImportExportPage";
import SettingsPage from "@/pages/SettingsPage";
import JobTitlesPage from "@/pages/JobTitlesPage";
import JobSkillsPage from "@/pages/JobSkillsPage";
import JobRequestsPage from "@/pages/JobRequestsPage";
import TeamsPage from "@/pages/TeamsPage";
import AlertsPage from "@/pages/AlertsPage";
import SquadsPage from "@/pages/SquadsPage";
import UsersPage from "@/pages/UsersPage";
import ProfilesAdminPage from "@/pages/ProfilesAdminPage";
import AccessLogsPage from "@/pages/AccessLogsPage";
import CalculatorPage from "@/pages/CalculatorPage";
import CalculatorWizardPage from "@/pages/CalculatorWizardPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import HRPeoplePage from "@/pages/HRPeoplePage";
import HRPersonDetailPage from "@/pages/HRPersonDetailPage";
import FeedzReconciliationPage from "@/pages/FeedzReconciliationPage";
import OverheadAllocationPage from "@/pages/OverheadAllocationPage";
import AIContractsAnalysisPage from "@/pages/AIContractsAnalysisPage";
import AIResourcesAnalysisPage from "@/pages/AIResourcesAnalysisPage";
import AIDraftsPage from "@/pages/AIDraftsPage";
import AILogsPage from "@/pages/AILogsPage";
import ReceivablesDashboardPage from "@/pages/ReceivablesDashboardPage";
import ReceivablesReconcilePage from "@/pages/ReceivablesReconcilePage";
import TransportPage from "@/pages/TransportPage";
import ReportsPage from "@/pages/ReportsPage";
import ReportEditPage from "@/pages/ReportEditPage";
import ReportTemplateConfigPage from "@/pages/ReportTemplateConfigPage";
import TrustPage from "@/pages/TrustPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <SystemUsersProvider>
          <DataProvider>
            <HRProvider>
              <SubprojectProvider>
              <NotificationProvider>
                <SimulationProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <AccessLogProvider>
                      <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/trocar-senha" element={<ChangePasswordPage />} />
                        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
                        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
                        <Route path="/seguranca" element={<TrustPage />} />
                        <Route path="/trust" element={<TrustPage />} />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route element={<MainLayout />}>
                          <Route path="/dashboard" element={<DashboardPage />} />
                          <Route path="/dashboard-rh" element={<HRDashboardPage />} />
                          <Route path="/clientes" element={<ClientsPage />} />
                          <Route path="/clientes/novo" element={<ClientFormPage />} />
                          <Route path="/clientes/:id" element={<ClientDetailPage />} />
                          <Route path="/clientes/:id/editar" element={<ClientFormPage />} />
                          <Route path="/contratos" element={<ContractsPage />} />
                          <Route path="/contratos/novo" element={<ContractFormPage />} />
                          <Route path="/contratos/:id" element={<ContractDetailPage />} />
                          <Route path="/contratos/:id/editar" element={<ContractFormPage />} />
                          <Route path="/contratos/:id/recursos" element={<ContractResourcesPage />} />
                          <Route path="/usuarios" element={<UsersPage />} />
                          <Route path="/usuarios/perfis" element={<ProfilesAdminPage />} />
                          <Route path="/usuarios/logs" element={<AccessLogsPage />} />
                          <Route path="/configuracoes" element={<SettingsPage />} />
                          <Route path="/configuracoes/cargos" element={<JobTitlesPage />} />
                          <Route path="/configuracoes/equipes" element={<TeamsPage />} />
                          <Route path="/alertas" element={<AlertsPage />} />
                          <Route path="/squads" element={<SquadsPage />} />
                          <Route path="/importar-exportar" element={<ImportExportPage />} />
                          <Route path="/calculadora" element={<CalculatorPage />} />
                          <Route path="/calculadora/nova" element={<CalculatorWizardPage />} />
                          <Route path="/calculadora/:id" element={<CalculatorWizardPage />} />
                          <Route path="/rh" element={<HRPeoplePage />} />
                          <Route path="/skills-vagas" element={<JobSkillsPage />} />
                          <Route path="/requisicao-vagas" element={<JobRequestsPage />} />
                          <Route path="/rh/pessoas/:id" element={<HRPersonDetailPage />} />
                          <Route path="/rh/cargos" element={<JobTitlesPage />} />
                          <Route path="/rh/equipes" element={<TeamsPage />} />
                          <Route path="/configuracoes/feedz-reconciliacao" element={<FeedzReconciliationPage />} />
                          <Route path="/configuracoes/overhead-rateio" element={<OverheadAllocationPage />} />
                          <Route path="/ai" element={<Navigate to="/ai/contracts-analysis" replace />} />
                          <Route path="/ai/contracts-analysis" element={<AIContractsAnalysisPage />} />
                          <Route path="/ai/resources-analysis" element={<AIResourcesAnalysisPage />} />
                          <Route path="/ai/drafts" element={<AIDraftsPage />} />
                          <Route path="/ai/logs" element={<AILogsPage />} />
                          <Route path="/receivables" element={<ReceivablesDashboardPage />} />
                          <Route path="/receivables/reconcile" element={<ReceivablesReconcilePage />} />
                          <Route path="/adm-transportes" element={<TransportPage />} />
                          <Route path="/relatorios" element={<ReportsPage />} />
                          <Route path="/relatorios/config/:contractId" element={<ReportTemplateConfigPage />} />
                          <Route path="/relatorios/:reportId" element={<ReportEditPage />} />
                          
                          
                          
                          <Route path="/ajuda" element={<HelpPage />} />
                          <Route path="/ajuda/dashboard" element={<HelpDashboardPage />} />
                          <Route path="/ajuda/alertas" element={<HelpAlertsPage />} />
                          <Route path="/ajuda/relatorios" element={<HelpReportsPage />} />
                          <Route path="/ajuda/squads" element={<HelpSquadsPage />} />
                          <Route path="/ajuda/clientes" element={<HelpClientsPage />} />
                          <Route path="/ajuda/contratos" element={<HelpContractsPage />} />
                          <Route path="/ajuda/rh" element={<HelpHRPage />} />
                          <Route path="/ajuda/vagas" element={<HelpJobsPage />} />
                          <Route path="/ajuda/usuarios" element={<HelpUsersPage />} />
                          <Route path="/ajuda/perfis" element={<HelpProfilesPage />} />
                          <Route path="/ajuda/logs-acesso" element={<HelpAccessLogsPage />} />
                          <Route path="/ajuda/configuracoes" element={<HelpSettingsPage />} />
                          <Route path="/ajuda/importar-exportar" element={<HelpImportExportPage />} />
                          <Route path="/ajuda/recebiveis" element={<HelpReceivablesPage />} />
                          <Route path="/ajuda/simulador" element={<HelpCalculatorPage />} />
                          <Route path="/ajuda/ia" element={<HelpAIPage />} />
                          <Route path="/ajuda/transportes" element={<HelpTransportPage />} />
                        </Route>
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                      </AccessLogProvider>
                    </BrowserRouter>
                  </TooltipProvider>
                </SimulationProvider>
              </NotificationProvider>
              </SubprojectProvider>
            </HRProvider>
          </DataProvider>
        </SystemUsersProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
