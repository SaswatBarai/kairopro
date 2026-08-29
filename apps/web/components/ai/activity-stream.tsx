"use client";

import { useEffect, useState } from "react";
import { Terminal } from "lucide-react";

export function ActivityStream({ projectId }: { projectId: string }) {
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        // Mocking SSE for now since we don't have a dedicated event stream API set up for agent runs
        // In real app, we would connect to /api/projects/[id]/events
        const interval = setInterval(() => {
            // Simulated fetch of latest agent events
        }, 2000);

        return () => clearInterval(interval);
    }, [projectId]);

    return (
        <div className="bg-black/50 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 h-64 overflow-y-auto">
            <div className="flex items-center gap-2 text-indigo-400 mb-4 pb-2 border-b border-slate-800/50">
                <Terminal className="w-4 h-4" /> Agent Activity Stream
            </div>
            {events.length === 0 ? (
                <div className="text-slate-600">Waiting for agent activity...</div>
            ) : (
                events.map((e, i) => (
                    <div key={i} className="mb-2">
                        <span className="text-slate-500">[{new Date(e.createdAt).toLocaleTimeString()}]</span>{" "}
                        <span className="text-emerald-400">{e.eventType}</span>:{" "}
                        <span className="text-slate-300">{JSON.stringify(e.data)}</span>
                    </div>
                ))
            )}
        </div>
    );
}
