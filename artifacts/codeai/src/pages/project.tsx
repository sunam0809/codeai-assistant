import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { useGetProject, useGetMessages, useSendMessage, getGetMessagesQueryKey, getGetProjectQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Download, Terminal, Bot, User as UserIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const API_BASE = ""; // We can use relative path for proxy

function CodeBlock({ code, language }: { code: string, language: string }) {
  return (
    <div className="rounded-xl overflow-hidden border-2 border-border my-4 bg-black">
      <div className="bg-secondary/80 px-4 py-2 text-xs font-bold text-muted-foreground flex justify-between items-center border-b border-border">
        <span>{language}</span>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
        wrapLines={true}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function parseMessageContent(content: string) {
  // Simple regex to find markdown code blocks
  const parts = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'code', language: match[1] || 'text', content: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.substring(lastIndex) });
  }

  return parts;
}

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
        toast({ title: "Failed to send message", variant: "destructive" });
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

  if (projectLoading || messagesLoading) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center flex-col gap-6">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
          <p className="text-xl font-bold text-primary animate-pulse">Establishing connection...</p>
        </div>
      </Layout>
    );
  }

  if (!project) return <Layout><div>Project not found</div></Layout>;

  return (
    <Layout>
      <div className="flex flex-col h-full h-[100dvh]">
        
        {/* Chat Header */}
        <header className="shrink-0 p-6 border-b-2 border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10 hidden md:block">
          <h2 className="text-2xl font-black flex items-center gap-3">
            <Terminal className="w-6 h-6 text-primary" />
            {project.name}
          </h2>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
          {!messages || messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <Bot className="w-24 h-24 text-primary mb-6" />
              <h3 className="text-3xl font-black mb-2">Systems Online</h3>
              <p className="text-xl font-medium">Input parameters to commence generation.</p>
            </div>
          ) : (
            messages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    isUser ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
                  }`}>
                    {isUser ? <UserIcon className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                  </div>
                  
                  <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <Card className={`p-5 rounded-3xl border-2 ${
                      isUser ? 'bg-secondary/30 border-transparent rounded-tr-sm' : 'bg-card border-border rounded-tl-sm'
                    }`}>
                      <div className="text-lg leading-relaxed space-y-2 whitespace-pre-wrap font-medium">
                        {parseMessageContent(msg.content).map((part, i) => {
                          if (part.type === 'code') {
                            return <CodeBlock key={i} code={part.content} language={part.language!} />;
                          }
                          return <span key={i}>{part.content}</span>;
                        })}
                      </div>
                    </Card>

                    {/* Files if assistant */}
                    {!isUser && msg.files && msg.files.length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        {msg.files.map(file => (
                          <a 
                            key={file.id}
                            href={`/api/files/${file.id}/download`} 
                            className="flex items-center gap-2 bg-accent/10 border-2 border-accent/20 text-accent px-4 py-2 rounded-xl hover:bg-accent/20 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            <span className="font-bold text-sm">{file.filename}</span>
                            <span className="opacity-50 text-xs text-muted-foreground ml-2">{(file.sizeBytes / 1024).toFixed(1)} KB</span>
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
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6" />
              </div>
              <Card className="p-5 rounded-3xl border-2 bg-card border-primary/50 rounded-tl-sm flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="font-bold text-primary animate-pulse">Generating sequence...</span>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="shrink-0 p-4 md:p-6 border-t-2 border-border bg-background">
          <div className="max-w-5xl mx-auto relative flex items-end gap-4">
            <Textarea 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter instructions... (Ctrl+Enter to execute)"
              className="min-h-[80px] max-h-[300px] resize-none rounded-3xl border-2 border-border bg-input/50 p-6 pr-20 text-lg font-medium focus-visible:ring-primary focus-visible:border-primary"
            />
            <Button 
              onClick={handleSend}
              disabled={sendMessage.isPending || !input.trim()}
              size="icon"
              className="absolute right-4 bottom-4 h-12 w-12 rounded-2xl bg-primary hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
            >
              <Send className="w-6 h-6" />
            </Button>
          </div>
        </div>

      </div>
    </Layout>
  );
}
