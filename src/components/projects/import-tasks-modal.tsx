"use client";
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTableSettings, Column } from '@/hooks/use-table-settings';
import { useProjects } from '@/hooks/use-projects';
import Papa, { ParseResult } from 'papaparse';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from './ui/input';
import { Label } from './ui/label';

// Tipos
type ImportStep = 'upload' | 'mapping' | 'preview';
type Mapping = { [key: string]: string | 'new_column' | 'ignore' };
type CsvData = { [key: string]: string };

interface ImportTasksModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onImportSuccess: () => void;
}

export default function ImportTasksModal({ isOpen, onOpenChange, projectId, onImportSuccess }: ImportTasksModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [filePath, setFilePath] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<CsvData[]>([]);
  const [mappings, setMappings] = useState<Mapping>({});
  const { columns: systemColumns, addColumn } = useTableSettings();
  const { projects } = useProjects();
  const { toast } = useToast();
  const [newColumnModal, setNewColumnModal] = useState<{ open: boolean; csvHeader: string | null }>({ open: false, csvHeader: null });

  const projectName = useMemo(() => projects.find(p => p.id === projectId)?.name || '', [projects, projectId]);

  useEffect(() => {
    if (isOpen) {
      setStep('upload'); setFile(null); setFilePath(''); setCsvHeaders([]); setCsvData([]); setMappings({}); setIsProcessing(false);
    }
  }, [isOpen]);

  const handleUploadAndParse = async () => {
    if (!file || !projectId) return;
    setIsProcessing(true);
    const generatedFilePath = `imports/${projectId}-${Date.now()}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage.from('tosabendo2').upload(generatedFilePath, file);
    if (uploadError) {
      toast({ title: "Erro no Upload", description: uploadError.message, variant: "destructive" });
      setIsProcessing(false);
      return;
    }
    setFilePath(generatedFilePath);

    Papa.parse(file, {
      header: true, preview: 5, skipEmptyLines: true,
      complete: (results: ParseResult<CsvData>) => {
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvData(results.data);
        const autoMappings: Mapping = {};
        headers.forEach(header => {
            const normalizedHeader = header.toLowerCase().replace(/ /g, '_');
            const found = systemColumns.find(sc => sc.name.toLowerCase().replace(/ /g, '_') === normalizedHeader || sc.id === normalizedHeader);
            if (found) autoMappings[header] = found.id;
        });
        setMappings(autoMappings);
        setStep('mapping');
        setIsProcessing(false);
      }
    });
  };

  const handleMappingChange = (csvHeader: string, systemColumnId: string) => {
    if (systemColumnId === 'new_column') {
      setNewColumnModal({ open: true, csvHeader });
    } else {
      setMappings(prev => ({ ...prev, [csvHeader]: systemColumnId }));
    }
  };

  const handleCreateNewColumn = async (name: string, type: Column['type']) => {
    if (!newColumnModal.csvHeader) return;
    const newColumn = await addColumn(name, type);
    if (newColumn) {
      setMappings(prev => ({...prev, [newColumnModal.csvHeader!]: newColumn.id}));
      toast({ title: "Coluna Criada!", description: `A coluna "${name}" foi adicionada.` });
    } else {
      toast({ title: "Erro", description: "Não foi possível criar a nova coluna.", variant: "destructive" });
    }
    setNewColumnModal({ open: false, csvHeader: null });
  };
  
  const handleImport = async () => {
    setIsProcessing(true);
    const { error } = await supabase.functions.invoke('import-tasks', {
      body: { filePath, projectId, mappings },
    });
    setIsProcessing(false);

    if (error) {
      toast({ title: "Erro na Importação", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Importação Concluída!", description: "As novas tarefas foram adicionadas ao projeto." });
      onImportSuccess();
      onOpenChange(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'upload': return <UploadStep file={file} setFile={setFile} />;
      case 'mapping': return <MappingStep headers={csvHeaders} systemColumns={systemColumns} mappings={mappings} onMappingChange={handleMappingChange} projectName={projectName} />;
      case 'preview': return <PreviewStep data={csvData} mappings={mappings} systemColumns={systemColumns} />;
      default: return <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
  };

  const getFooter = () => {
    if (step === 'upload') return <DialogFooter className="mt-4"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleUploadAndParse} disabled={!file || isProcessing}>{isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isProcessing ? "Analisando..." : "Analisar Arquivo"}</Button></DialogFooter>;
    if (step === 'mapping') return <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button><Button onClick={() => setStep('preview')}>Continuar para Pré-visualização <ArrowRight className="ml-2 h-4 w-4" /></Button></DialogFooter>;
    if (step === 'preview') return <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setStep('mapping')}>Voltar</Button><Button onClick={handleImport} disabled={isProcessing}>{isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Importar Tarefas</Button></DialogFooter>;
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Importar Tarefas para "{projectName}"</DialogTitle>
            <DialogDescription>
              Siga os passos para importar suas tarefas para o projeto selecionado.
            </DialogDescription>
          </DialogHeader>
          {renderContent()}
          {getFooter()}
        </DialogContent>
      </Dialog>
      <NewColumnDialog open={newColumnModal.open} onOpenChange={(open) => setNewColumnModal({ open, csvHeader: null })} onCreate={handleCreateNewColumn} />
    </>
  );
}

// Subcomponentes
const UploadStep = ({ file, setFile }: any) => {
  const onDrop = (acceptedFiles: File[]) => { if (acceptedFiles.length > 0) setFile(acceptedFiles[0]); };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] }, multiple: false });
  return (
    <>
      <div {...getRootProps()} className={`mt-4 border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2 text-muted-foreground"><UploadCloud className="h-10 w-10" />{isDragActive ? <p>Solte o arquivo...</p> : <p>Arraste e solte o arquivo CSV ou clique para selecionar</p>}</div>
      </div>
      {file && <div className="mt-4 p-2 border rounded-md flex items-center justify-between"><div className="flex items-center gap-2"><FileIcon className="h-5 w-5 text-muted-foreground" /><span className="text-sm">{file.name}</span></div><Button variant="ghost" size="sm" onClick={() => setFile(null)}>Remover</Button></div>}
    </>
  );
};
const MappingStep = ({ headers, systemColumns, mappings, onMappingChange, projectName }: any) => {
    const targetOptions = [{ id: 'ignore', name: 'Ignorar esta coluna' }, {id: 'new_column', name: '+ Criar Nova Coluna'}, ...systemColumns];
    return <ScrollArea className="h-96"><p className="text-sm text-muted-foreground mb-4">Mapeie as colunas do seu arquivo para os campos do projeto <strong>{projectName}</strong>.</p><Table><TableHeader><TableRow><TableHead>Sua Coluna (do CSV)</TableHead><TableHead>Nosso Campo no Sistema</TableHead></TableRow></TableHeader><TableBody>{headers.map((header: string) => (<TableRow key={header}><TableCell className="font-medium">{header}</TableCell><TableCell><Select value={mappings[header] || 'ignore'} onValueChange={(value) => onMappingChange(header, value)}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{targetOptions.map((option: any) => (<SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>))}</SelectContent></Select></TableCell></TableRow>))}</TableBody></Table></ScrollArea>
};
const PreviewStep = ({ data, mappings, systemColumns }: any) => {
    const mappedHeaders = Object.keys(mappings).filter(h => mappings[h] !== 'ignore' && mappings[h] !== 'new_column');
    return <ScrollArea className="h-96"><p className="text-sm text-muted-foreground mb-4">Confirme se os dados estão corretos antes de importar.</p><Table><TableHeader><TableRow>{mappedHeaders.map(h => <TableHead key={h}>{systemColumns.find(c => c.id === mappings[h])?.name || h}</TableHead>)}</TableRow></TableHeader><TableBody>{data.map((row: any, i: number) => (<TableRow key={i}>{mappedHeaders.map(h => <TableCell key={h}>{row[h]}</TableCell>)}</TableRow>))}</TableBody></Table></ScrollArea>
};
const NewColumnDialog = ({ open, onOpenChange, onCreate }: any) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<Column['type']>('text');
    const handleCreate = () => { if(name) { onCreate(name, type); setName(''); setType('text'); } };
    return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Criar Nova Coluna</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="name" className="text-right">Nome</Label><Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" /></div><div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="type" className="text-right">Tipo</Label><Select value={type} onValueChange={v => setType(v as any)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Texto</SelectItem><SelectItem value="number">Número</SelectItem><SelectItem value="date">Data</SelectItem><SelectItem value="progress">Progresso</SelectItem></SelectContent></Select></div></div><DialogFooter><Button onClick={handleCreate} disabled={!name}>Criar Coluna</Button></DialogFooter></DialogContent></Dialog>
};
