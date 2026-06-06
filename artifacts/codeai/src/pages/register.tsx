import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const register = useRegister({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("codeai_token", data.token);
        setLocation("/dashboard");
      },
      onError: (error: any) => {
        toast({
          title: "Registration failed",
          description: error?.message || "Could not create account.",
          variant: "destructive",
        });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.length < 3 || password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Username must be 3+ chars, password 6+ chars.",
        variant: "destructive",
      });
      return;
    }
    register.mutate({ data: { username, password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card border-2 border-card-border p-8 rounded-3xl shadow-xl flex flex-col gap-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-6 flex items-center justify-center text-primary-foreground font-black text-3xl">
            C
          </div>
          <h1 className="text-3xl font-black text-primary tracking-tight">New Operative</h1>
          <p className="text-muted-foreground mt-2 font-medium">Create your access credentials</p>
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
            disabled={register.isPending}
          >
            {register.isPending ? "Generating..." : "CREATE RECORD"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-muted-foreground font-medium">
            Already registered? <Link href="/login" className="text-primary hover:underline font-bold">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
