"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Task } from "@/lib/types";

interface RecentTasksCardProps {
  tasks: Partial<Task>[]; // Usar Partial<Task> para acomodar os dados da RPC
}

// Função para extrair as iniciais de um nome
const getInitials = (name?: string | null) => {
    if (!name) return 'N/A';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export default function RecentTasksCard({ tasks = [] }: RecentTasksCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
        <CardDescription>
          As últimas tarefas criadas nos seus projetos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarefa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="font-medium">{task.name}</div>
                    <div className="text-sm text-muted-foreground">{task.project_name}</div>
                  </TableCell>
                  <TableCell>
                    {/* CORREÇÃO: Usa os dados pré-carregados 'status_name' e 'status_color' */}
                    {task.status_name && (
                        <Badge 
                            style={{ backgroundColor: task.status_color, color: 'white' }} 
                            className="border-transparent"
                        >
                            {task.status_name}
                        </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right flex justify-end items-center gap-2">
                    <span className="text-sm text-muted-foreground">{task.assignee_name || 'Não atribuído'}</span>
                    <Avatar className="h-8 w-8">
                        {/* CORREÇÃO: Usa as iniciais do 'assignee_name' */}
                        <AvatarFallback>{getInitials(task.assignee_name)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhuma atividade recente.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
