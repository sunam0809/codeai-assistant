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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = useRegister({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("codeai_token", data.token);
        setLocation("/dashboard");
      },
      onError: (error: any) => {
        const msg = error?.response?.data?.error || error?.message || "계정을 생성할 수 없습니다.";
        toast({
          title: "회원가입 실패",
          description: msg,
          variant: "destructive",
        });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast({ title: "오류", description: "유효한 이메일을 입력해주세요.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "오류", description: "비밀번호는 6자 이상이어야 합니다.", variant: "destructive" });
      return;
    }
    register.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card border-2 border-card-border p-8 rounded-3xl shadow-xl flex flex-col gap-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-6 flex items-center justify-center text-primary-foreground font-black text-3xl">
            C
          </div>
          <h1 className="text-3xl font-black text-primary tracking-tight">새 계정 만들기</h1>
          <p className="text-muted-foreground mt-2 font-medium">이메일로 가입하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Label htmlFor="email" className="text-lg font-bold text-foreground">이메일</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-2xl border-2 border-border bg-input h-14 px-4 text-lg font-mono focus-visible:ring-primary"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="password" className="text-lg font-bold text-foreground">비밀번호</Label>
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
            {register.isPending ? "생성 중..." : "계정 만들기"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-muted-foreground font-medium">
            이미 계정이 있으신가요? <Link href="/login" className="text-primary hover:underline font-bold">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
