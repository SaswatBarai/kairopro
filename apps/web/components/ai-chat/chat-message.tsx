"use client";

import { User, Bot } from "lucide-react";

export function ChatMessage({ message }: { message: any }) {
    const isUser = message.role === "user";

    return (
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl p-4 ${isUser ? 'bg-indigo-600/20 text-indigo-100 rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm'}`}>
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                <div className={`text-[10px] mt-2 ${isUser ? 'text-indigo-400/50 text-right' : 'text-slate-500'}`}>
                    {new Date(message.createdAt).toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}
