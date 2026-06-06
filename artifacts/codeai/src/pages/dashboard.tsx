import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetProjects, useCreateProject, useGetProjectStats, getGetProjectsQueryKey, getGetProjectStatsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Terminal, FileCode2, MessageSquare, Plus, Activity, ArrowRight, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: stats, isLoading: statsLoading } = useGetProjectStats();
  const { data: projects, isLoading: projectsLoading } = useGetProjects();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  
  const createProject = useCreateProject({
    mutation: {
      onSuccess: (newProj) => {
        queryClient.invalidateQueries({ queryKey: getGetProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey() });
        setIsDialogOpen(false);
        setNewProjectName("");
        setLocation(`/projects/${newProj.id}`);
      },
      onError: () => {
        toast({
          title: "Failed to create project",
          variant: "destructive"
        });
      }
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createProject.mutate({ data: { name: newProjectName } });
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-12">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-primary tracking-tighter">System Overview</h1>
            <p className="text-xl text-muted-foreground mt-2 font-medium">Monitoring operative progress.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-16 px-8 rounded-3xl text-xl font-bold gap-3 shadow-lg shadow-primary/20">
                <Plus className="w-6 h-6" /> NEW PROJECT
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl border-2 border-border bg-card p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-primary">Initialize New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Input 
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="Project Designation..."
                    className="h-16 rounded-2xl border-2 text-lg px-6 font-bold"
                    autoFocus
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-16 rounded-2xl text-xl font-bold"
                  disabled={createProject.isPending || !newProjectName.trim()}
                >
                  {createProject.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "EXECUTE"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-3xl border-2 border-border bg-secondary/50 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-4 text-primary">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Terminal className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">Projects</h3>
            </div>
            <div className="text-5xl font-black">{statsLoading ? "-" : stats?.totalProjects || 0}</div>
          </Card>
          <Card className="rounded-3xl border-2 border-border bg-secondary/50 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-4 text-accent">
              <div className="p-3 bg-accent/10 rounded-2xl">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">Messages</h3>
            </div>
            <div className="text-5xl font-black">{statsLoading ? "-" : stats?.totalMessages || 0}</div>
          </Card>
          <Card className="rounded-3xl border-2 border-border bg-secondary/50 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-4 text-emerald-400">
              <div className="p-3 bg-emerald-400/10 rounded-2xl">
                <FileCode2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">Generated Files</h3>
            </div>
            <div className="text-5xl font-black">{statsLoading ? "-" : stats?.totalFiles || 0}</div>
          </Card>
        </div>

        {/* Projects List */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-black">Active Projects</h2>
          </div>
          
          {projectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1,2,3,4].map(i => <div key={i} className="h-40 rounded-3xl bg-secondary/50 animate-pulse" />)}
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map(project => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="group cursor-pointer rounded-3xl border-2 border-border bg-card hover:border-primary transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(0,255,255,0.15)] overflow-hidden">
                    <CardContent className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-2xl font-bold truncate pr-4 group-hover:text-primary transition-colors">{project.name}</h3>
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                          <ArrowRight className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex gap-4 text-muted-foreground font-medium">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" />
                          <span>{project.messageCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileCode2 className="w-5 h-5" />
                          <span>{project.fileCount || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-12 border-2 border-dashed border-border rounded-3xl text-center flex flex-col items-center">
              <Terminal className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-2xl font-bold mb-2">No projects initialized.</h3>
              <p className="text-muted-foreground font-medium text-lg">Create a new project to begin coding with AI.</p>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
