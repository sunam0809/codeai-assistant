import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = useLogin({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("codeai_token", data.token);
        setLocation("/dashboard");
      },
      onError: () => {
        toast({
          title: "Login failed",
          description: "Invalid credentials.",
          variant: "destructive",
        });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ data: { username, password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card border-2 border-card-border p-8 rounded-3xl shadow-xl flex flex-col gap-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-6 flex items-center justify-center text-primary-foreground font-black text-3xl">
            C
          </div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Access Terminal</h1>
          <p className="text-muted-foreground mt-2 font-medium">Authenticate to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Label htmlFor="username" className="text-lg font-bold text-foreground">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-2xl border-2 border-border bg-input h-14 px-4 text-lg font-mono focus-visible:ring-primary"
              placeholder="root"
              required
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="password" className="text-lg font-bold text-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-2xl border-2 border-border bg-input h-14 px-4 text-lg font-mono focus-visible:ring-primary"
              placeholder="••••••••"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full h-16 rounded-2xl text-xl font-black mt-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all border-2 border-transparent"
            disabled={login.isPending}
          >
            {login.isPending ? "Authenticating..." : "INITIALIZE"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-muted-foreground font-medium">
            New operative? <Link href="/register" className="text-primary hover:underline font-bold">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
