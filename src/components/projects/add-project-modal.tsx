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
import { formatToISODate } from "@/lib/date-utils";
import type { Project, User } from "@/lib/types";

interface AddProjectModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (projectData: Omit<Project, "id" | "created_at"> & { collaborator_ids?: string[] }) => void;
}

export default function AddProjectModal({ isOpen, onOpenChange, onSave }: AddProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [budget, setBudget] = useState<number | string>("");
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>([]);
  
  const { users, loading: loadingUsers } = useUsers(); // Busca todos os usuários do sistema
  
  // Limpa o formulário quando o modal é fechado
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setStartDate(undefined);
      setEndDate(undefined);
      setBudget("");
      setSelectedCollaboratorIds([]);
    }
  }, [isOpen]);

  const handleSave = () => {
    onSave({
      name,
      description,
      start_date: startDate ? formatToISODate(startDate) : undefined,
      end_date: endDate ? formatToISODate(endDate) : undefined,
      budget: typeof budget === 'number' ? budget : parseFloat(budget.toString().replace(',', '.')) || 0,
      collaborator_ids: selectedCollaboratorIds,
    });
    onOpenChange(false);
  };

  const userOptions = users.map(user => ({
    value: user.id,
    label: user.name || user.email || 'Usuário sem nome',
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
          <DialogDescription>
            Defina os parâmetros estratégicos e adicione a equipe inicial do projeto.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="name">Nome do Projeto</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Lançamento do Produto X" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva os objetivos e o escopo do projeto" />
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
            <Input id="budget" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ex: 50000.00" />
          </div>
          <div className="col-span-2">
            <Label>Adicionar Membros da Equipe</Label>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name || loadingUsers}>
            {loadingUsers ? "Carregando..." : "Salvar Projeto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
