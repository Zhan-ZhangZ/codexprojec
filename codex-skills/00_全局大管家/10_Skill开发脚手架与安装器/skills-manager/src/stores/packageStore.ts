import { create } from "zustand";

import { invoke, isTauriRuntime } from "@/lib/tauri";
import {
  ProjectBatchInstallResult,
  SkillPackageDetail,
  SkillPackageSummary,
} from "@/types";

interface PackageInstallResult {
  deployment_id: string;
  package_id: string;
  project_id: string;
  install_mode: string;
  selected_skill_ids: string[];
  skill_result: ProjectBatchInstallResult;
}

interface PackageState {
  packages: SkillPackageSummary[];
  details: Record<string, SkillPackageDetail>;
  isLoading: boolean;
  error: string | null;
  loadPackages: () => Promise<void>;
  loadPackageDetail: (packageId: string) => Promise<SkillPackageDetail>;
  installToProject: (
    packageId: string,
    projectId: string,
    selectedSkillIds: string[],
    installMode?: "generic" | "native",
    confirmNativeChanges?: boolean,
    method?: "auto" | "symlink" | "copy"
  ) => Promise<PackageInstallResult>;
}

export const usePackageStore = create<PackageState>((set, get) => ({
  packages: [],
  details: {},
  isLoading: false,
  error: null,

  loadPackages: async () => {
    if (!isTauriRuntime()) return;
    set({ isLoading: true, error: null });
    try {
      const packages = await invoke<SkillPackageSummary[]>("list_skill_packages");
      set({ packages, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  loadPackageDetail: async (packageId) => {
    const cached = get().details[packageId];
    if (cached) return cached;
    const detail = await invoke<SkillPackageDetail>("get_skill_package", {
      packageId,
    });
    set((state) => ({
      details: { ...state.details, [packageId]: detail },
    }));
    return detail;
  },

  installToProject: async (
    packageId,
    projectId,
    selectedSkillIds,
    installMode = "generic",
    confirmNativeChanges = false,
    method = "auto"
  ) =>
    invoke<PackageInstallResult>("install_skill_package_to_project", {
      packageId,
      projectId,
      selectedSkillIds,
      installMode,
      confirmNativeChanges,
      method,
    }),
}));
