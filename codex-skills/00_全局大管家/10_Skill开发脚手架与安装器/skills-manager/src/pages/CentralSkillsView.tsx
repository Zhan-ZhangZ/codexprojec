import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Blocks,
  Download,
  FolderPlus,
  FolderOpen,
  RefreshCw,
  Search,
  Settings,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { useCentralSkillsStore } from "@/stores/centralSkillsStore";
import { usePlatformStore } from "@/stores/platformStore";
import { useSkillStore } from "@/stores/skillStore";
import { UnifiedSkillCard } from "@/components/skill/UnifiedSkillCard";
import { SkillDetailDrawer } from "@/components/skill/SkillDetailDrawer";
import { SkillFolderCard } from "@/components/skill/SkillFolderCard";
import { SkillListModeToggle } from "@/components/skill/SkillListModeToggle";
import { InstallDialog } from "@/components/central/InstallDialog";
import { CentralBundleDrawer } from "@/components/central/CentralBundleDrawer";
import { PlatformInstallDrawer } from "@/components/central/PlatformInstallDrawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AgentWithStatus,
  CentralSkillBundle,
  ManagedProject,
  ScannedSkill,
  SkillUpdateStatus,
  SkillWithLinks,
} from "@/types";
import { GitHubRepoImportWizard } from "@/components/marketplace/GitHubRepoImportWizard";
import { useMarketplaceStore } from "@/stores/marketplaceStore";
import { useSkillListViewMode } from "@/hooks/useSkillListViewMode";
import { formatPathForDisplay } from "@/lib/path";
import { buildSearchText, normalizeSearchQuery } from "@/lib/search";
import { dirnameFromSkillFile, splitSkillsByTopLevel } from "@/lib/skillFolders";
import { isTauriRuntime } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import { useSkillGovernanceStore } from "@/stores/skillGovernanceStore";
import { useProjectStore } from "@/stores/projectStore";
import { SkillPackagesSection } from "@/components/packages/SkillPackagesSection";

const DAILY_UPDATE_CHECK_KEY = "skills-manager:last-update-check";
const DAILY_UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

const BROWSER_FIXTURE_AGENTS: AgentWithStatus[] = [
  {
    id: "claude-code",
    display_name: "Claude Code",
    category: "coding",
    global_skills_dir: "/Users/browser/.claude/skills/",
    is_detected: true,
    is_builtin: true,
    is_enabled: true,
  },
  {
    id: "cursor",
    display_name: "Cursor",
    category: "coding",
    global_skills_dir: "/Users/browser/.cursor/skills/",
    is_detected: true,
    is_builtin: true,
    is_enabled: true,
  },
  {
    id: "central",
    display_name: "Central Skills",
    category: "central",
    global_skills_dir: "/Users/browser/.agents/skills/",
    is_detected: true,
    is_builtin: true,
    is_enabled: true,
  },
];

const BROWSER_FIXTURE_SKILLS: SkillWithLinks[] = [
  {
    id: "fixture-central-skill",
    name: "fixture-central-skill",
    description: "Browser validation fixture for Central and drawer entry flows.",
    file_path: "~/.agents/skills/fixture-central-skill/SKILL.md",
    canonical_path: "~/.agents/skills/fixture-central-skill",
    is_central: true,
    source: "browser-fixture",
    scanned_at: "2026-04-17T00:00:00.000Z",
    created_at: "2026-04-17T00:00:00.000Z",
    updated_at: "2026-04-17T00:00:00.000Z",
    linked_agents: ["claude-code"],
    read_only_agents: [],
  },
];

const EMPTY_SKILLS: SkillWithLinks[] = [];
const EMPTY_BUNDLES: CentralSkillBundle[] = [];
const EMPTY_AGENTS: AgentWithStatus[] = [];
const EMPTY_SKILLS_BY_AGENT: Record<string, ScannedSkill[]> = {};
const EMPTY_PROJECTS: ManagedProject[] = [];
const EMPTY_UPDATE_STATUSES: Record<string, SkillUpdateStatus> = {};
const EMPTY_GITHUB_IMPORT_STATE = {
  isPreviewLoading: false,
  isImporting: false,
  preview: null,
  importResult: null,
  previewedRepoUrl: null,
  error: null,
};
const noopLoadCentralSkills = async () => {};
const noopLoadCentralBundles = async () => {};
const noopRefreshCounts = async () => {};
const noopGetSkillsByAgent = async (_agentId: string) => {};
const noopPreviewGitHubRepoImport = async () => null;
const noopResetGitHubImport = () => {};
const noopLoadGovernance = async () => {};
const noopCheckUpdates = async () => [];
const noopBatchUpdate = async () => ({
  succeeded: [],
  skipped: [],
  conflicted: [],
  failed: [],
});
const noopChooseLocalSkill = async () => null;
const noopTogglePlatformLink = async (_skillId: string, _agentId: string) => {};
const noopDeleteCentralSkill = async (
  _skillId: string,
  _options: { cascadeUninstall: boolean }
) => ({
  skillId: _skillId,
  removedCanonicalPath: "",
  uninstalledAgents: [],
  skippedReadOnlyAgents: [],
});
const noopPreviewDeleteCentralBundle = async (relativePath: string) => ({
  bundle: {
    name: relativePath,
    relativePath,
    path: "",
    isSymlink: false,
    skillCount: 0,
    linkedAgentCount: 0,
    readOnlyAgentCount: 0,
  },
  skills: [],
  affectedAgents: [],
  skippedReadOnlyAgents: [],
});
const noopDeleteCentralBundle = async (relativePath: string) => ({
  relativePath,
  removedBundlePath: "",
  removedKind: "directory",
  removedSkillIds: [],
  uninstalledAgents: [],
  skippedReadOnlyAgents: [],
});
const noopLoadCentralBundleDetail = async (relativePath: string) => ({
  bundle: {
    name: relativePath,
    relativePath,
    path: "",
    isSymlink: false,
    skillCount: 0,
    linkedAgentCount: 0,
    readOnlyAgentCount: 0,
  },
  skills: [],
});
const noopClearCentralBundleDetail = () => {};
const noopClearBundleDeletePreview = () => {};
const noopInstallSkill = async () => ({
  succeeded: [],
  failed: [],
});
const noopImportGitHubRepoSkills = async () => {
  throw new Error("GitHub import is unavailable");
};

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
      <div className="p-4 rounded-full bg-muted/60">
        <Blocks className="size-12 text-muted-foreground opacity-60" />
      </div>
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

