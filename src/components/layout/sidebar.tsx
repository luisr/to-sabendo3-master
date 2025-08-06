"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AreaChart,
  BrainCircuit,
  Calendar,
  ClipboardList,
  KanbanSquare,
  LayoutDashboard,
  Package2,
  Settings,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Painel" },
    { href: "/projects", icon: KanbanSquare, label: "Projetos" },
    { href: "/projects?filter=my_tasks", icon: ClipboardList, label: "Minhas Tarefas" },
    { href: "/bi", icon: AreaChart, label: "BI" }, // CORREÇÃO: Aponta para a nova página /bi
    { href: "/calendar", icon: Calendar, label: "Calendário" },
    { href: "/ai-tools", icon: BrainCircuit, label: "Ferramentas de IA" },
]

export default function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const checkActive = (href: string, label: string) => {
    const currentFilter = searchParams.get('filter');

    if (label === 'Minhas Tarefas') {
      return pathname === '/projects' && currentFilter === 'my_tasks';
    }
    if (label === 'Projetos') {
      return pathname === '/projects' && !currentFilter;
    }
    
    return pathname.startsWith(href) && href !== '/projects';
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="/dashboard"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Package2 className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">To Sabendo</span>
          </Link>
          {navItems.map((item) => (
             <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                <Link
                    href={item.href}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:text-foreground md:h-8 md:w-8 ${checkActive(item.href, item.label) ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
                >
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{item.label}</span>
                </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:text-foreground md:h-8 md:w-8 ${pathname.startsWith('/settings') ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Configurações</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Configurações</TooltipContent>
          </Tooltip>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
