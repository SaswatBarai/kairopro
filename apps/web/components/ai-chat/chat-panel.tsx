"use client";

import { useState, useEffect, useRef } from "react";
import { ChatMessage } from "./chat-message";
import { Send, Loader2 } from "lucide-react";

export function ChatPanel({ projectId }: { projectId: string }) {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadHistory();
    }, [projectId]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const loadHistory = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/chat`);
            const data = await res.json();
            setMessages(data.messages || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const val = input.trim();
        setInput("");
        setIsLoading(true);

        const tempMsg = { id: 'temp', role: 'user', content: val, createdAt: new Date().toISOString() };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const res = await fetch(`/api/projects/${projectId}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: val })
            });
            const data = await res.json();
            // Since AI response happens async in background, we just poll for now
            // A real WS/SSE would push the assistant reply here.
            setTimeout(loadHistory, 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 text-sm font-bold text-slate-300">
                AI Developer Assistant
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.length === 0 ? (
                    <div className="text-center text-sm text-slate-500 mt-10">
                        Ask the AI to build a feature, fix a bug, or explain code.
                    </div>
                ) : (
                    messages.map((msg, i) => <ChatMessage key={msg.id || i} message={msg} />)
                )}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                        <div className="bg-slate-800 rounded-2xl rounded-tl-sm p-4 w-16 flex items-center justify-center">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <form onSubmit={handleSend} className="relative">
                    <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type a message to the AI..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button 
                        type="submit" 
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 rounded-lg flex items-center justify-center transition-colors"
                    >
                        <Send className="w-4 h-4 text-white" />
                    </button>
                </form>
            </div>
        </div>
    );
}
