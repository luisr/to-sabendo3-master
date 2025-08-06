"use client";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Settings, Printer, Network, ChevronsUpDown, Upload, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { User, TaskStatus } from "@/lib/types";

interface TableHeaderActionsProps {
  isManager: boolean;
  isConsolidatedView: boolean;
  onAddTask: () => void;
  onPrint: () => void;
  onOpenManager: () => void;
  onSetSubtask: () => void;
  isLoading: boolean;
  selectedTasks: Set<string>;
  // Novas ações
  onImport: () => void;
  onExport: () => void;
  // Filtros
  statuses: TaskStatus[];
  users: User[];
  statusFilter: string;
  onStatusChange: (value: string) => void;
  userFilter: string;
  onUserChange: (value: string) => void;
  myTasksOnly: boolean;
  onMyTasksOnlyChange: (checked: boolean) => void;
}

export default function TableHeaderActions({
  isManager,
  isConsolidatedView,
  onAddTask,
  onPrint,
  onOpenManager,
  onSetSubtask,
  isLoading,
  selectedTasks,
  onImport,
  onExport,
  statuses,
  users,
  statusFilter,
  onStatusChange,
  userFilter,
  onUserChange,
  myTasksOnly,
  onMyTasksOnlyChange
}: TableHeaderActionsProps) {
  return (
    <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Filtros da Tabela */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por status..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {statuses.map(status => <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={userFilter} onValueChange={onUserChange}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por responsável..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Responsáveis</SelectItem>
            {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-2">
          <Switch id="my-tasks-only" checked={myTasksOnly} onCheckedChange={onMyTasksOnlyChange} />
          <Label htmlFor="my-tasks-only">Apenas minhas tarefas</Label>
        </div>
      </div>
      <div className="flex gap-2">
        {!isConsolidatedView && isManager && (
          <Button variant="outline" size="sm" onClick={onAddTask}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar Tarefa
          </Button>
        )}
        
        {/* Menu de Ações */}
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    Ações <ChevronsUpDown className="h-4 w-4 ml-2" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {isManager && selectedTasks.size > 0 && (
                    <DropdownMenuItem onClick={onSetSubtask}>
                        <Network className="h-4 w-4 mr-2" /> Definir como Subtarefa
                    </DropdownMenuItem>
                )}
                 {!isConsolidatedView && isManager && (
                    <DropdownMenuItem onClick={onImport}>
                        <Upload className="h-4 w-4 mr-2" /> Importar de CSV
                    </DropdownMenuItem>
                 )}
                <DropdownMenuItem onClick={onExport}>
                    <Download className="h-4 w-4 mr-2" /> Exportar para CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPrint} disabled={isLoading}>
                    <Printer className="h-4 w-4 mr-2" /> Imprimir
                </DropdownMenuItem>
                {isManager && (
                    <DropdownMenuItem onClick={onOpenManager}>
                        <Settings className="h-4 w-4 mr-2" /> Gerenciar Tabela
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
