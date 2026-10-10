import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Folder,
  FolderPlus,
  GitBranch,
  Library,
  Layers3,
  Loader2,
  PackagePlus,
  RefreshCw,
  Search,
  Trash2,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCentralSkillsStore } from "@/stores/centralSkillsStore";
import { useCollectionStore } from "@/stores/collectionStore";
import { useProjectStore } from "@/stores/projectStore";

type InstallSource = "central" | "collection" | "external";

export function ProjectsView() {
  const projects = useProjectStore((state) => state.projects);
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const skillsByProject = useProjectStore((state) => state.skillsByProject);
  const isLoading = useProjectStore((state) => state.isLoading);
  const scanningProjectId = useProjectStore((state) => state.scanningProjectId);
  const error = useProjectStore((state) => state.error);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const selectProject = useProjectStore((state) => state.selectProject);
  const chooseAndAddProject = useProjectStore((state) => state.chooseAndAddProject);
  const addProject = useProjectStore((state) => state.addProject);
  const updateProject = useProjectStore((state) => state.updateProject);
  const removeProject = useProjectStore((state) => state.removeProject);
  const scanProject = useProjectStore((state) => state.scanProject);
  const uninstallSkill = useProjectStore((state) => state.uninstallSkill);
  const syncCopy = useProjectStore((state) => state.syncCopy);
  const installSkills = useProjectStore((state) => state.installSkills);
  const installCollection = useProjectStore((state) => state.installCollection);
  const importExternalSkill = useProjectStore(
    (state) => state.importExternalSkill
  );
  const centralSkills = useCentralSkillsStore((state) => state.skills);
  const loadCentralSkills = useCentralSkillsStore(
    (state) => state.loadCentralSkills
  );
  const collections = useCollectionStore((state) => state.collections);
  const loadCollections = useCollectionStore((state) => state.loadCollections);

  const [manualPath, setManualPath] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [installOpen, setInstallOpen] = useState(false);
  const [installSource, setInstallSource] =
    useState<InstallSource>("central");
  const [selectedCentralSkillIds, setSelectedCentralSkillIds] = useState<
    Set<string>
  >(new Set());
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [centralQuery, setCentralQuery] = useState("");
  const [isInstalling, setIsInstalling] = useState(false);
  const [externalSource, setExternalSource] = useState("");

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId
  );
  const skills = useMemo(
    () =>
      selectedProjectId ? skillsByProject[selectedProjectId] ?? [] : [],
    [selectedProjectId, skillsByProject]
  );
  const filteredSkills = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return skills;
    return skills.filter((skill) =>
      `${skill.name} ${skill.description ?? ""} ${skill.relative_path}`
        .toLocaleLowerCase()
        .includes(normalized)
    );
  }, [query, skills]);
  const installedSkillIds = useMemo(
    () => new Set(skills.map((skill) => skill.skill_id)),
    [skills]
  );
  const filteredCentralSkills = useMemo(() => {
    const normalized = centralQuery.trim().toLocaleLowerCase();
    if (!normalized) return centralSkills;
    return centralSkills.filter((skill) =>
      `${skill.name} ${skill.description ?? ""}`
        .toLocaleLowerCase()
        .includes(normalized)
    );
  }, [centralQuery, centralSkills]);

  function openInstallDialog(source: InstallSource = "central") {
    setInstallSource(source);
    setInstallOpen(true);
    void Promise.all([loadCentralSkills(), loadCollections()]);
  }

  function toggleCentralSkill(skillId: string) {
    setSelectedCentralSkillIds((current) => {
      const next = new Set(current);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  }

  async function retryProjectInstallAsCopy(
    result: Awaited<ReturnType<typeof installSkills>>,
    retry: () => ReturnType<typeof installSkills>
  ) {
    const needsCopy = result.failed.some((item) =>
      item.error?.includes("SYMLINK_CONFIRM_COPY_REQUIRED")
    );
    if (
      needsCopy &&
      window.confirm(
        "Windows 当前无法创建软链接。是否明确改用受管理副本安装？副本后续可在项目页同步。"
      )
    ) {
      return retry();
    }
    return result;
  }

  function assertInstallCompleted(
    result: Awaited<ReturnType<typeof installSkills>>
  ) {
    if (result.succeeded.length === 0 && result.skipped.length === 0) {
      throw new Error(
        result.failed[0]?.error ??
          result.conflicted[0]?.error ??
          "技能安装未完成"
      );
    }
  }

  async function installFromCentral() {
    if (!selectedProject || selectedCentralSkillIds.size === 0) return;
    setIsInstalling(true);
    const request = Array.from(selectedCentralSkillIds).map((skill_id) => ({
      skill_id,
    }));
    try {
      let result = await installSkills(selectedProject.id, request, "auto");
      result = await retryProjectInstallAsCopy(result, () =>
        installSkills(selectedProject.id, request, "copy")
      );
      assertInstallCompleted(result);
      setSelectedCentralSkillIds(new Set());
      setInstallOpen(false);
      toast.success(
        `安装完成：${result.succeeded.length} 成功，${result.skipped.length} 已去重`
      );
    } catch (installError) {
      toast.error(`中央技能安装失败：${String(installError)}`);
    } finally {
      setIsInstalling(false);
    }
  }

  async function installFromCollection() {
    if (!selectedProject || !selectedCollectionId) return;
    setIsInstalling(true);
    try {
      let result = await installCollection(
        selectedProject.id,
        selectedCollectionId,
        "auto"
      );
      result = await retryProjectInstallAsCopy(result, () =>
        installCollection(selectedProject.id, selectedCollectionId, "copy")
      );
      assertInstallCompleted(result);
      setInstallOpen(false);
      toast.success(
        `集合安装完成：${result.succeeded.length} 成功，${result.skipped.length} 已去重`
      );
    } catch (installError) {
      toast.error(`技能集合安装失败：${String(installError)}`);
    } finally {
      setIsInstalling(false);
    }
  }

  async function addSelectedDirectory() {
    setIsAdding(true);
    try {
      const project = await chooseAndAddProject();
      if (project) toast.success(`已添加项目“${project.display_name}”`);
    } catch (addError) {
      toast.error(`添加项目失败：${String(addError)}`);
    } finally {
      setIsAdding(false);
    }
  }

  async function addManualDirectory(event: FormEvent) {
    event.preventDefault();
    if (!manualPath.trim()) return;
    setIsAdding(true);
    try {
      const project = await addProject(manualPath.trim());
      setManualPath("");
      toast.success(`已添加项目“${project.display_name}”`);
    } catch (addError) {
      toast.error(`添加项目失败：${String(addError)}`);
    } finally {
      setIsAdding(false);
    }
  }

  async function installExternalSkill(event: FormEvent) {
    event.preventDefault();
    if (!selectedProject || !externalSource.trim()) return;
    setIsInstalling(true);
    try {
      const imported = await importExternalSkill(externalSource.trim());
      const request = [{ skill_id: imported.skill_id }];
      let result = await installSkills(selectedProject.id, request, "auto");
      result = await retryProjectInstallAsCopy(result, () =>
        installSkills(selectedProject.id, request, "copy")
      );
      assertInstallCompleted(result);
      setExternalSource("");
      setInstallOpen(false);
      toast.success(
        imported.status === "deduplicated"
          ? "中央技能库已去重，并已安装到项目"
          : "已先导入中央技能库，再安装到项目"
      );
    } catch (installError) {
      toast.error(`外部技能安装失败：${String(installError)}`);
    } finally {
      setIsInstalling(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="border-b border-border px-6 py-5">
        <div className="flex items-start justify-between gap-5">
          <div className="max-w-2xl">
            <h1 className="text-xl font-semibold text-foreground">项目</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              明确管理任意本地目录，并从中央技能库、技能集合或外部来源向项目安装技能。
              项目不需要预先包含 Skills，也不要求是 Git 仓库。
            </p>
          </div>
          <Button onClick={() => void addSelectedDirectory()} disabled={isAdding}>
            {isAdding ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <FolderPlus className="mr-2 size-4" />
            )}
            选择项目目录
          </Button>
        </div>
        <form
          className="mt-4 flex max-w-3xl items-center gap-2"
          onSubmit={addManualDirectory}
        >
          <Input
            value={manualPath}
            onChange={(event) => setManualPath(event.target.value)}
            placeholder="也可以输入项目的绝对路径，例如 D:\develop\my-project"
            aria-label="项目绝对路径"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={isAdding || !manualPath.trim()}
          >
            添加路径
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          设置中的“扫描目录”只用于发现已经存在的技能，不会自动加入这里的项目列表。
        </p>
      </header>

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => void loadProjects()}>
            重试
          </Button>
        </div>
      )}

      {isLoading && projects.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          正在读取项目
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-lg text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Folder className="size-6" />
            </div>
            <h2 className="mt-4 text-base font-semibold">还没有管理任何项目</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              添加一个空项目目录也可以。添加后即可选择中央技能、技能集合或外部链接，
              批量安装到项目的 <code>.agents/skills</code>。
            </p>
            <Button className="mt-5" onClick={() => void addSelectedDirectory()}>
              <FolderPlus className="mr-2 size-4" />
              添加第一个项目
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(240px,300px)_1fr]">
          <aside className="overflow-y-auto border-r border-border p-3">
            <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
              {projects.length} 个项目
            </div>
            <div className="space-y-1">
              {projects.map((project) => (
                <button
                  type="button"
                  key={project.id}
                  onClick={() => void selectProject(project.id)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                    project.id === selectedProjectId
                      ? "bg-primary/10 text-foreground ring-1 ring-primary/25"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Folder className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {project.display_name}
                    </span>
                    <span className="text-xs tabular-nums">{project.skill_count}</span>
                  </span>
                  <span className="mt-1 block truncate pl-6 text-[11px]" title={project.path}>
                    {project.path}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {selectedProject && (
            <main className="min-w-0 overflow-y-auto p-6">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">
                      {selectedProject.display_name}
                    </h2>
                    {selectedProject.last_scan_status === "success" ? (
                      <CheckCircle2 className="size-4 text-green-500" aria-label="目录可访问" />
                    ) : selectedProject.last_scan_status === "error" ? (
                      <AlertTriangle className="size-4 text-destructive" aria-label="目录不可访问" />
                    ) : null}
                  </div>
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {selectedProject.path}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="size-3.5" />
                      {selectedProject.is_git_repository ? "Git 仓库" : "普通目录"}
                    </span>
                    <span>{selectedProject.skill_count} 个已发现技能</span>
                    <span>扫描状态：{selectedProject.last_scan_status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => openInstallDialog("central")}
                  >
                    <PackagePlus className="mr-1.5 size-4" />
                    安装技能
                  </Button>
                  <Switch
                    checked={selectedProject.is_active}
                    onCheckedChange={(is_active) =>
                      void updateProject(selectedProject.id, { is_active })
                    }
                    aria-label="启用项目"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={scanningProjectId === selectedProject.id}
                    onClick={() =>
                      void scanProject(selectedProject.id)
                        .then(() => toast.success("项目扫描完成"))
                        .catch((scanError) =>
                          toast.error(`扫描失败：${String(scanError)}`)
                        )
                    }
                  >
                    {scanningProjectId === selectedProject.id ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 size-4" />
                    )}
                    重新扫描
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          `从项目列表移除“${selectedProject.display_name}”？项目文件和技能不会被删除。`
                        )
                      ) {
                        void removeProject(selectedProject.id);
                      }
                    }}
                  >
                    <Trash2 className="mr-1.5 size-4" />
                    移除
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h3 className="text-sm font-semibold">项目技能</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    原生技能只展示；只有由本应用管理的链接或副本可以卸载。
                  </p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="pl-8"
                    placeholder="筛选项目技能"
                  />
                </div>
              </div>

              {filteredSkills.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-sm font-medium">
                    {skills.length === 0 ? "这个项目还没有技能" : "没有匹配的技能"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {skills.length === 0
                      ? "优先从中央技能库或技能集合安装，也可以从外部导入。"
                      : "请尝试其他关键词。"}
                  </p>
                  {skills.length === 0 && (
                    <Button
                      className="mt-4"
                      size="sm"
                      onClick={() => openInstallDialog("central")}
                    >
                      <PackagePlus className="mr-1.5 size-4" />
                      安装技能
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredSkills.map((skill) => (
                    <div key={skill.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{skill.name}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            {skill.instance_kind === "native"
                              ? "项目原生"
                              : skill.instance_kind === "managed_copy"
                                ? "受管理副本"
                                : "受管理链接"}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {skill.relative_path} · {skill.detected_platform}
                        </p>
                      </div>
                      {skill.instance_kind === "managed_copy" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void syncCopy(selectedProject.id, skill.skill_id)
                              .then(() => toast.success(`已同步“${skill.name}”`))
                              .catch((syncError) =>
                                toast.error(`同步失败：${String(syncError)}`)
                              )
                          }
                        >
                          <RefreshCw className="mr-1.5 size-3.5" />
                          同步
                        </Button>
                      )}
                      {skill.instance_kind.startsWith("managed_") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            void uninstallSkill(selectedProject.id, skill.skill_id)
                              .then(() => toast.success(`已卸载“${skill.name}”`))
                              .catch((uninstallError) =>
                                toast.error(`卸载失败：${String(uninstallError)}`)
                              )
                          }
                        >
                          <Unlink className="mr-1.5 size-3.5" />
                          卸载
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </main>
          )}
        </div>
      )}

      <Dialog open={installOpen} onOpenChange={setInstallOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden sm:max-w-2xl">
          <DialogHeader className="min-w-0 pr-8">
            <DialogTitle>安装技能到项目</DialogTitle>
            <DialogDescription>
              优先复用中央技能库或技能集合；只有库中没有时，才从外部导入。
            </DialogDescription>
          </DialogHeader>

          <div
            className="grid min-w-0 grid-cols-3 gap-2 rounded-lg bg-muted/50 p-1"
            role="tablist"
            aria-label="技能安装来源"
          >
            {(
              [
                ["central", "中央技能库", Library],
                ["collection", "技能集合", Layers3],
                ["external", "外部导入", PackagePlus],
              ] as const
            ).map(([value, label, Icon]) => (
              <Button
                key={value}
                type="button"
                variant={installSource === value ? "secondary" : "ghost"}
                size="sm"
                role="tab"
                aria-selected={installSource === value}
                onClick={() => setInstallSource(value)}
              >
                <Icon className="mr-1.5 size-4" />
                {label}
              </Button>
            ))}
          </div>

          {installSource === "central" && (
            <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
              <Input
                value={centralQuery}
                onChange={(event) => setCentralQuery(event.target.value)}
                placeholder="搜索中央技能库"
                aria-label="搜索中央技能库"
              />
              <div className="min-h-0 min-w-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto rounded-lg border border-border p-2">
                {filteredCentralSkills.length === 0 ? (
                  <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                    中央技能库中没有可选技能
                  </p>
                ) : (
                  filteredCentralSkills.map((skill) => {
                    const installed = installedSkillIds.has(skill.id);
                    return (
                      <label
                        key={skill.id}
                        className={cn(
                          "flex min-w-0 items-start gap-3 overflow-hidden rounded-md px-2 py-2",
                          installed
                            ? "cursor-default opacity-55"
                            : "cursor-pointer hover:bg-muted/60"
                        )}
                      >
                        <Checkbox
                          checked={selectedCentralSkillIds.has(skill.id)}
                          disabled={installed}
                          onCheckedChange={() => toggleCentralSkill(skill.id)}
                          aria-label={`选择 ${skill.name}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <span className="truncate">{skill.name}</span>
                            {installed && (
                              <span className="text-[10px] text-muted-foreground">
                                已安装
                              </span>
                            )}
                          </span>
                          {skill.description && (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {skill.description}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setInstallOpen(false)}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  disabled={
                    selectedCentralSkillIds.size === 0 || isInstalling
                  }
                  onClick={() => void installFromCentral()}
                >
                  {isInstalling && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  安装 {selectedCentralSkillIds.size} 个技能
                </Button>
              </div>
            </div>
          )}

          {installSource === "collection" && (
            <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
              <div className="min-h-0 min-w-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto rounded-lg border border-border p-2">
                {collections.length === 0 ? (
                  <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                    还没有技能集合
                  </p>
                ) : (
                  collections.map((collection) => (
                    <label
                      key={collection.id}
                      className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/60"
                    >
                      <input
                        type="radio"
                        name="project-skill-collection"
                        value={collection.id}
                        checked={selectedCollectionId === collection.id}
                        onChange={() => setSelectedCollectionId(collection.id)}
                        className="mt-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {collection.name}
                        </span>
                        {collection.description && (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {collection.description}
                          </span>
                        )}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setInstallOpen(false)}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  disabled={!selectedCollectionId || isInstalling}
                  onClick={() => void installFromCollection()}
                >
                  {isInstalling && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  安装技能集合
                </Button>
              </div>
            </div>
          )}

          {installSource === "external" && (
            <form
              className="min-h-0 min-w-0 space-y-4 overflow-y-auto"
              onSubmit={installExternalSkill}
            >
              <div>
                <label
                  htmlFor="external-skill-source"
                  className="mb-1.5 block text-sm font-medium"
                >
                  本地技能目录或原始 SKILL.md 链接
                </label>
                <Input
                  id="external-skill-source"
                  value={externalSource}
                  onChange={(event) => setExternalSource(event.target.value)}
                  placeholder="D:\skills\my-skill 或 https://…/SKILL.md"
                />
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  外部技能会先导入中央技能库并按内容去重，再安装到当前项目。
                  完整仓库中的多个技能请先分别确认后导入，不会从技能市场直接安装。
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setInstallOpen(false)}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={!externalSource.trim() || isInstalling}
                >
                  {isInstalling && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  导入并安装
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
