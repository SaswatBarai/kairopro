import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthState {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  activeOrgId: string | null;
  activeOrgName: string | null;
  setAuth: (data: {
    userId: string;
    userName: string;
    userEmail: string;
    activeOrgId: string;
    activeOrgName?: string;
  }) => void;
  setActiveOrg: (orgId: string, orgName?: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      userName: null,
      userEmail: null,
      activeOrgId: null,
      activeOrgName: null,
      setAuth: (data) =>
        set({
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          activeOrgId: data.activeOrgId,
          activeOrgName: data.activeOrgName ?? "Personal Org",
        }),
      setActiveOrg: (orgId, orgName) =>
        set({
          activeOrgId: orgId,
          activeOrgName: orgName ?? "Personal Org",
        }),
      clearAuth: () =>
        set({
          userId: null,
          userName: null,
          userEmail: null,
          activeOrgId: null,
          activeOrgName: null,
        }),
    }),
    {
      name: "kairopro-auth-storage",
    },
  ),
);
