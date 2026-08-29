"use client";

import { CheckCircle, Circle, Play, Loader2, XCircle } from "lucide-react";

export function TaskList({ tasks }: { tasks: any[] }) {
    if (!tasks || tasks.length === 0) return <div className="text-sm text-slate-500">No tasks generated yet.</div>;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed": return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case "in_progress": return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />;
            case "testing": return <Play className="w-5 h-5 text-amber-500" />;
            case "failed": return <XCircle className="w-5 h-5 text-red-500" />;
            default: return <Circle className="w-5 h-5 text-slate-600" />;
        }
    };

    return (
        <div className="space-y-3">
            {tasks.map((task: any) => (
                <div key={task.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex gap-4 items-start">
                    <div className="pt-0.5">{getStatusIcon(task.status)}</div>
                    <div>
                        <div className="font-semibold text-slate-200">{task.title}</div>
                        <div className="text-sm text-slate-400 mt-1">{task.description}</div>
                        <div className="text-xs font-mono text-slate-600 mt-2 uppercase">{task.taskType}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
