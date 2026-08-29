"use client";

import { useState, useEffect } from "react";
import { OrganizationData, fetchOrganizations, createOrganization } from "@/lib/projects";
import { Building2, ChevronDown, Plus, Check } from "lucide-react";

interface OrganizationSwitcherProps {
  selectedOrgId?: string;
  onSelectOrg: (orgId: string | undefined) => void;
}

export function OrganizationSwitcher({ selectedOrgId, onSelectOrg }: OrganizationSwitcherProps) {
  const [orgs, setOrgs] = useState<OrganizationData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrgs();
  }, []);

  const loadOrgs = async () => {
    try {
      const data = await fetchOrganizations();
      setOrgs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const currentOrg = orgs.find((o) => o.id === selectedOrgId) || orgs[0];

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setLoading(true);
    try {
      const created = await createOrganization(newOrgName.trim());
      setOrgs((prev) => [...prev, created]);
      onSelectOrg(created.id);
      setIsCreating(false);
      setNewOrgName("");
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-6 h-6 rounded-md bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
            {currentOrg?.name?.[0]?.toUpperCase() ?? "O"}
          </div>
          <span className="truncate">{currentOrg?.name ?? "All Workspaces"}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
          <div className="px-2 py-1.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Workspaces
          </div>

          <button
            onClick={() => {
              onSelectOrg(undefined);
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span>All Workspaces</span>
            {!selectedOrgId && <Check className="w-3.5 h-3.5 text-indigo-400" />}
          </button>

          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => {
                onSelectOrg(org.id);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{org.name}</span>
              </div>
              {selectedOrgId === org.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
            </button>
          ))}

          <div className="border-t border-slate-800 pt-1">
            {isCreating ? (
              <form onSubmit={handleCreateOrg} className="p-2 space-y-2">
                <input
                  type="text"
                  placeholder="Org Name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white placeholder-slate-500 focus:outline-none"
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium rounded"
                  >
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-indigo-400 font-medium hover:bg-indigo-950/30 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Organization
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
