import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await axios.post(`${base}/api/auth/login`, { email, password });
      localStorage.setItem("codeai_token", res.data.token);
      setLocation("/dashboard");
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.requiresVerification) {
        toast({
          title: "이메일 인증 필요",
          description: "회원가입을 다시 진행해서 인증을 완료해주세요.",
          variant: "destructive",
        });
        setLocation("/register");
        return;
      }
      const msg = data?.error || "이메일 또는 비밀번호가 틀렸습니다.";
      toast({ title: "로그인 실패", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm bg-card border-2 border-border p-7 rounded-2xl shadow-xl flex flex-col gap-6">

        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary mx-auto mb-4 flex items-center justify-center text-primary-foreground font-black text-xl">
            C
          </div>
          <h1 className="text-xl font-black text-primary">로그인</h1>
          <p className="text-muted-foreground text-sm mt-1">이메일로 로그인하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-sm font-bold">이메일</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border-2 h-11 px-3 text-sm"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-sm font-bold">비밀번호</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border-2 h-11 px-3 text-sm"
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full h-11 rounded-xl font-bold mt-1" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          계정이 없으신가요?{" "}
          <Link href="/register" className="text-primary hover:underline font-bold">회원가입</Link>
        </div>
      </div>
    </div>
  );
}
