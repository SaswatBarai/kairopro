"use client";

import { Globe, Server } from "lucide-react";

export function ApiRoutesList({ apiRoutes, frontendPages }: { apiRoutes: any[], frontendPages: any[] }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-sky-400" /> Frontend Pages
        </h3>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="text-xs text-slate-500 uppercase bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Path</th>
                <th className="px-6 py-3">Component</th>
                <th className="px-6 py-3 text-center">Auth Required</th>
              </tr>
            </thead>
            <tbody>
              {frontendPages?.map((page, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/50">
                  <td className="px-6 py-4 font-mono text-indigo-300">{page.path}</td>
                  <td className="px-6 py-4">{page.component}</td>
                  <td className="px-6 py-4 text-center">
                    {page.auth ? (
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md text-xs">Yes</span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded-md text-xs">No</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!frontendPages || frontendPages.length === 0) && (
                <tr><td colSpan={3} className="px-6 py-4 text-center">No pages defined</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-emerald-400" /> Backend API Routes
        </h3>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="text-xs text-slate-500 uppercase bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3">Path</th>
                <th className="px-6 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {apiRoutes?.map((route, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      route.method === 'GET' ? 'bg-blue-500/10 text-blue-400' :
                      route.method === 'POST' ? 'bg-green-500/10 text-green-400' :
                      route.method === 'PUT' || route.method === 'PATCH' ? 'bg-amber-500/10 text-amber-400' :
                      route.method === 'DELETE' ? 'bg-red-500/10 text-red-400' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {route.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-indigo-300">{route.path}</td>
                  <td className="px-6 py-4">{route.description}</td>
                </tr>
              ))}
              {(!apiRoutes || apiRoutes.length === 0) && (
                <tr><td colSpan={3} className="px-6 py-4 text-center">No API routes defined</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
