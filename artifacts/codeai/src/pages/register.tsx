import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast({ title: "오류", description: "유효한 이메일을 입력해주세요.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "오류", description: "비밀번호는 6자 이상이어야 합니다.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await axios.post(`${base}/api/auth/register`, { email, password });
      if (res.data.devCode) setDevCode(res.data.devCode);
      setStep("verify");
      toast({ title: "인증 코드 발송", description: "이메일로 6자리 코드가 발송되었습니다." });
    } catch (err: any) {
      const msg = err?.response?.data?.error || "계정을 생성할 수 없습니다.";
      toast({ title: "회원가입 실패", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast({ title: "오류", description: "6자리 코드를 입력해주세요.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await axios.post(`${base}/api/auth/verify`, { email, code });
      localStorage.setItem("codeai_token", res.data.token);
      setLocation("/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.error || "인증에 실패했습니다.";
      toast({ title: "인증 실패", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await axios.post(`${base}/api/auth/resend`, { email });
      if (res.data.devCode) setDevCode(res.data.devCode);
      toast({ title: "재발송 완료", description: "새 인증 코드가 발송되었습니다." });
    } catch {
      toast({ title: "오류", description: "재발송에 실패했습니다.", variant: "destructive" });
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
          {step === "form" ? (
            <>
              <h1 className="text-xl font-black text-primary">새 계정 만들기</h1>
              <p className="text-muted-foreground text-sm mt-1">이메일로 가입하세요</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-black text-primary">이메일 인증</h1>
              <p className="text-muted-foreground text-sm mt-1">
                <span className="text-foreground font-medium">{email}</span>으로<br />발송된 6자리 코드를 입력하세요
              </p>
            </>
          )}
        </div>

        {step === "form" ? (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
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
                placeholder="6자 이상"
                required
              />
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl font-bold mt-1" disabled={loading}>
              {loading ? "처리 중..." : "계정 만들기"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            {devCode && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-400 mb-1">개발 모드 — 이메일 미설정</p>
                <p className="text-2xl font-black tracking-widest text-amber-300">{devCode}</p>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code" className="text-sm font-bold">인증 코드</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="rounded-xl border-2 h-12 px-3 text-center text-2xl font-black tracking-[0.3em]"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl font-bold" disabled={loading || code.length !== 6}>
              {loading ? "확인 중..." : "인증 완료"}
            </Button>
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="text-sm text-muted-foreground hover:text-primary transition-colors text-center"
            >
              코드 재발송
            </button>
          </form>
        )}

        <div className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-primary hover:underline font-bold">로그인</Link>
        </div>
      </div>
    </div>
  );
}
