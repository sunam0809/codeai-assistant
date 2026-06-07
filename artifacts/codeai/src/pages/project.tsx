import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { useGetProject, useGetMessages, useSendMessage, getGetMessagesQueryKey, getGetProjectQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Download, Terminal, Bot, User as UserIcon, FileCode2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Project() {
  const { id } = useParams();
  const projectId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId }
  });

  const { data: messages, isLoading: messagesLoading } = useGetMessages(projectId, {
    query: { enabled: !!projectId }
  });

  const sendMessage = useSendMessage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        setInput("");
      },
      onError: () => {
        toast({ title: "전송 실패", variant: "destructive" });
      }
    }
  });

  const handleSend = () => {
    if (!input.trim() || !projectId) return;
    sendMessage.mutate({ data: { content: input }, projectId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessage.isPending]);

  const getDownloadUrl = (fileId: number) => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    return `${base}/api/files/${fileId}/download`;
  };

  if (projectLoading || messagesLoading) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center flex-col gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-primary animate-pulse">연결 중...</p>
        </div>
      </Layout>
    );
  }

  if (!project) return <Layout><div className="p-6 text-muted-foreground">프로젝트를 찾을 수 없습니다</div></Layout>;

  return (
    <Layout>
      <div className="flex flex-col h-full">

        {/* Header */}
        <header className="shrink-0 px-5 py-3 border-b border-border bg-background/95 backdrop-blur-sm hidden md:flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold">{project.name}</h2>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!messages || messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-16">
              <Bot className="w-14 h-14 text-primary mb-3" />
              <h3 className="text-lg font-black mb-1">CodeAI 준비 완료</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                코드 요청을 입력하면 완성된 파일로 제공합니다.<br />
                (예: "Python 크롤러 만들어줘", "로그인 페이지 HTML")
              </p>
            </div>
          ) : (
            messages.map(msg => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isUser ? "bg-secondary" : "bg-primary text-primary-foreground"
                  }`}>
                    {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
                    <Card className={`px-4 py-3 rounded-2xl border ${
                      isUser
                        ? "bg-secondary/40 border-transparent rounded-tr-sm"
                        : "bg-card border-border rounded-tl-sm"
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content || (msg.files && msg.files.length > 0 ? "" : "...")}</p>
                    </Card>

                    {/* File downloads */}
                    {!isUser && msg.files && msg.files.length > 0 && (
                      <div className="flex flex-col gap-2 w-full">
                        {msg.files.map(file => (
                          <a
                            key={file.id}
                            href={getDownloadUrl(file.id)}
                            className="flex items-center gap-3 bg-primary/5 border border-primary/20 hover:border-primary/50 hover:bg-primary/10 transition-all rounded-xl px-4 py-3 group"
                            download={file.filename}
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <FileCode2 className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">{file.filename}</p>
                              <p className="text-xs text-muted-foreground">{(file.sizeBytes / 1024).toFixed(1)} KB</p>
                            </div>
                            <Download className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {sendMessage.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <Card className="px-4 py-3 rounded-2xl border border-primary/30 bg-card rounded-tl-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm font-medium text-primary animate-pulse">코드 생성 중...</span>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 p-3 border-t border-border bg-background">
          <div className="max-w-3xl mx-auto relative flex items-end gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="코드 요청 입력... (Ctrl+Enter로 전송)"
              className="min-h-[60px] max-h-[200px] resize-none rounded-2xl border-2 border-border bg-input/50 p-3 pr-14 text-sm focus-visible:ring-primary focus-visible:border-primary"
            />
            <Button
              onClick={handleSend}
              disabled={sendMessage.isPending || !input.trim()}
              size="icon"
              className="absolute right-2 bottom-2 h-9 w-9 rounded-xl"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-1.5 opacity-50">모든 코드는 파일로 제공됩니다</p>
        </div>

      </div>
    </Layout>
  );
}
