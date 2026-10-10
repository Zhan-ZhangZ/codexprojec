# 0.10.0 发布验证记录

日期：2026-04-30

## 验证范围

- Rust 后端单元测试
- React 前端测试
- TypeScript 类型检查
- ESLint
- 前端生产构建
- Windows NSIS 与 MSI 安装包

## 验证门禁

| 项目 | 结果 |
|---|---|
| `cargo test` | 通过 |
| `pnpm test` | 通过 |
| `pnpm typecheck` | 通过 |
| `pnpm lint` | 通过 |
| `pnpm build` | 通过 |
| `pnpm tauri build` | 通过 |

## Windows 产物

- NSIS：`skills-manage_0.10.0_x64-setup.exe`
- MSI：`skills-manage_0.10.0_x64_en-US.msi`

## 非阻塞观察

- 部分 React 测试会输出 `act(...)` 提示，但不影响测试结果。
- Windows 软链接测试依赖系统开发者模式或创建软链接权限。
- 本记录仅对应 0.10.0；当前版本验证见 [0.11.0 测试验证记录](0.11.0-测试验证记录.md)。
