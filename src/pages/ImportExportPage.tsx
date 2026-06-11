import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHR } from '@/contexts/HRContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { 
  parseFile, 
  transformImportedData, 
  validateImportedData, 
  exportToCSV, 
  exportToExcel, 
  downloadCSV,
  generateTemplate,
  exportHRPeople,
  clientColumns,
  contractColumns,
  resourceColumns,
  EntityType,
  FileFormat,
  ColumnMapping
} from '@/lib/importExport';

const entityLabels: Record<EntityType, string> = {
  clients: 'Clientes',
  contracts: 'Contratos',
  resources: 'Recursos',
  hr_people: 'Recursos Humanos',
};

export default function ImportExportPage() {
  const { clients, contracts, resources, addClient, addContract, addResource, jobTitles, teams } = useData();
  const { canEdit, canViewHRCosts, canViewValues, userRole } = useAuth();
  const { hrPeople } = useHR();
  const { toast } = useToast();
  
  // Export state
  const [exportEntity, setExportEntity] = useState<EntityType>('clients');
  const [exportFormat, setExportFormat] = useState<FileFormat>('xlsx');
  
  // Import state
  const [importEntity, setImportEntity] = useState<EntityType>('clients');
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileData, setFileData] = useState<Record<string, unknown>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([]);
  const [transformedData, setTransformedData] = useState<Record<string, unknown>[]>([]);
  const [validationErrors, setValidationErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [importedCount, setImportedCount] = useState(0);
  
  const getEntityColumns = (entity: EntityType) => {
    switch (entity) {
      case 'clients': return clientColumns;
      case 'contracts': return contractColumns;
      case 'resources': return resourceColumns;
      case 'hr_people': return resourceColumns; // hr uses its own export function
    }
  };
  
  const getExportData = (entity: EntityType) => {
    switch (entity) {
      case 'clients': return clients;
      case 'contracts': return contracts;
      case 'resources': return resources;
      case 'hr_people': return hrPeople;
    }
  };
  
  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];

    if (exportEntity === 'hr_people') {
      exportHRPeople(hrPeople, teams, jobTitles, canViewHRCosts, exportFormat);
      toast({ title: 'Exportação concluída', description: `${hrPeople.length} pessoas exportadas.` });
      return;
    }

    const data = getExportData(exportEntity);
    const filename = `${exportEntity}_${timestamp}`;
    const exportData = data as unknown as Record<string, unknown>[];
    
    if (exportFormat === 'xlsx') {
      exportToExcel(exportData, exportEntity, `${filename}.xlsx`, canViewValues);
    } else {
      const csv = exportToCSV(exportData, exportEntity, canViewValues);
      downloadCSV(csv, `${filename}.csv`);
    }
    
    toast({
      title: 'Exportação concluída',
      description: `${data.length} registros exportados com sucesso.`,
    });
  };
  
  const handleDownloadTemplate = (format: FileFormat) => {
    generateTemplate(importEntity, format);
    toast({
      title: 'Template baixado',
      description: `Template para ${entityLabels[importEntity].toLowerCase()} gerado.`,
    });
  };
  
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const { headers, data } = await parseFile(file);
      setUploadedFile(file);
      setFileHeaders(headers);
      setFileData(data);
      
      // Auto-map columns by matching labels
      const columns = getEntityColumns(importEntity);
      const autoMapping: ColumnMapping[] = columns.map(col => {
        const matchingHeader = headers.find(h => 
          h.toLowerCase().includes(col.label.toLowerCase()) ||
          col.label.toLowerCase().includes(h.toLowerCase()) ||
          h.toLowerCase() === col.key.toLowerCase()
        );
        return {
          sourceColumn: matchingHeader || '',
          targetColumn: col.key,
        };
      });
      
      setColumnMapping(autoMapping);
      setImportStep('mapping');
      
      toast({
        title: 'Arquivo carregado',
        description: `${data.length} linhas encontradas.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao carregar arquivo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [importEntity, toast]);
  
  const handleMappingChange = (targetColumn: string, sourceColumn: string) => {
    setColumnMapping(prev => 
      prev.map(m => m.targetColumn === targetColumn ? { ...m, sourceColumn } : m)
    );
  };
  
  const handleValidateMapping = () => {
    const transformed = transformImportedData(fileData, columnMapping, importEntity);
    const { valid, errors } = validateImportedData(transformed, importEntity);
    
    setTransformedData(valid);
    setValidationErrors(errors);
    setImportStep('preview');
  };
  
  const handleImport = async () => {
    let imported = 0;
    
    try {
      for (const row of transformedData) {
        if (importEntity === 'clients') {
          addClient(row as Parameters<typeof addClient>[0]);
        } else if (importEntity === 'contracts') {
          addContract(row as Parameters<typeof addContract>[0]);
        } else {
          addResource(row as Parameters<typeof addResource>[0]);
        }
        imported++;
      }
      
      setImportedCount(imported);
      setImportStep('complete');
      
      toast({
        title: 'Importação concluída',
        description: `${imported} registros importados com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro na importação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };
  
  const handleReset = () => {
    setImportStep('upload');
    setUploadedFile(null);
    setFileHeaders([]);
    setFileData([]);
    setColumnMapping([]);
    setTransformedData([]);
    setValidationErrors([]);
    setImportedCount(0);
  };
  
  const columns = getEntityColumns(importEntity);
  const requiredColumns = columns.filter(c => c.required);
  const mappedRequiredColumns = requiredColumns.filter(c => 
    columnMapping.find(m => m.targetColumn === c.key && m.sourceColumn)
  );
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <PageHeader
        title="Importar / Exportar"
        description="Importe dados de arquivos CSV ou Excel, ou exporte seus dados para backup."
        animated={false}
      />
      
      <Tabs defaultValue="export" className="space-y-4">
        <TabsList>
          <TabsTrigger value="export" className="gap-2" disabled={userRole !== 'c-level' && userRole !== 'administrativo'}>
            <Download className="h-4 w-4" />
            Exportar
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2" disabled={!canEdit}>
            <Upload className="h-4 w-4" />
            Importar
          </TabsTrigger>
        </TabsList>
        
        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Dados</CardTitle>
              <CardDescription>
                Selecione o tipo de dado e o formato desejado para exportação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Dado</label>
                  <Select value={exportEntity} onValueChange={(v) => setExportEntity(v as EntityType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clients">Clientes ({clients.length})</SelectItem>
                      <SelectItem value="contracts">Contratos ({contracts.length})</SelectItem>
                      <SelectItem value="resources">Recursos ({resources.length})</SelectItem>
                      <SelectItem value="hr_people">Recursos Humanos ({hrPeople.length})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Formato</label>
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as FileFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          Excel (.xlsx)
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          CSV (.csv)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total de registros a exportar:
                  </span>
                  <Badge variant="secondary" className="text-lg">
                    {getExportData(exportEntity).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Colunas incluídas:
                  </span>
                  <Badge variant="outline">
                    {getEntityColumns(exportEntity).length}
                  </Badge>
                </div>
              </div>
              
              <Button onClick={handleExport} className="w-full sm:w-auto" size="lg">
                <Download className="mr-2 h-4 w-4" />
                Exportar {entityLabels[exportEntity]}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 text-sm">
            {['upload', 'mapping', 'preview', 'complete'].map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    importStep === step
                      ? 'bg-primary text-primary-foreground'
                      : ['upload', 'mapping', 'preview', 'complete'].indexOf(importStep) > index
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {['upload', 'mapping', 'preview', 'complete'].indexOf(importStep) > index ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={importStep === step ? 'font-medium' : 'text-muted-foreground'}>
                  {step === 'upload' && 'Upload'}
                  {step === 'mapping' && 'Mapeamento'}
                  {step === 'preview' && 'Validação'}
                  {step === 'complete' && 'Concluído'}
                </span>
                {index < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
          
          {/* Step 1: Upload */}
          {importStep === 'upload' && (
            <Card>
              <CardHeader>
                <CardTitle>Selecionar Arquivo</CardTitle>
                <CardDescription>
                  Escolha o tipo de dado e faça upload do arquivo CSV ou Excel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Dado</label>
                  <Select value={importEntity} onValueChange={(v) => setImportEntity(v as EntityType)}>
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clients">Clientes</SelectItem>
                      <SelectItem value="contracts">Contratos</SelectItem>
                      <SelectItem value="resources">Recursos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Templates</label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownloadTemplate('xlsx')}>
                      <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Template Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadTemplate('csv')}>
                      <FileText className="mr-2 h-4 w-4 text-primary" />
                      Template CSV
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Arquivo</label>
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <div className="mt-4">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="text-primary hover:underline">Clique para selecionar</span>
                          <span className="text-muted-foreground"> ou arraste o arquivo aqui</span>
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Formatos aceitos: CSV, Excel (.xlsx, .xls)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Step 2: Column Mapping */}
          {importStep === 'mapping' && (
            <Card>
              <CardHeader>
                <CardTitle>Mapeamento de Colunas</CardTitle>
                <CardDescription>
                  Associe as colunas do seu arquivo aos campos do sistema. 
                  Campos com * são obrigatórios.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium">{uploadedFile?.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{fileData.length} linhas</Badge>
                    <Badge variant="secondary">{fileHeaders.length} colunas</Badge>
                    <Button variant="ghost" size="sm" onClick={handleReset}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/2">Campo do Sistema</TableHead>
                        <TableHead className="w-1/2">Coluna do Arquivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {columns.map((col) => {
                        const mapping = columnMapping.find(m => m.targetColumn === col.key);
                        return (
                          <TableRow key={col.key}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {col.label}
                                {col.required && <span className="text-destructive">*</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={mapping?.sourceColumn || '__none__'}
                                onValueChange={(v) => handleMappingChange(col.key, v === '__none__' ? '' : v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecionar coluna..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    <span className="text-muted-foreground">Não mapear</span>
                                  </SelectItem>
                                  {fileHeaders.map(header => (
                                    <SelectItem key={header} value={header}>
                                      {header}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Campos obrigatórios mapeados: </span>
                    <span className={mappedRequiredColumns.length === requiredColumns.length ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                      {mappedRequiredColumns.length} / {requiredColumns.length}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleValidateMapping}
                      disabled={mappedRequiredColumns.length !== requiredColumns.length}
                    >
                      Validar e Prosseguir
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Step 3: Preview & Validation */}
          {importStep === 'preview' && (
            <div className="space-y-4">
              {/* Validation Summary */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-health-healthy/30 bg-health-healthy-bg">
                  <CardContent className="flex items-center gap-4 pt-6">
                    <CheckCircle2 className="h-10 w-10 text-health-healthy" />
                    <div>
                      <p className="text-2xl font-bold text-health-healthy">
                        {transformedData.length}
                      </p>
                      <p className="text-sm text-health-healthy/80">
                        Registros válidos para importação
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className={validationErrors.length > 0 ? 'border-destructive/30 bg-destructive/10' : 'border-muted'}>
                  <CardContent className="flex items-center gap-4 pt-6">
                    <XCircle className={`h-10 w-10 ${validationErrors.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <div>
                      <p className={`text-2xl font-bold ${validationErrors.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {validationErrors.length}
                      </p>
                      <p className={`text-sm ${validationErrors.length > 0 ? 'text-destructive/80' : 'text-muted-foreground'}`}>
                        Registros com erros
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Errors Table */}
              {validationErrors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      Erros de Validação
                    </CardTitle>
                    <CardDescription>
                      Os registros abaixo não serão importados devido a erros.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border max-h-64 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-24">Linha</TableHead>
                            <TableHead>Erro</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validationErrors.slice(0, 20).map((error, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Badge variant="outline">{error.row}</Badge>
                              </TableCell>
                              <TableCell className="text-destructive">{error.message}</TableCell>
                            </TableRow>
                          ))}
                          {validationErrors.length > 20 && (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center text-muted-foreground">
                                ... e mais {validationErrors.length - 20} erros
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Preview Table */}
              {transformedData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Prévia dos Dados</CardTitle>
                    <CardDescription>
                      Primeiros 5 registros que serão importados.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {columns.slice(0, 5).map(col => (
                              <TableHead key={col.key}>{col.label}</TableHead>
                            ))}
                            <TableHead>...</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transformedData.slice(0, 5).map((row, index) => (
                            <TableRow key={index}>
                              {columns.slice(0, 5).map(col => (
                                <TableCell key={col.key} className="max-w-32 truncate">
                                  {Array.isArray(row[col.key]) 
                                    ? (row[col.key] as string[]).join(', ')
                                    : String(row[col.key] ?? '')}
                                </TableCell>
                              ))}
                              <TableCell className="text-muted-foreground">...</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setImportStep('mapping')}>
                  Voltar ao Mapeamento
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={transformedData.length === 0}
                >
                  Importar {transformedData.length} Registros
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 4: Complete */}
          {importStep === 'complete' && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-health-healthy-bg">
                  <CheckCircle2 className="h-10 w-10 text-health-healthy" />
                </div>
                <h3 className="mt-6 text-2xl font-bold">Importação Concluída!</h3>
                <p className="mt-2 text-muted-foreground">
                  {importedCount} registros de {entityLabels[importEntity].toLowerCase()} foram importados com sucesso.
                </p>
                <Button onClick={handleReset} className="mt-6">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Nova Importação
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