// ─── First Visit Empty State ──────────────────────────────────────────────────

function FirstVisitEmptyState() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 py-16 text-center px-8">
      <div className="p-5 rounded-full bg-primary/10 ring-1 ring-primary/20">
        <Blocks className="size-14 text-primary opacity-70" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">{t("empty.welcomeTitle")}</h2>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          {t("empty.welcomeDesc")}
        </p>
      </div>
      <div className="flex flex-col gap-3 items-center">
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-4 py-3 max-w-xs text-left border border-border">
          <FolderOpen className="size-4 shrink-0 text-primary/60" />
          <span>
            {t("empty.createHint")} <code className="font-mono">~/.agents/skills/my-skill/SKILL.md</code>
          </span>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => navigate("/settings")}
          className="gap-2"
        >
          <Settings className="size-4" />
          {t("empty.goToSettings")}
        </Button>
      </div>
    </div>
  );
}

function parseSortableTimestamp(value?: string | null): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getSkillSortTimestamp(
  skill: SkillWithLinks,
  field: "createdAt" | "updatedAt"
): number {
  return parseSortableTimestamp(
    field === "createdAt"
      ? skill.created_at ?? skill.scanned_at
      : skill.updated_at ?? skill.scanned_at
  );
}

// ─── CentralSkillsView ────────────────────────────────────────────────────────

