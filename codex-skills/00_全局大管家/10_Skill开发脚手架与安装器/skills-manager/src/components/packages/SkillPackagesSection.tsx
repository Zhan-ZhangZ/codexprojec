import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  GitBranch,
  Layers3,
  Loader2,
  Package,
  Puzzle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePackageStore } from "@/stores/packageStore";
import { useProjectStore } from "@/stores/projectStore";
import type {
  ManagedProject,
  SkillPackageDetail,
  SkillPackageSummary,
} from "@/types";

const EMPTY_PACKAGES: SkillPackageSummary[] = [];
const EMPTY_PROJECTS: ManagedProject[] = [];
const noopLoad = async () => {};
const unavailablePackageDetail = async () => {
  throw new Error("技能包详情服务不可用");
};
const unavailablePackageInstall = async () => {
  throw new Error("技能包安装服务不可用");
};
const noopChooseProject = async () => null;

export function SkillPackagesSection() {
  const packages = usePackageStore((state) => state.packages) ?? EMPTY_PACKAGES;
  const isLoading = usePackageStore((state) => state.isLoading) ?? false;
  const loadPackages = usePackageStore((state) => state.loadPackages) ?? noopLoad;
  const loadPackageDetail =
    usePackageStore((state) => state.loadPackageDetail) ?? unavailablePackageDetail;
  const installToProject =
    usePackageStore((state) => state.installToProject) ?? unavailablePackageInstall;
  const projects = useProjectStore((state) => state.projects) ?? EMPTY_PROJECTS;
  const loadProjects = useProjectStore((state) => state.loadProjects) ?? noopLoad;
  const chooseAndAddProject =
    useProjectStore((state) => state.chooseAndAddProject) ?? noopChooseProject;

  const [detail, setDetail] = useState<SkillPackageDetail | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [projectId, setProjectId] = useState("");
  const [installMode, setInstallMode] = useState<"generic" | "native">("generic");
  const [isOpening, setIsOpening] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    void loadPackages();
    void loadProjects();
  }, [loadPackages, loadProjects]);

  useEffect(() => {
    if (!projectId && projects.length > 0) {
      setProjectId(projects.find((project) => project.is_active)?.id ?? "");
    }
  }, [projectId, projects]);

  const requiredIds = useMemo(
    () => new Set(detail?.skills.filter((skill) => skill.is_required).map((skill) => skill.skill_id)),
    [detail]
  );

  if (!isLoading && packages.length === 0) return null;

  async function openPackage(packageId: string) {
    setIsOpening(packageId);
    try {
      const next = await loadPackageDetail(packageId);
      setDetail(next);
      setSelectedSkillIds(
        new Set(
          next.skills
            .filter((skill) => skill.default_enabled || skill.is_required)
            .map((skill) => skill.skill_id)
        )
      );
      setInstallMode("generic");
    } catch (error) {
      toast.error(`读取技能包失败：${String(error)}`);
    } finally {
      setIsOpening(null);
    }
  }

  async function installPackage(method: "auto" | "copy" = "auto") {
    if (!detail || !projectId || selectedSkillIds.size === 0) return;
    setIsInstalling(true);
    try {
      const result = await installToProject(
        detail.package.id,
        projectId,
        Array.from(selectedSkillIds),
        installMode,
        installMode === "native",
        method
      );
      const permissionFailures = result.skill_result.failed.filter((item) =>
        item.error?.includes("SYMLINK_CONFIRM_COPY_REQUIRED")
      );
      if (
        method === "auto" &&
        permissionFailures.length > 0 &&
        window.confirm(
          `${permissionFailures.length} 个子技能无法创建软链接。是否明确改用复制安装？`
        )
      ) {
        await installPackage("copy");
        return;
      }
      toast.success(
        `技能包安装完成：${result.skill_result.succeeded.length} 成功，${result.skill_result.failed.length} 失败`
      );
      if (result.skill_result.failed.length === 0) setDetail(null);
    } catch (error) {
      toast.error(`技能包安装失败：${String(error)}`);
    } finally {
      setIsInstalling(false);
    }
  }

  return (
    <>
      <section className="border-b border-border px-6 py-4">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">技能包</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              完整保留多技能仓库、公共脚本和平台清单；更新以整个包为边界。
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{packages.length} 个包</span>
        </div>
        {isLoading ? (
          <div className="flex items-center py-3 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            正在读取技能包
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {packages.map((skillPackage) => (
              <button
                type="button"
                key={skillPackage.id}
                className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50"
                onClick={() => void openPackage(skillPackage.id)}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Package className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{skillPackage.name}</span>
                    {skillPackage.has_hooks && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-600 dark:text-amber-300">
                        包含 Hooks
                      </span>
                    )}
                    {skillPackage.update_status === "update_available" && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                        可更新
                      </span>
                    )}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Layers3 className="size-3" />
                      {skillPackage.child_skill_count} 个子技能
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1 truncate">
                      <GitBranch className="size-3" />
                      {skillPackage.repository_url}
                    </span>
                  </span>
                </span>
                {isOpening === skillPackage.id ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.package.name}</DialogTitle>
            <DialogDescription>
              这是一个完整技能包。默认安装全部推荐子技能，也可以取消非必选项。
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{detail.package.repository_url}</span>
                <span>·</span>
                <span>{detail.package.content_hash.slice(0, 12)}</span>
                <span>·</span>
                <span>{detail.skills.length} 个子技能</span>
              </div>

              {detail.package.has_hooks && (
                <div className="flex gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    此包包含 Hooks 或平台插件。通用安装不会执行它们；平台原生安装必须经过单独确认，
                    且只有已验证适配器才会执行。
                  </span>
                </div>
              )}

              <div className="divide-y divide-border rounded-lg border border-border">
                {detail.skills.map((skill) => (
                  <label
                    key={skill.skill_id}
                    className="flex cursor-pointer items-start gap-3 px-3 py-2.5"
                  >
                    <Checkbox
                      checked={selectedSkillIds.has(skill.skill_id)}
                      disabled={skill.is_required}
                      onCheckedChange={() =>
                        setSelectedSkillIds((current) => {
                          const next = new Set(current);
                          if (next.has(skill.skill_id) && !skill.is_required) {
                            next.delete(skill.skill_id);
                          } else {
                            next.add(skill.skill_id);
                          }
                          return next;
                        })
                      }
                      aria-label={`选择 ${skill.name}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {skill.name}
                        {requiredIds.has(skill.skill_id) && (
                          <span className="text-[10px] text-muted-foreground">必选</span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {skill.relative_path}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium">目标项目</span>
                  {projects.length > 0 ? (
                    <select
                      value={projectId}
                      onChange={(event) => setProjectId(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3"
                    >
                      {projects
                        .filter((project) => project.is_active)
                        .map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.display_name}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        const project = await chooseAndAddProject();
                        if (project) setProjectId(project.id);
                      }}
                    >
                      添加项目
                    </Button>
                  )}
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">安装方式</span>
                  <select
                    value={installMode}
                    onChange={(event) =>
                      setInstallMode(event.target.value as "generic" | "native")
                    }
                    className="h-10 w-full rounded-lg border border-border bg-background px-3"
                  >
                    <option value="generic">通用技能安装</option>
                    <option
                      value="native"
                      disabled={!detail.package.has_native_adapters}
                    >
                      平台原生安装
                    </option>
                  </select>
                </label>
              </div>

              {detail.adapters.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Puzzle className="size-4" />
                    平台清单
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detail.adapters.map((adapter) => (
                      <span
                        key={`${adapter.agent_id}:${adapter.adapter_kind}`}
                        className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                      >
                        {adapter.agent_id} · {adapter.is_verified ? "已验证" : "待验证"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>
              取消
            </Button>
            <Button
              disabled={!projectId || selectedSkillIds.size === 0 || isInstalling}
              onClick={() => void installPackage()}
            >
              {isInstalling && <Loader2 className="mr-2 size-4 animate-spin" />}
              安装 {selectedSkillIds.size} 个子技能
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
