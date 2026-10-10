import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { ProjectsView } from "@/pages/ProjectsView";
import { useCentralSkillsStore } from "@/stores/centralSkillsStore";
import { useCollectionStore } from "@/stores/collectionStore";
import { useProjectStore } from "@/stores/projectStore";
import type { ManagedProject, ProjectSkillInstance } from "@/types";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const project: ManagedProject = {
  id: "project-1",
  path: "D:\\develop\\empty-project",
  normalized_path: "d:/develop/empty-project",
  display_name: "empty-project",
  is_active: true,
  added_at: "2026-07-26T00:00:00Z",
  updated_at: "2026-07-26T00:00:00Z",
  last_scan_status: "success",
  is_git_repository: false,
  access_status: "available",
  detected_platforms: "[]",
  skill_count: 0,
};

const managedCopy: ProjectSkillInstance = {
  id: "instance-1",
  project_id: project.id,
  skill_id: "demo",
  name: "Demo",
  description: "演示技能",
  dir_path: "D:\\develop\\empty-project\\.agents\\skills\\demo",
  file_path: "D:\\develop\\empty-project\\.agents\\skills\\demo\\SKILL.md",
  relative_path: ".agents/skills/demo",
  detected_platform: "agents",
  content_hash: "hash",
  instance_kind: "managed_copy",
  scanned_at: "2026-07-26T00:00:00Z",
};

function renderView() {
  return render(
    <MemoryRouter>
      <ProjectsView />
    </MemoryRouter>
  );
}

describe("ProjectsView", () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      selectedProjectId: null,
      skillsByProject: {},
      isLoading: false,
      scanningProjectId: null,
      error: null,
      loadProjects: vi.fn(async () => {}),
      selectProject: vi.fn(async () => {}),
      chooseAndAddProject: vi.fn(async () => null),
      addProject: vi.fn(async () => project),
      updateProject: vi.fn(async () => {}),
      removeProject: vi.fn(async () => {}),
      scanProject: vi.fn(async () => []),
      installSkills: vi.fn(async () => ({
        succeeded: [],
        skipped: [],
        conflicted: [],
        failed: [],
      })),
      installCollection: vi.fn(async () => ({
        succeeded: [],
        skipped: [],
        conflicted: [],
        failed: [],
      })),
      uninstallSkill: vi.fn(async () => {}),
      syncCopy: vi.fn(async () => {}),
      importExternalSkill: vi.fn(),
    });
    useCentralSkillsStore.setState({
      skills: [
        {
          id: "central-demo",
          name: "Central Demo",
          description: "中央技能",
          file_path: "D:\\central\\central-demo\\SKILL.md",
          canonical_path: "D:\\central\\central-demo",
          is_central: true,
          scanned_at: "2026-07-26T00:00:00Z",
          linked_agents: [],
        },
      ],
      loadCentralSkills: vi.fn(async () => {}),
    });
    useCollectionStore.setState({
      collections: [
        {
          id: "collection-1",
          name: "前端技能集合",
          description: "项目常用前端技能",
          created_at: "2026-07-26T00:00:00Z",
          updated_at: "2026-07-26T00:00:00Z",
        },
      ],
      loadCollections: vi.fn(async () => {}),
    });
  });

  it("明确允许添加没有技能且不是 Git 仓库的任意目录", () => {
    renderView();
    expect(screen.getByText("还没有管理任何项目")).toBeInTheDocument();
    expect(
      screen.getByText(/项目不需要预先包含 Skills，也不要求是 Git 仓库/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加路径" })).toBeDisabled();
  });

  it("通过绝对路径添加项目", () => {
    const addProject = useProjectStore.getState().addProject;
    renderView();
    fireEvent.change(screen.getByLabelText("项目绝对路径"), {
      target: { value: project.path },
    });
    fireEvent.click(screen.getByRole("button", { name: "添加路径" }));
    expect(addProject).toHaveBeenCalledWith(project.path);
  });

  it("只为受管理副本提供同步和卸载操作", () => {
    useProjectStore.setState({
      projects: [project],
      selectedProjectId: project.id,
      skillsByProject: { [project.id]: [managedCopy] },
    });
    renderView();
    expect(screen.getByText("普通目录")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "同步" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "卸载" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "安装技能" })).toBeInTheDocument();
  });

  it("项目安装默认优先展示中央技能库，并支持切换技能集合和外部导入", async () => {
    useProjectStore.setState({
      projects: [project],
      selectedProjectId: project.id,
      skillsByProject: { [project.id]: [] },
    });
    renderView();

    fireEvent.click(screen.getAllByRole("button", { name: "安装技能" })[0]);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveClass(
      "sm:max-w-2xl",
      "max-h-[calc(100dvh-2rem)]",
      "grid-rows-[auto_auto_minmax(0,1fr)]",
      "overflow-hidden"
    );
    expect(
      screen.getByRole("tab", { name: "中央技能库" })
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Central Demo")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "技能集合" }));
    expect(screen.getByText("前端技能集合")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "外部导入" }));
    expect(
      screen.getByLabelText("本地技能目录或原始 SKILL.md 链接")
    ).toBeInTheDocument();
    expect(screen.queryByText(/技能市场直接安装/)).toBeInTheDocument();
  });

  it("可以从中央技能库批量安装到当前项目", async () => {
    const installSkills = vi.fn(async () => ({
      succeeded: [
        {
          skill_id: "central-demo",
          target_skill_id: "central-demo",
          target_path: "D:\\develop\\empty-project\\.agents\\skills\\central-demo",
          status: "installed",
        },
      ],
      skipped: [],
      conflicted: [],
      failed: [],
    }));
    useProjectStore.setState({
      projects: [project],
      selectedProjectId: project.id,
      skillsByProject: { [project.id]: [] },
      installSkills,
    });
    renderView();

    fireEvent.click(screen.getAllByRole("button", { name: "安装技能" })[0]);
    fireEvent.click(await screen.findByLabelText("选择 Central Demo"));
    fireEvent.click(screen.getByRole("button", { name: "安装 1 个技能" }));

    await waitFor(() => {
      expect(installSkills).toHaveBeenCalledWith(
        project.id,
        [{ skill_id: "central-demo" }],
        "auto"
      );
    });
  });
});
