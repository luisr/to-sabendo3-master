"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "../shared/date-picker";
import { MultiSelect } from "../shared/multi-select";
import { useUsers } from "@/hooks/use-users";
import { useCollaborators } from "@/hooks/use-collaborators";
import { formatToISODate, parseUTCDate } from "@/lib/date-utils";
import type { Project } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface EditProjectModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, projectData: Partial<Project> & { collaborator_ids?: string[] }) => void;
  project: Project | null;
}

export default function EditProjectModal({ isOpen, onOpenChange, onSave, project }: EditProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [budget, setBudget] = useState<number | string>("");
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>([]);
  
  const { users, loading: loadingUsers } = useUsers();
  const { collaborators, loading: loadingCollaborators } = useCollaborators(project?.id || null);

  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setStartDate(project.start_date ? parseUTCDate(project.start_date) : undefined);
      setEndDate(project.end_date ? parseUTCDate(project.end_date) : undefined);
      setBudget(project.budget || "");
      // Inicializa os colaboradores selecionados com os dados do projeto
      setSelectedCollaboratorIds(collaborators.map(c => c.user_id));
    }
  }, [project, collaborators]); // Reage a mudanças no projeto e na lista de colaboradores carregada

  const handleSave = () => {
    if (!project) return;
    onSave(project.id, {
      name,
      description,
      start_date: startDate ? formatToISODate(startDate) : undefined,
      end_date: endDate ? formatToISODate(endDate) : undefined,
      budget: typeof budget === 'number' ? budget : parseFloat(budget.toString().replace(',', '.')) || 0,
      collaborator_ids: selectedCollaboratorIds,
    });
    onOpenChange(false);
  };

  const isLoading = loadingUsers || loadingCollaborators;

  const userOptions = users.map(user => ({
    value: user.id,
    label: user.name || user.email || 'Usuário sem nome',
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Projeto</DialogTitle>
          <DialogDescription>
            Faça alterações nos detalhes do projeto e em sua equipe.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="py-4 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Nome do Projeto</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="start_date">Data de Início</Label>
              <DatePicker date={startDate} onDateChange={setStartDate} />
            </div>
            <div>
              <Label htmlFor="end_date">Data de Término</Label>
              <DatePicker date={endDate} onDateChange={setEndDate} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="budget">Orçamento (R$)</Label>
              <Input id="budget" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Membros da Equipe</Label>
              <MultiSelect
                options={userOptions}
                selected={selectedCollaboratorIds}
                onChange={setSelectedCollaboratorIds}
                placeholder="Selecione os colaboradores"
                loading={loadingUsers}
                className="min-h-[40px]"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name || isLoading}>
            {isLoading ? "Carregando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
