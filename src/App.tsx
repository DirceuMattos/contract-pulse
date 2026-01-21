import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DataProvider } from "@/contexts/DataContext";
import { MainLayout } from "@/components/layout/MainLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ClientsPage from "@/pages/ClientsPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import ClientFormPage from "@/pages/ClientFormPage";
import ContractsPage from "@/pages/ContractsPage";
import ContractDetailPage from "@/pages/ContractDetailPage";
import ContractFormPage from "@/pages/ContractFormPage";
import ContractResourcesPage from "@/pages/ContractResourcesPage";
import ImportExportPage from "@/pages/ImportExportPage";
import SettingsPage from "@/pages/SettingsPage";
import AlertsPage from "@/pages/AlertsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/clientes" element={<ClientsPage />} />
                  <Route path="/clientes/novo" element={<ClientFormPage />} />
                  <Route path="/clientes/:id" element={<ClientDetailPage />} />
                  <Route path="/clientes/:id/editar" element={<ClientFormPage />} />
                  <Route path="/contratos" element={<ContractsPage />} />
                  <Route path="/contratos/novo" element={<ContractFormPage />} />
                  <Route path="/contratos/:id" element={<ContractDetailPage />} />
                  <Route path="/contratos/:id/editar" element={<ContractFormPage />} />
                  <Route path="/contratos/:id/recursos" element={<ContractResourcesPage />} />
                  <Route path="/configuracoes" element={<SettingsPage />} />
                  <Route path="/alertas" element={<AlertsPage />} />
                  <Route path="/importar-exportar" element={<ImportExportPage />} />
                  <Route path="/integracoes" element={<DashboardPage />} />
                  <Route path="/ajuda" element={<DashboardPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