export function CentralSkillsView() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSkills = useCentralSkillsStore((state) => state.skills);
  const rawBundles = useCentralSkillsStore((state) => state.bundles);
  const rawAgents = useCentralSkillsStore((state) => state.agents);
  const rawIsLoading = useCentralSkillsStore((state) => state.isLoading);
  const rawLoadCentralSkills = useCentralSkillsStore(
    (state) => state.loadCentralSkills
  );
  const shouldUseBrowserFixtures =
    !isTauriRuntime() &&
    rawSkills === undefined &&
    rawAgents === undefined &&
    rawLoadCentralSkills === undefined;
  const skills = shouldUseBrowserFixtures
    ? BROWSER_FIXTURE_SKILLS
    : (rawSkills ?? EMPTY_SKILLS);
  const bundles = rawBundles ?? EMPTY_BUNDLES;
  const agents = shouldUseBrowserFixtures
    ? BROWSER_FIXTURE_AGENTS
    : (rawAgents ?? EMPTY_AGENTS);
  const centralSkillsRoot =
    agents.find((agent) => agent.id === "central")?.global_skills_dir ?? t("central.path");
  const centralSkillsDir = formatPathForDisplay(centralSkillsRoot);
  const isLoading = shouldUseBrowserFixtures ? false : rawIsLoading ?? false;
  const loadCentralSkills = rawLoadCentralSkills ?? noopLoadCentralSkills;
  const loadCentralBundles =
    useCentralSkillsStore((state) => state.loadCentralBundles) ??
    noopLoadCentralBundles;
  const installSkill =
    useCentralSkillsStore((state) => state.installSkill) ?? noopInstallSkill;
  const togglePlatformLink =
    useCentralSkillsStore((state) => state.togglePlatformLink) ??
    noopTogglePlatformLink;
  const deleteCentralSkill =
    useCentralSkillsStore((state) => state.deleteCentralSkill) ??
    noopDeleteCentralSkill;
  const previewDeleteCentralBundle =
    useCentralSkillsStore((state) => state.previewDeleteCentralBundle) ??
    noopPreviewDeleteCentralBundle;
  const deleteCentralBundle =
    useCentralSkillsStore((state) => state.deleteCentralBundle) ??
    noopDeleteCentralBundle;
  const loadCentralBundleDetail =
    useCentralSkillsStore((state) => state.loadCentralBundleDetail) ??
    noopLoadCentralBundleDetail;
  const clearCentralBundleDetail =
    useCentralSkillsStore((state) => state.clearCentralBundleDetail) ??
    noopClearCentralBundleDetail;
  const bundleDetail = useCentralSkillsStore((state) => state.bundleDetail);
  const loadingBundleDetailPath = useCentralSkillsStore(
    (state) => state.loadingBundleDetailPath
  );
  const clearBundleDeletePreview =
    useCentralSkillsStore((state) => state.clearBundleDeletePreview) ??
    noopClearBundleDeletePreview;
  const bundleDeletePreview = useCentralSkillsStore(
    (state) => state.bundleDeletePreview
  );
  const togglingAgentId = useCentralSkillsStore((state) => state.togglingAgentId);
  const deletingSkillId = useCentralSkillsStore((state) => state.deletingSkillId);
  const deletingBundlePath = useCentralSkillsStore((state) => state.deletingBundlePath);

  // Keep the platform sidebar counts in sync after install.
  const refreshCounts =
    usePlatformStore((state) => state.refreshCounts) ?? noopRefreshCounts;
  const platformAgents = usePlatformStore((state) => state.agents) ?? EMPTY_AGENTS;
  const skillsByAgent =
    useSkillStore((state) => state.skillsByAgent) ?? EMPTY_SKILLS_BY_AGENT;
  const getSkillsByAgent =
    useSkillStore((state) => state.getSkillsByAgent) ?? noopGetSkillsByAgent;
  const githubImport =
    useMarketplaceStore((state) => state.githubImport) ?? EMPTY_GITHUB_IMPORT_STATE;
  const previewGitHubRepoImport =
    useMarketplaceStore((state) => state.previewGitHubRepoImport) ??
    noopPreviewGitHubRepoImport;
  const importGitHubRepoSkills =
    useMarketplaceStore((state) => state.importGitHubRepoSkills) ??
    noopImportGitHubRepoSkills;
  const resetGitHubImport =
    useMarketplaceStore((state) => state.resetGitHubImport) ?? noopResetGitHubImport;

  type SortField = "name" | "createdAt" | "updatedAt" | "projectUsage";
  type SortDirection = "asc" | "desc";
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [viewMode, setViewMode] = useSkillListViewMode("central");
  const [searchQuery, setSearchQuery] = useState("");
  const [installTargetSkill, setInstallTargetSkill] =
    useState<SkillWithLinks | null>(null);
  const [deleteTargetSkill, setDeleteTargetSkill] =
    useState<SkillWithLinks | null>(null);
  const [deleteTargetBundle, setDeleteTargetBundle] =
    useState<CentralSkillBundle | null>(null);
  const [isBundleDrawerOpen, setIsBundleDrawerOpen] = useState(false);
  const [bundleDrawerPath, setBundleDrawerPath] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [drawerSkillId, setDrawerSkillId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [platformDrawerSkillId, setPlatformDrawerSkillId] = useState<string | null>(null);
  const [isPlatformDrawerOpen, setIsPlatformDrawerOpen] = useState(false);
  const [isGitHubImportOpen, setIsGitHubImportOpen] = useState(false);
  const [githubRepoUrl, setGitHubRepoUrl] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [updateFilter, setUpdateFilter] = useState(
    searchParams.get("updates") === "available" ? "update_available" : "all"
  );
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get("category") ?? "all"
  );
  const [isProjectInstallOpen, setIsProjectInstallOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedCategoryForBatch, setSelectedCategoryForBatch] =
    useState("other");
  const categories =
    useSkillGovernanceStore((state) => state.categories) ?? [];
  const updateStatuses =
    useSkillGovernanceStore((state) => state.updateStatuses) ??
    EMPTY_UPDATE_STATUSES;
  const isCheckingUpdates = useSkillGovernanceStore(
    (state) => state.isCheckingUpdates
  );
  const loadCategories =
    useSkillGovernanceStore((state) => state.loadCategories) ?? noopLoadGovernance;
  const checkUpdates =
    useSkillGovernanceStore((state) => state.checkUpdates) ?? noopCheckUpdates;
  const setTaxonomy =
    useSkillGovernanceStore((state) => state.setTaxonomy) ??
    (async () => undefined);
  const batchUpdate =
    useSkillGovernanceStore((state) => state.batchUpdate) ?? noopBatchUpdate;
  const chooseAndImportLocalSkill =
    useSkillGovernanceStore((state) => state.chooseAndImportLocalSkill) ??
    noopChooseLocalSkill;
  const projects = useProjectStore((state) => state.projects) ?? EMPTY_PROJECTS;
  const loadProjects =
    useProjectStore((state) => state.loadProjects) ?? noopLoadGovernance;
  const chooseAndAddProject =
    useProjectStore((state) => state.chooseAndAddProject) ??
    (async () => null);
  const installSkillsToProject =
    useProjectStore((state) => state.installSkills) ?? noopBatchUpdate;
  const contentRef = useRef<HTMLDivElement | null>(null);
  const detailButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const effectiveSearchQuery =
    skills.length > 80 ? deferredSearchQuery : searchQuery;
  const normalizedSearchQuery = useMemo(
    () => normalizeSearchQuery(effectiveSearchQuery),
    [effectiveSearchQuery]
  );
  const centralFolderSplit = useMemo(
    () =>
      splitSkillsByTopLevel({
        skills,
        rootPath: centralSkillsRoot,
        getDirPaths: (skill) => [
          skill.canonical_path,
          dirnameFromSkillFile(skill.file_path),
        ],
        getLinkedAgentIds: (skill) => skill.linked_agents,
        getReadOnlyAgentIds: (skill) => skill.read_only_agents ?? [],
      }),
    [centralSkillsRoot, skills]
  );
  const centralFolderGroupsByPath = useMemo(
    () =>
      new Map(
        centralFolderSplit.groups.map((group) => [
          group.relativePath,
          group,
        ])
      ),
    [centralFolderSplit.groups]
  );
  const visibleSkills = viewMode === "folders" ? centralFolderSplit.rootSkills : skills;
  const searchableSkills = useMemo(
    () =>
      visibleSkills.map((skill) => ({
        skill,
        searchText: buildSearchText([skill.name, skill.description]),
      })),
    [visibleSkills]
  );
  const isSearchActive = normalizedSearchQuery.length > 0;

  // Load central skills on mount.
  useEffect(() => {
    loadCentralSkills();
  }, [loadCentralSkills]);

  useEffect(() => {
    loadCentralBundles();
  }, [loadCentralBundles]);

  useEffect(() => {
    void Promise.all([loadCategories(), loadProjects()]);
  }, [loadCategories, loadProjects]);

  useEffect(() => {
    if (import.meta.env.MODE === "test" || !isTauriRuntime()) return;
    const lastCheckedAt = Number(localStorage.getItem(DAILY_UPDATE_CHECK_KEY) ?? 0);
    if (
      Number.isFinite(lastCheckedAt) &&
      Date.now() - lastCheckedAt < DAILY_UPDATE_CHECK_INTERVAL_MS
    ) {
      return;
    }

    // Reserve the check immediately so React StrictMode or a quick remount cannot
    // dispatch the same network request twice.
    localStorage.setItem(DAILY_UPDATE_CHECK_KEY, String(Date.now()));
    void checkUpdates()
      .then(() => loadCentralSkills())
      .catch(() => {
        // Permit a retry on the next launch when the automatic check failed.
        localStorage.removeItem(DAILY_UPDATE_CHECK_KEY);
      });
  }, [checkUpdates, loadCentralSkills]);

  useEffect(() => {
    setCategoryFilter(searchParams.get("category") ?? "all");
    setUpdateFilter(
      searchParams.get("updates") === "available" ? "update_available" : "all"
    );
  }, [searchParams]);

  useEffect(() => {
    if (projects.length > 0 && !projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Filter skills by search query.
  const filteredSkills = useMemo(() => {
    return searchableSkills
      .filter(({ skill, searchText }) => {
        if (normalizedSearchQuery && !searchText.includes(normalizedSearchQuery)) {
          return false;
        }
        if (categoryFilter !== "all" && skill.primary_category !== categoryFilter) {
          return false;
        }
        const updateStatus = updateStatuses[skill.id]?.status ?? skill.update_status;
        return updateFilter === "all" || updateStatus === updateFilter;
      })
      .map(({ skill }) => skill);
  }, [
    categoryFilter,
    normalizedSearchQuery,
    searchableSkills,
    updateFilter,
    updateStatuses,
  ]);

  const filteredBundles = useMemo(() => {
    if (viewMode !== "folders") return [];
    if (!normalizedSearchQuery) return bundles;
    return bundles.filter((bundle) => {
      const bundleSearchText = buildSearchText([bundle.name, bundle.relativePath, bundle.path]);
      if (bundleSearchText.includes(normalizedSearchQuery)) return true;
      const group = centralFolderGroupsByPath.get(bundle.relativePath);
      return (
        group?.skills.some((skill) =>
          buildSearchText([skill.name, skill.description]).includes(normalizedSearchQuery)
        ) ?? false
      );
    });
  }, [bundles, centralFolderGroupsByPath, normalizedSearchQuery, viewMode]);

  // Sort filtered skills.
  const sortedSkills = useMemo(() => {
    const list = [...filteredSkills];
    const direction = sortDirection === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      const nameComparison = a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });

      if (sortField === "name") {
        return nameComparison * direction;
      }

      if (sortField === "projectUsage") {
        const usageComparison =
          (a.project_usage_count ?? 0) - (b.project_usage_count ?? 0);
        return usageComparison === 0
          ? nameComparison
          : usageComparison * direction;
      }

      const leftTime = getSkillSortTimestamp(a, sortField);
      const rightTime = getSkillSortTimestamp(b, sortField);
      const timeComparison = leftTime - rightTime;

      return timeComparison === 0 ? nameComparison : timeComparison * direction;
    });
  }, [filteredSkills, sortDirection, sortField]);

  useEffect(() => {
    if (!isSearchActive || !contentRef.current) return;
    contentRef.current.scrollTop = 0;
  }, [isSearchActive, normalizedSearchQuery]);

  function handleInstallClick(skill: SkillWithLinks) {
    setInstallTargetSkill(skill);
    setIsDialogOpen(true);
  }

  function handleProjectInstallClick(skill: SkillWithLinks) {
    setSelectedSkillIds(new Set([skill.id]));
    setIsProjectInstallOpen(true);
  }

  function agentDisplayNames(agentIds: string[]): string[] {
    const namesById = new Map(agents.map((agent) => [agent.id, agent.display_name]));
    return Array.from(new Set(agentIds)).map((agentId) => namesById.get(agentId) ?? agentId);
  }

  function linkedAgentNames(skill: SkillWithLinks): string[] {
    return agentDisplayNames([...skill.linked_agents, ...(skill.read_only_agents ?? [])]);
  }

  const sortFieldOptions: Array<{ value: SortField; label: string }> = [
    { value: "name", label: t("central.sortByName") },
    { value: "createdAt", label: t("central.sortByCreatedAt") },
    { value: "updatedAt", label: t("central.sortByUpdatedAt") },
    { value: "projectUsage", label: "项目使用次数" },
  ];

  const sortDirectionOptions: Array<{ value: SortDirection; label: string }> = [
    { value: "asc", label: t("central.sortAscending") },
    { value: "desc", label: t("central.sortDescending") },
  ];

  function setDetailButtonRef(skillId: string, node: HTMLButtonElement | null) {
    detailButtonRefs.current[skillId] = node;
  }

  function handleOpenDrawer(skillId: string) {
    setDrawerSkillId(skillId);
    setIsDrawerOpen(true);
  }

  function handleOpenPlatformDrawer(skillId: string) {
    setPlatformDrawerSkillId(skillId);
    setIsPlatformDrawerOpen(true);
  }

  async function handleTogglePlatform(skillId: string, agentId: string) {
    try {
      await togglePlatformLink(skillId, agentId);
      await refreshCounts();
    } catch (err) {
      toast.error(t("central.installError", { error: String(err) }));
    }
  }

  async function handleInstall(skillId: string, agentIds: string[], method: string) {
    try {
      const result = await installSkill(skillId, agentIds, method);
      // Refresh sidebar counts after install.
      await refreshCounts();
      if (result.failed.length > 0) {
        const failedNames = result.failed.map((f) => f.agent_id).join(", ");
        toast.error(t("central.installPartialFail", { platforms: failedNames }));
      }
    } catch (err) {
      toast.error(t("central.installError", { error: String(err) }));
    }
  }

  async function handleDeleteCentralSkill(skill: SkillWithLinks, cascadeUninstall: boolean) {
    try {
      await deleteCentralSkill(skill.id, { cascadeUninstall });
      await refreshCounts();
      toast.success(t("central.deleteSuccess", { name: skill.name }));
      setDeleteTargetSkill(null);
    } catch (err) {
      toast.error(t("central.deleteError", { error: String(err) }));
    }
  }

  function handleDeleteClick(skill: SkillWithLinks) {
    if (skill.linked_agents.length > 0 || (skill.read_only_agents?.length ?? 0) > 0) {
      setDeleteTargetSkill(skill);
      return;
    }

    void handleDeleteCentralSkill(skill, false);
  }

  async function handleOpenBundleDrawer(bundle: CentralSkillBundle) {
    setBundleDrawerPath(bundle.relativePath);
    setIsBundleDrawerOpen(true);
    try {
      await loadCentralBundleDetail(bundle.relativePath);
    } catch (err) {
      setIsBundleDrawerOpen(false);
      setBundleDrawerPath(null);
      toast.error(t("central.bundleDetailError", { error: String(err) }));
    }
  }

  async function handleDeleteBundleClick(bundle: CentralSkillBundle) {
    try {
      await previewDeleteCentralBundle(bundle.relativePath);
      setDeleteTargetBundle(bundle);
    } catch (err) {
      toast.error(t("central.deleteBundlePreviewError", { error: String(err) }));
    }
  }

  async function handleDeleteCentralBundle(bundle: CentralSkillBundle) {
    try {
      await deleteCentralBundle(bundle.relativePath, { cascadeUninstall: true });
      await refreshCounts();
      toast.success(t("central.deleteBundleSuccess", { name: bundle.name }));
      setDeleteTargetBundle(null);
      clearBundleDeletePreview();
    } catch (err) {
      toast.error(t("central.deleteBundleError", { error: String(err) }));
    }
  }

  async function handleRefresh() {
    try {
      // Re-scan the filesystem first so new/removed skills are picked up,
      // then reload central skills from the (now-updated) database.
      await refreshCounts();
      await Promise.all([loadCentralSkills(), loadCentralBundles()]);
    } catch (err) {
      toast.error(t("central.refreshError", { error: String(err) }));
    }
  }

  async function handleGitHubPreview() {
    try {
      return await previewGitHubRepoImport(githubRepoUrl);
    } catch {
      return null;
    }
  }

  async function handleGitHubImport(
    selections: Parameters<typeof importGitHubRepoSkills>[1]
  ) {
    try {
      const result = await importGitHubRepoSkills(githubRepoUrl, selections);
      await Promise.all([refreshCounts(), loadCentralSkills()]);
      toast.success(t("marketplace.githubImportCentralSuccess"));
      return result;
    } catch (err) {
      toast.error(t("marketplace.installError", { error: String(err) }));
      throw err;
    }
  }

  async function handleInstallImportedSkill(
    skillId: string,
    agentIds: string[],
    method: "symlink" | "copy"
  ) {
    await handleInstall(skillId, agentIds, method);
    await Promise.all(agentIds.map((agentId) => getSkillsByAgent(agentId)));
  }

  const installableImportedSkills = useMemo(() => {
    if (!githubImport.importResult) return [];
    const importedIds = new Set(
      githubImport.importResult.importedSkills.map((skill) => skill.importedSkillId)
    );
    return skills.filter((skill) => importedIds.has(skill.id));
  }, [githubImport.importResult, skills]);

  const availableInstallAgents = useMemo(
    () => (agents.length > 0 ? agents : platformAgents),
    [agents, platformAgents]
  );
  const platformDrawerSkill = useMemo(
    () => skills.find((skill) => skill.id === platformDrawerSkillId) ?? null,
    [platformDrawerSkillId, skills]
  );

  async function handleAfterImportSuccess() {
    const agentIds = Object.keys(skillsByAgent);
    if (agentIds.length === 0) return;
    await Promise.all(agentIds.map((agentId) => getSkillsByAgent(agentId)));
  }

  function toggleSelectedSkill(skillId: string) {
    setSelectedSkillIds((current) => {
      const next = new Set(current);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  }

  function changeCategoryFilter(value: string) {
    setCategoryFilter(value);
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete("category");
    else next.set("category", value);
    setSearchParams(next, { replace: true });
  }

  function changeUpdateFilter(value: string) {
    setUpdateFilter(value);
    const next = new URLSearchParams(searchParams);
    if (value === "update_available") next.set("updates", "available");
    else next.delete("updates");
    setSearchParams(next, { replace: true });
  }

  async function handleCheckUpdates() {
    try {
      const statuses = await checkUpdates();
      const available = statuses.filter(
        (status) => status.status === "update_available"
      ).length;
      toast.success(`检查完成，发现 ${available} 个可更新技能`);
      await loadCentralSkills();
    } catch (error) {
      toast.error(`更新检查失败：${String(error)}`);
    }
  }

  async function handleLocalImport() {
    try {
      const result = await chooseAndImportLocalSkill();
      if (!result) return;
      toast.success(
        result.status === "deduplicated"
          ? `技能 ${result.skill_id} 已存在，已去重`
          : `已导入 ${result.skill_id} 到中央技能库`
      );
      await Promise.all([loadCentralSkills(), loadCentralBundles(), refreshCounts()]);
    } catch (error) {
      toast.error(`本地技能导入失败：${String(error)}`);
    }
  }

  async function handleBatchUpdate() {
    const ids = Array.from(selectedSkillIds).filter(
      (id) =>
        (updateStatuses[id]?.status ??
          skills.find((skill) => skill.id === id)?.update_status) ===
        "update_available"
    );
    if (ids.length === 0) {
      toast.info("所选技能中没有已确认可更新的项目");
      return;
    }
    try {
      const result = await batchUpdate(ids);
      toast.success(`已更新 ${result.succeeded.length} 个技能`);
      setSelectedSkillIds(new Set());
      await Promise.all([loadCentralSkills(), refreshCounts()]);
    } catch (error) {
      toast.error(`批量更新失败：${String(error)}`);
    }
  }

  async function handleBatchCategoryChange() {
    const selectedSkills = skills.filter((skill) =>
      selectedSkillIds.has(skill.id)
    );
    try {
      await Promise.all(
        selectedSkills.map((skill) =>
          setTaxonomy(
            skill.id,
            selectedCategoryForBatch,
            skill.tags ?? []
          )
        )
      );
      toast.success(`已更新 ${selectedSkills.length} 个技能的分类`);
      await loadCentralSkills();
    } catch (error) {
      toast.error(`更新分类失败：${String(error)}`);
    }
  }

  async function handleInstallSelectedToProject() {
    if (!selectedProjectId || selectedSkillIds.size === 0) return;
    try {
      const result = await installSkillsToProject(
        selectedProjectId,
        Array.from(selectedSkillIds).map((skill_id) => ({ skill_id }))
      );
      const linkPermissionFailures = result.failed.filter((item) =>
        item.error?.includes("SYMLINK_CONFIRM_COPY_REQUIRED")
      );
      if (
        linkPermissionFailures.length > 0 &&
        window.confirm(
          `${linkPermissionFailures.length} 个技能因 Windows 软链接权限不足而未安装。是否明确改用复制安装？复制项在中央技能更新后需要手动同步。`
        )
      ) {
        const copyResult = await installSkillsToProject(
          selectedProjectId,
          linkPermissionFailures.map((item) => ({
            skill_id: item.skill_id,
          })),
          "copy"
        );
        result.succeeded.push(...copyResult.succeeded);
        result.skipped.push(...copyResult.skipped);
        result.conflicted.push(...copyResult.conflicted);
        result.failed.splice(
          0,
          result.failed.length,
          ...result.failed.filter(
            (item) => !item.error?.includes("SYMLINK_CONFIRM_COPY_REQUIRED")
          ),
          ...copyResult.failed
        );
      }
      toast.success(
        `安装完成：${result.succeeded.length} 成功，${result.skipped.length} 跳过，${result.conflicted.length} 冲突，${result.failed.length} 失败`
      );
      setIsProjectInstallOpen(false);
      setSelectedSkillIds(new Set());
    } catch (error) {
      toast.error(`安装到项目失败：${String(error)}`);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{t("central.title")}</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              aria-label={t("central.refresh")}
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {centralSkillsDir}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void handleLocalImport()}>
            <FolderOpen className="mr-1.5 size-4" />
            导入本地技能
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleCheckUpdates()}
            disabled={isCheckingUpdates}
          >
            <RefreshCw
              className={cn("mr-1.5 size-4", isCheckingUpdates && "animate-spin")}
            />
            检查更新
          </Button>
          <Button variant="outline" onClick={() => setIsGitHubImportOpen(true)}>
            {t("marketplace.githubImportSecondaryCta")}
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-6 py-3 border-b border-border">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("central.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-muted/40"
              aria-label={t("central.searchPlaceholder")}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(event) => changeCategoryFilter(event.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              aria-label="技能分类"
            >
              <option value="all">全部分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {t(category.label_key, { defaultValue: category.id })}
                </option>
              ))}
            </select>
            <select
              value={updateFilter}
              onChange={(event) => changeUpdateFilter(event.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              aria-label="更新状态"
            >
              <option value="all">全部更新状态</option>
              <option value="update_available">有更新</option>
              <option value="local_modified">本地已修改</option>
              <option value="check_failed">检查失败</option>
            </select>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpDown className="size-3.5" />
              <span>{t("central.sortLabel")}</span>
            </div>
            <div
              role="group"
              aria-label={t("central.sortFieldLabel")}
              className="flex rounded-xl bg-muted/40 p-1"
            >
              {sortFieldOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={sortField === option.value}
                  onClick={() => setSortField(option.value)}
                  className={cn(
                    "h-7 rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    sortField === option.value
                      ? "bg-background/95 text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div
              role="group"
              aria-label={t("central.sortDirectionLabel")}
              className="flex rounded-xl bg-muted/40 p-1"
            >
              {sortDirectionOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={sortDirection === option.value}
                  onClick={() => setSortDirection(option.value)}
                  className={cn(
                    "h-7 rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    sortDirection === option.value
                      ? "bg-background/95 text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <SkillListModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <EmptyState message={t("central.loading")} />
        ) : skills.length === 0 && bundles.length === 0 ? (
          <FirstVisitEmptyState />
        ) : (
          <div className="space-y-6">
            {viewMode === "folders" && filteredBundles.length > 0 && (
              <section aria-label={t("central.bundlesSectionLabel")} className="space-y-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold">{t("central.bundlesTitle")}</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredBundles.map((bundle) => {
                    const group = centralFolderGroupsByPath.get(bundle.relativePath);
                    return (
                      <SkillFolderCard
                        key={bundle.relativePath}
                        name={bundle.name}
                        path={bundle.path}
                        skillCount={bundle.skillCount}
                        linkedAgentCount={bundle.linkedAgentCount}
                        readOnlyAgentCount={bundle.readOnlyAgentCount}
                        isSymlink={bundle.isSymlink}
                        previewNames={group?.skills.map((skill) => skill.name) ?? []}
                        onOpen={() => void handleOpenBundleDrawer(bundle)}
                        onDelete={() => void handleDeleteBundleClick(bundle)}
                        deleteLabel={t("central.deleteBundleLabel", { name: bundle.name })}
                        isDeleting={deletingBundlePath === bundle.relativePath}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {filteredSkills.length === 0 && filteredBundles.length === 0 ? (
              <EmptyState message={t("central.noMatch", { query: searchQuery })} />
            ) : filteredSkills.length > 0 ? (
              <section className="space-y-3">
                {viewMode === "folders" && (
                  <div className="flex items-center gap-2">
                    <Blocks className="size-4 text-primary" />
                    <h2 className="text-sm font-semibold">{t("skillFolder.topLevelSkills")}</h2>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sortedSkills.map((skill) => (
                    <UnifiedSkillCard
                      key={skill.id}
                      name={skill.name}
                      description={skill.description}
                      checkbox={{
                        checked: selectedSkillIds.has(skill.id),
                        onChange: () => toggleSelectedSkill(skill.id),
                      }}
                      tags={[
                        ...(skill.primary_category
                          ? [
                              {
                                key: skill.primary_category,
                                label: t(`skillCategories.${skill.primary_category}`, {
                                  defaultValue: skill.primary_category,
                                }),
                              },
                            ]
                          : []),
                        ...((skill.project_usage_count ?? 0) > 0
                          ? [
                              {
                                key: "project-usage",
                                label: `${skill.project_usage_count} 个项目使用`,
                              },
                            ]
                          : []),
                        ...(skill.tags ?? []).slice(0, 2).map((tag) => ({
                          key: tag,
                          label: tag,
                        })),
                        ...((updateStatuses[skill.id]?.status ??
                          skill.update_status) === "update_available"
                          ? [{ key: "update", label: "可更新" }]
                          : []),
                      ]}
                      onDetail={() => handleOpenDrawer(skill.id)}
                      onInstallTo={() => handleProjectInstallClick(skill)}
                      installToLabel={`将 ${skill.name} 安装到项目`}
                      onDeleteFromCentral={() => handleDeleteClick(skill)}
                      deleteFromCentralLabel={t("central.deleteFromCentralLabel", { name: skill.name })}
                      deleteFromCentralRequiresDialog={
                        skill.linked_agents.length > 0 || (skill.read_only_agents?.length ?? 0) > 0
                      }
                      isLoading={deletingSkillId === skill.id}
                      detailButtonRef={(node) => setDetailButtonRef(skill.id, node)}
                      platformIcons={{
                        agents,
                        linkedAgents: skill.linked_agents,
                        readOnlyAgents: skill.read_only_agents ?? [],
                        skillId: skill.id,
                        onToggle: handleTogglePlatform,
                        onManage: () => handleOpenPlatformDrawer(skill.id),
                        togglingAgentId,
                      }}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>

      <SkillPackagesSection />

      {selectedSkillIds.size > 0 && (
        <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-6 py-3">
          <span className="text-sm text-muted-foreground">
            已选择 {selectedSkillIds.size} 个技能
          </span>
          <div className="ml-auto flex gap-2">
            <select
              value={selectedCategoryForBatch}
              onChange={(event) =>
                setSelectedCategoryForBatch(event.target.value)
              }
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              aria-label="批量设置技能分类"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {t(category.label_key)}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleBatchCategoryChange()}
            >
              设置分类
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleBatchUpdate()}>
              <Download className="mr-1.5 size-3.5" />
              更新可更新项
            </Button>
            <Button
              size="sm"
              onClick={() => setIsProjectInstallOpen(true)}
            >
              安装到项目
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSkillIds(new Set())}
            >
              取消选择
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isProjectInstallOpen} onOpenChange={setIsProjectInstallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSkillIds.size > 1 ? "批量安装到项目" : "安装到项目"}
            </DialogTitle>
            <DialogDescription>
              默认采用去重安装：同内容跳过，未托管的同名目录报告冲突且不会覆盖。
            </DialogDescription>
          </DialogHeader>
          {projects.some((project) => project.is_active) ? (
            <label className="space-y-1 text-sm">
              <span className="font-medium">目标项目</span>
              <select
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3"
              >
                {projects
                  .filter((project) => project.is_active)
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.display_name} · {project.skill_count} 个技能
                    </option>
                  ))}
              </select>
            </label>
          ) : (
            <div className="rounded-lg bg-muted/60 p-4 text-sm">
              <p className="font-medium">还没有可用项目</p>
              <p className="mt-1 text-muted-foreground">
                任意本地目录都可以添加为项目，不需要预先安装 Skills。
              </p>
              <Button
                className="mt-3"
                variant="outline"
                onClick={async () => {
                  try {
                    const project = await chooseAndAddProject();
                    if (project) {
                      setSelectedProjectId(project.id);
                      toast.success(`已添加项目“${project.display_name}”`);
                    }
                  } catch (error) {
                    toast.error(`添加项目失败：${String(error)}`);
                  }
                }}
              >
                <FolderPlus className="mr-2 size-4" />
                添加项目目录
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProjectInstallOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => void handleInstallSelectedToProject()}
              disabled={!selectedProjectId}
            >
              安装 {selectedSkillIds.size} 个技能
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Install Dialog */}
      <InstallDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        skill={installTargetSkill}
        agents={agents}
        onInstall={handleInstall}
      />

      <SkillDetailDrawer
        open={isDrawerOpen}
        skillId={drawerSkillId}
        onOpenChange={(open) => {
          setIsDrawerOpen(open);
          if (!open) {
            setDrawerSkillId(null);
          }
        }}
        returnFocusRef={
          drawerSkillId
            ? {
                current: detailButtonRefs.current[drawerSkillId] ?? null,
              }
            : undefined
        }
      />

      <CentralBundleDrawer
        open={isBundleDrawerOpen}
        detail={bundleDetail ?? null}
        agents={agents}
        loadingPath={loadingBundleDetailPath ?? bundleDrawerPath}
        onOpenChange={(open) => {
          setIsBundleDrawerOpen(open);
          if (!open) {
            setBundleDrawerPath(null);
            clearCentralBundleDetail();
          }
        }}
        onInstallationsChange={async () => {
          await Promise.all([
            loadCentralSkills(),
            loadCentralBundles(),
            bundleDrawerPath
              ? loadCentralBundleDetail(bundleDrawerPath)
              : Promise.resolve(null),
          ]);
        }}
      />

      <PlatformInstallDrawer
        open={isPlatformDrawerOpen}
        skill={platformDrawerSkill}
        agents={agents}
        togglingAgentId={togglingAgentId}
        onOpenChange={(open) => {
          setIsPlatformDrawerOpen(open);
          if (!open) {
            setPlatformDrawerSkillId(null);
          }
        }}
        onToggle={handleTogglePlatform}
        onOpenInstallDialog={() => {
          if (platformDrawerSkill) {
            handleInstallClick(platformDrawerSkill);
            setIsPlatformDrawerOpen(false);
            setPlatformDrawerSkillId(null);
          }
        }}
      />

      <GitHubRepoImportWizard
        open={isGitHubImportOpen}
        onOpenChange={setIsGitHubImportOpen}
        repoUrl={githubRepoUrl}
        onRepoUrlChange={setGitHubRepoUrl}
        preview={githubImport.preview}
        previewError={githubImport.error}
        isPreviewLoading={githubImport.isPreviewLoading}
        isImporting={githubImport.isImporting}
        importResult={githubImport.importResult}
        onPreview={handleGitHubPreview}
        onImport={handleGitHubImport}
        availableAgents={availableInstallAgents}
        installableSkills={installableImportedSkills}
        onInstallImportedSkill={handleInstallImportedSkill}
        onAfterImportSuccess={handleAfterImportSuccess}
        onReset={() => {
          resetGitHubImport();
          setGitHubRepoUrl("");
        }}
        launcherLabel={t("central.title")}
      />

      <Dialog
        open={!!deleteTargetSkill}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetSkill(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("central.deleteConfirmTitle", { name: deleteTargetSkill?.name ?? "" })}
            </DialogTitle>
            <DialogDescription>
              {deleteTargetSkill
                ? t("central.deleteLinkedWarning", {
                    platforms: linkedAgentNames(deleteTargetSkill).join(", "),
                  })
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTargetSkill(null)}
              disabled={!!deleteTargetSkill && deletingSkillId === deleteTargetSkill.id}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTargetSkill) {
                  void handleDeleteCentralSkill(deleteTargetSkill, true);
                }
              }}
              disabled={!!deleteTargetSkill && deletingSkillId === deleteTargetSkill.id}
            >
              {t("central.deleteCascadeLabel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTargetBundle}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetBundle(null);
            clearBundleDeletePreview();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("central.deleteBundleConfirmTitle", {
                name: deleteTargetBundle?.name ?? "",
              })}
            </DialogTitle>
            <DialogDescription>
              {bundleDeletePreview?.bundle.isSymlink
                ? t("central.deleteBundleSymlinkWarning", {
                    path: formatPathForDisplay(
                      bundleDeletePreview.bundle.path || deleteTargetBundle?.path || ""
                    ),
                  })
                : t("central.deleteBundleDirectoryWarning", {
                    path: formatPathForDisplay(
                      bundleDeletePreview?.bundle.path || deleteTargetBundle?.path || ""
                    ),
                  })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-center gap-2 font-medium text-destructive">
                <AlertTriangle className="size-4" />
                {t("central.deleteBundleDangerTitle")}
              </div>
              <p className="mt-1 text-muted-foreground">
                {t("central.deleteBundleDangerDescription", {
                  count:
                    bundleDeletePreview?.bundle.skillCount ??
                    deleteTargetBundle?.skillCount ??
                    0,
                })}
              </p>
            </div>

            {bundleDeletePreview && (
              <div className="space-y-2">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {t("central.deleteBundleSkillsLabel")}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {bundleDeletePreview.skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs"
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>

                {bundleDeletePreview.affectedAgents.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">
                      {t("central.deleteBundleAgentsLabel")}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {agentDisplayNames(bundleDeletePreview.affectedAgents).join(", ")}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTargetBundle(null);
                clearBundleDeletePreview();
              }}
              disabled={
                !!deleteTargetBundle &&
                deletingBundlePath === deleteTargetBundle.relativePath
              }
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTargetBundle) {
                  void handleDeleteCentralBundle(deleteTargetBundle);
                }
              }}
              disabled={
                !bundleDeletePreview ||
                (!!deleteTargetBundle &&
                  deletingBundlePath === deleteTargetBundle.relativePath)
              }
            >
              {t("central.deleteBundleCascadeLabel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
