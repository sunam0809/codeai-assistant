import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout, useGetProjects } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, Home, Plus, Terminal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe({
    query: {
      retry: false,
    },
  });
  
  const { data: projects, isLoading: projectsLoading } = useGetProjects();
  
  const logout = useLogout({
    mutation: {
      onSuccess: () => {
        localStorage.removeItem("codeai_token");
        setLocation("/login");
      },
    },
  });

  const handleLogout = () => {
    logout.mutate();
  };

  const NavLinks = () => (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors text-lg font-bold ${location === '/dashboard' ? 'bg-secondary' : 'hover:bg-secondary/50'}`}>
          <Home className="w-6 h-6" /> Dashboard
        </Link>
        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-lg font-bold">
          <Plus className="w-6 h-6" /> New Project
        </Link>
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-4">Projects</h3>
        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="flex flex-col gap-1 pb-4">
            {projectsLoading ? (
              [1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)
            ) : projects?.map(project => (
              <Link 
                key={project.id} 
                href={`/projects/${project.id}`} 
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium truncate ${location === `/projects/${project.id}` ? 'bg-secondary text-primary' : 'hover:bg-secondary/50'}`}
              >
                <Terminal className="w-4 h-4 shrink-0" /> 
                <span className="truncate">{project.name}</span>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 border-r-2 border-border p-6 gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl">
            C
          </div>
          <span className="text-2xl font-black tracking-tight text-primary">CodeAI</span>
        </div>
        <nav className="flex-1">
          <NavLinks />
        </nav>
        <div className="mt-auto pt-6 border-t-2 border-border">
          {isLoading ? (
            <Skeleton className="h-14 w-full rounded-2xl" />
          ) : user ? (
            <div className="flex items-center justify-between">
              <div className="font-bold truncate">{user.username}</div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-xl">
                <LogOut className="w-5 h-5 text-destructive" />
              </Button>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b-2 border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black">
              C
            </div>
            <span className="text-xl font-black text-primary">CodeAI</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-xl border-2">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-6 flex flex-col gap-8 bg-background border-r-2 border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl">
                  C
                </div>
                <span className="text-2xl font-black tracking-tight text-primary">CodeAI</span>
              </div>
              <nav className="flex-1">
                <NavLinks />
              </nav>
              <div className="mt-auto pt-6 border-t-2 border-border">
                {user && (
                  <div className="flex items-center justify-between">
                    <div className="font-bold truncate">{user.username}</div>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-xl">
                      <LogOut className="w-5 h-5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
