import { create } from "zustand";
import { open } from "@tauri-apps/plugin-dialog";

import { invoke, isTauriRuntime } from "@/lib/tauri";
import {
  SkillCategory,
  SkillTaxonomy,
  SkillUpdateBatchResult,
  SkillUpdateResult,
  SkillUpdateStatus,
} from "@/types";

interface SkillGovernanceState {
  categories: SkillCategory[];
  updateStatuses: Record<string, SkillUpdateStatus>;
  isCheckingUpdates: boolean;
  error: string | null;
  loadCategories: () => Promise<void>;
  classifySkills: (skillIds?: string[], force?: boolean) => Promise<void>;
  setTaxonomy: (
    skillId: string,
    primaryCategory: string,
    tags: string[]
  ) => Promise<SkillTaxonomy>;
  checkUpdates: (skillIds?: string[]) => Promise<SkillUpdateStatus[]>;
  updateSkill: (skillId: string, force?: boolean) => Promise<SkillUpdateResult>;
  batchUpdate: (skillIds: string[]) => Promise<SkillUpdateBatchResult>;
  chooseAndImportLocalSkill: () => Promise<{
    skill_id: string;
    status: string;
  } | null>;
}

const CATEGORY_IDS = [
  "development",
  "ai-data",
  "devops-cloud",
  "testing-quality",
  "security",
  "docs-research",
  "design-creative",
  "automation-productivity",
  "business-ecommerce",
  "other",
];

export const useSkillGovernanceStore = create<SkillGovernanceState>((set, get) => ({
  categories: [],
  updateStatuses: {},
  isCheckingUpdates: false,
  error: null,

  loadCategories: async () => {
    if (!isTauriRuntime()) {
      set({
        categories: CATEGORY_IDS.map((id) => ({
          id,
          label_key: `skillCategories.${id}`,
        })),
      });
      return;
    }
    try {
      set({ categories: await invoke<SkillCategory[]>("list_skill_categories") });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  classifySkills: async (skillIds, force = false) => {
    await invoke("auto_classify_skills", { skillIds, force });
  },

  setTaxonomy: async (skillId, primaryCategory, tags) =>
    invoke<SkillTaxonomy>("set_skill_taxonomy", {
      skillId,
      payload: { primary_category: primaryCategory, tags },
    }),

  checkUpdates: async (skillIds) => {
    if (!isTauriRuntime()) return [];
    set({ isCheckingUpdates: true, error: null });
    try {
      const statuses = await invoke<SkillUpdateStatus[]>("check_skill_updates", {
        skillIds,
      });
      set({
        updateStatuses: Object.fromEntries(
          statuses.map((status) => [status.skill_id, status])
        ),
        isCheckingUpdates: false,
      });
      return statuses;
    } catch (error) {
      set({ error: String(error), isCheckingUpdates: false });
      throw error;
    }
  },

  updateSkill: async (skillId, force = false) => {
    const result = await invoke<SkillUpdateResult>("update_central_skill", {
      skillId,
      force,
    });
    await get().checkUpdates([skillId]);
    return result;
  },

  batchUpdate: async (skillIds) => {
    const result = await invoke<SkillUpdateBatchResult>(
      "batch_update_central_skills",
      { skillIds }
    );
    await get().checkUpdates(skillIds);
    return result;
  },

  chooseAndImportLocalSkill: async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return null;
    return invoke("import_local_skill_to_central", { path: selected });
  },
}));
