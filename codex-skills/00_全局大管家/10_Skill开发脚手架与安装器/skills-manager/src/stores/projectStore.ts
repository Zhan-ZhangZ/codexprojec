import { open } from "@tauri-apps/plugin-dialog";
import { create } from "zustand";

import { invoke, isTauriRuntime } from "@/lib/tauri";
import {
  CentralImportResult,
  ManagedProject,
  ProjectBatchInstallResult,
  ProjectInstallPreviewItem,
  ProjectInstallRequest,
  ProjectSkillInstance,
} from "@/types";

interface ProjectScanResult {
  project: ManagedProject;
  skills: ProjectSkillInstance[];
}

interface ProjectState {
  projects: ManagedProject[];
  selectedProjectId: string | null;
  skillsByProject: Record<string, ProjectSkillInstance[]>;
  isLoading: boolean;
  scanningProjectId: string | null;
  error: string | null;
  loadProjects: () => Promise<void>;
  selectProject: (projectId: string | null) => Promise<void>;
  chooseAndAddProject: () => Promise<ManagedProject | null>;
  addProject: (path: string, displayName?: string) => Promise<ManagedProject>;
  updateProject: (
    projectId: string,
    payload: { display_name?: string; is_active?: boolean }
  ) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
  scanProject: (projectId: string) => Promise<ProjectSkillInstance[]>;
  previewInstall: (
    projectId: string,
    requests: ProjectInstallRequest[]
  ) => Promise<ProjectInstallPreviewItem[]>;
  installSkills: (
    projectId: string,
    requests: ProjectInstallRequest[],
    method?: "auto" | "symlink" | "copy"
  ) => Promise<ProjectBatchInstallResult>;
  installCollection: (
    projectId: string,
    collectionId: string,
    method?: "auto" | "symlink" | "copy"
  ) => Promise<ProjectBatchInstallResult>;
  uninstallSkill: (projectId: string, centralSkillId: string) => Promise<void>;
  syncCopy: (projectId: string, centralSkillId: string) => Promise<void>;
  importExternalSkill: (source: string) => Promise<CentralImportResult>;
}

const EMPTY_BATCH: ProjectBatchInstallResult = {
  succeeded: [],
  skipped: [],
  conflicted: [],
  failed: [],
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  skillsByProject: {},
  isLoading: false,
  scanningProjectId: null,
  error: null,

  loadProjects: async () => {
    if (!isTauriRuntime()) return;
    set({ isLoading: true, error: null });
    try {
      const projects = await invoke<ManagedProject[]>("list_projects");
      const selectedProjectId =
        get().selectedProjectId &&
        projects.some((project) => project.id === get().selectedProjectId)
          ? get().selectedProjectId
          : projects[0]?.id ?? null;
      set({ projects, selectedProjectId, isLoading: false });
      if (selectedProjectId) await get().selectProject(selectedProjectId);
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  selectProject: async (projectId) => {
    set({ selectedProjectId: projectId });
    if (!projectId || !isTauriRuntime() || get().skillsByProject[projectId]) return;
    try {
      const skills = await invoke<ProjectSkillInstance[]>("list_project_skills", {
        projectId,
      });
      set((state) => ({
        skillsByProject: { ...state.skillsByProject, [projectId]: skills },
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  chooseAndAddProject: async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return null;
    return get().addProject(selected);
  },

  addProject: async (path, displayName) => {
    const result = await invoke<ProjectScanResult>("add_project", {
      path,
      displayName,
    });
    set((state) => ({
      projects: [
        ...state.projects.filter((project) => project.id !== result.project.id),
        result.project,
      ],
      selectedProjectId: result.project.id,
      skillsByProject: {
        ...state.skillsByProject,
        [result.project.id]: result.skills,
      },
    }));
    return result.project;
  },

  updateProject: async (projectId, payload) => {
    const project = await invoke<ManagedProject>("update_project", {
      projectId,
      payload,
    });
    set((state) => ({
      projects: state.projects.map((item) =>
        item.id === projectId ? { ...item, ...project } : item
      ),
    }));
  },

  removeProject: async (projectId) => {
    await invoke<void>("remove_project", { projectId });
    set((state) => {
      const projects = state.projects.filter((project) => project.id !== projectId);
      const skillsByProject = { ...state.skillsByProject };
      delete skillsByProject[projectId];
      return {
        projects,
        skillsByProject,
        selectedProjectId:
          state.selectedProjectId === projectId
            ? projects[0]?.id ?? null
            : state.selectedProjectId,
      };
    });
  },

  scanProject: async (projectId) => {
    set({ scanningProjectId: projectId, error: null });
    try {
      const result = await invoke<ProjectScanResult>("scan_project", { projectId });
      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === projectId ? result.project : project
        ),
        skillsByProject: {
          ...state.skillsByProject,
          [projectId]: result.skills,
        },
        scanningProjectId: null,
      }));
      return result.skills;
    } catch (error) {
      set({ error: String(error), scanningProjectId: null });
      throw error;
    }
  },

  previewInstall: async (projectId, requests) =>
    invoke<ProjectInstallPreviewItem[]>("preview_project_install", {
      projectId,
      requests,
    }),

  installSkills: async (projectId, requests, method = "auto") => {
    if (!isTauriRuntime()) return EMPTY_BATCH;
    const result = await invoke<ProjectBatchInstallResult>(
      "batch_install_skills_to_project",
      { projectId, requests, method }
    );
    await get().scanProject(projectId);
    return result;
  },

  installCollection: async (projectId, collectionId, method = "auto") => {
    const result = await invoke<ProjectBatchInstallResult>(
      "install_collection_to_project",
      { projectId, collectionId, method }
    );
    await get().scanProject(projectId);
    return result;
  },

  uninstallSkill: async (projectId, centralSkillId) => {
    await invoke<void>("uninstall_project_skill", { projectId, centralSkillId });
    await get().scanProject(projectId);
  },

  syncCopy: async (projectId, centralSkillId) => {
    await invoke("sync_project_skill_copy", { projectId, centralSkillId });
    await get().scanProject(projectId);
  },

  importExternalSkill: async (source) =>
    invoke<CentralImportResult>("import_external_skill_to_central", { source }),
}));
