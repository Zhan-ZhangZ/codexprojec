//! Golden fixtures for the hardware-gated backend decisions of the TurboQuant provider
//! (atomic-chat-core stage 10c). The eight decision commands of this plugin are now answered by
//! the core (`src/backend/turboquant.ts`, `src/backend/select/turboquant-tiers.ts`); the
//! `#[test]` tables in `backend.rs` stay the truth, and this module writes them out as JSON for
//! the core's `test/contract/backend-select.test.ts` to replay as the `backend-select-llamacpp`
//! set.
//!
//! Every input is a JSON document deserialised into the command's own argument types, so a case
//! holds exactly what the command would receive over the wire, and every output is the command's
//! own serialisation. The one I/O the plugin does — the Linux ROCm host probe (`amdkfd`
//! `gfx_target_version`s and the HIP runtime) — is replaced by `input.rocm_probe`, fed to the same
//! pure `rocm_supported` the command composes on Linux, so a case is the same on every host.
//!
//! A child module so the private `rocm_supported` can be driven as it is.
//!
//! Run (from `src-tauri/`):
//! `cargo test --manifest-path plugins/tauri-plugin-llamacpp/Cargo.toml --lib -- --ignored backend::backend_select_fixture_dump::dump_fixtures`
//! then `node scripts/import-app-fixtures.mjs` in the core repository.

use serde_json::{json, Value};

use super::*;

const SOURCE: &str = "src-tauri/plugins/tauri-plugin-llamacpp/src/backend.rs";
const PROVIDER: &str = "llamacpp";
const SET: &str = "backend-select-llamacpp";
const PROFILES: &str = "tests/fixtures/hardware/profiles.json";

fn repo_root() -> std::path::PathBuf {
    std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../..")
        .canonicalize()
        .unwrap()
}

fn git_head(root: &std::path::Path) -> String {
    std::process::Command::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(root)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

// ---------------------------------------------------------------------------------------------
// Input builders
// ---------------------------------------------------------------------------------------------

fn nvidia(driver: &str, compute_capability: &str) -> Value {
    json!({
        "vendor": "NVIDIA",
        "driver_version": driver,
        "nvidia_info": {"compute_capability": compute_capability},
        "vulkan_info": null,
    })
}

fn vulkan_gpu(vendor: Option<&str>) -> Value {
    json!({
        "vendor": vendor,
        "driver_version": "0.0",
        "nvidia_info": null,
        "vulkan_info": {"api_version": "1.3"},
    })
}

fn amd() -> Value {
    vulkan_gpu(Some("AMD"))
}

fn vb(version: &str, backend: &str, order: u32) -> Value {
    json!({"version": version, "backend": backend, "order": order})
}

fn no_rocm() -> Value {
    json!({"gfx_target_versions": [], "has_runtime": false})
}

fn rocm_probe(gfx_target_versions: &[u32], has_runtime: bool) -> Value {
    json!({"gfx_target_versions": gfx_target_versions, "has_runtime": has_runtime})
}

fn features_input(os_type: &str, cpu_extensions: &[&str], gpus: Vec<Value>, rocm_probe: Value) -> Value {
    json!({
        "kind": "features",
        "os_type": os_type,
        "cpu_extensions": cpu_extensions,
        "gpus": gpus,
        "rocm_probe": rocm_probe,
    })
}

fn supported_input(os_type: &str, arch: &str, flags: [bool; 5]) -> Value {
    let [cuda11, cuda12, cuda13, vulkan, rocm] = flags;
    json!({
        "kind": "supported",
        "os_type": os_type,
        "arch": arch,
        "features": {"cuda11": cuda11, "cuda12": cuda12, "cuda13": cuda13, "vulkan": vulkan, "rocm": rocm},
    })
}

fn prioritize_input(version_backends: Vec<Value>, has_enough_gpu_memory: bool) -> Value {
    json!({"kind": "prioritize", "version_backends": version_backends, "has_enough_gpu_memory": has_enough_gpu_memory})
}

fn merge_input(remote: Vec<Value>, local: Vec<Value>) -> Value {
    json!({"kind": "merge", "remote": remote, "local": local})
}

fn latest_input(version_backends: Vec<Value>, backend_type: &str) -> Value {
    json!({"kind": "latest", "version_backends": version_backends, "backend_type": backend_type})
}

fn update_check_input(current: &str, version_backends: Vec<Value>) -> Value {
    json!({"kind": "update_check", "current": current, "version_backends": version_backends})
}

fn migrate_input(stored_type: &str, version_backends: Vec<Value>) -> Value {
    json!({"kind": "migrate", "stored_type": stored_type, "version_backends": version_backends})
}

fn setting_update_input(key: &str, value: &str, stored_type: Option<&str>) -> Value {
    json!({"kind": "setting_update", "key": key, "value": value, "stored_type": stored_type})
}

fn case_name(kind: &str, id: &str) -> String {
    let slug: String = id
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c.to_ascii_lowercase() } else { '_' })
        .collect();
    format!("{kind}_{slug}")
}

// ---------------------------------------------------------------------------------------------
// Running a case through the commands
// ---------------------------------------------------------------------------------------------

fn from<T: serde::de::DeserializeOwned>(input: &Value, key: &str) -> T {
    serde_json::from_value(input[key].clone())
        .unwrap_or_else(|e| panic!("input.{key} does not deserialise into the command's type: {e}"))
}

fn ok_or_error<T: serde::Serialize>(result: Result<T, String>) -> Value {
    match result {
        Ok(value) => serde_json::to_value(value).unwrap(),
        Err(error) => json!({"error": error}),
    }
}

/// `get_supported_features` with the host probe replaced by the case's `rocm_probe`: the command
/// sets `features.rocm = rocm_supported(any AMD gpu, amdkfd gfx versions, HIP runtime present)`
/// on Linux and leaves it `false` elsewhere; the same composition is made here over the input.
fn features_with_probe(input: &Value) -> Value {
    let os_type: String = from(input, "os_type");
    let gpus: Vec<GpuInfo> = from(input, "gpus");
    let has_amd_gpu = gpus.iter().any(is_amd_gpu);
    let mut features =
        ok_or_error(get_supported_features(os_type.clone(), from(input, "cpu_extensions"), gpus));
    if cfg!(not(target_os = "linux")) {
        assert_eq!(
            features["rocm"],
            json!(false),
            "off Linux the host probe never enables ROCm; the case's rocm_probe decides"
        );
    }
    let rocm = if os_type == "linux" {
        let gfx: Vec<u32> = from(&input["rocm_probe"], "gfx_target_versions");
        let has_runtime: bool = from(&input["rocm_probe"], "has_runtime");
        rocm_supported(has_amd_gpu, &gfx, has_runtime)
    } else {
        false
    };
    features["rocm"] = json!(rocm);
    features
}

async fn run(input: &Value) -> Value {
    match input["kind"].as_str().unwrap() {
        "features" => features_with_probe(input),
        "supported" => ok_or_error(determine_supported_backends(
            from(input, "os_type"),
            from(input, "arch"),
            from::<SystemFeatures>(input, "features"),
        )),
        "prioritize" => ok_or_error(
            prioritize_backends(
                from::<Vec<BackendInfo>>(input, "version_backends"),
                from(input, "has_enough_gpu_memory"),
            )
            .await,
        ),
        "merge" => ok_or_error(
            list_supported_backends(
                from::<Vec<BackendInfo>>(input, "remote"),
                from::<Vec<BackendInfo>>(input, "local"),
            )
            .await,
        ),
        "latest" => serde_json::to_value(find_latest_version_for_backend(
            from::<Vec<BackendInfo>>(input, "version_backends"),
            from(input, "backend_type"),
        ))
        .unwrap(),
        "update_check" => ok_or_error(
            check_backend_for_updates(
                from(input, "current"),
                from::<Vec<BackendInfo>>(input, "version_backends"),
            )
            .await,
        ),
        "migrate" => ok_or_error(should_migrate_backend(
            from(input, "stored_type"),
            from::<Vec<BackendInfo>>(input, "version_backends"),
        )),
        "setting_update" => ok_or_error(handle_setting_update(
            from(input, "key"),
            from(input, "value"),
            from::<Option<String>>(input, "stored_type"),
        )),
        other => panic!("unknown case kind {other}"),
    }
}

// ---------------------------------------------------------------------------------------------
// The tables
// ---------------------------------------------------------------------------------------------

fn feature_cases(root: &std::path::Path) -> Vec<(String, Value)> {
    const GFX1100: u32 = 110000; // RDNA3, in the build
    const GFX900: u32 = 90000; // Vega, not in the build
    let mut cases: Vec<(String, Value)> = vec![
        ("cpu_only_linux_avx_avx2", features_input("linux", &["avx", "avx2"], vec![], no_rocm())),
        ("cpu_only_windows_avx512", features_input("windows", &["avx512"], vec![], no_rocm())),
        ("linux_nvidia_530_cuda11_cuda12_not_cuda13", features_input("linux", &[], vec![nvidia("530.00", "8.0")], no_rocm())),
        ("linux_nvidia_580_exact_cuda13_floor", features_input("linux", &[], vec![nvidia("580", "8.9")], no_rocm())),
        ("linux_nvidia_579_99_no_cuda13", features_input("linux", &[], vec![nvidia("579.99", "8.9")], no_rocm())),
        ("windows_amd_vulkan_only", features_input("windows", &[], vec![amd()], no_rocm())),
        ("windows_vulkan_only_unknown_vendor", features_input("windows", &[], vec![vulkan_gpu(None)], no_rocm())),
        ("windows_driver_527_40_no_cuda_tier", features_input("windows", &[], vec![nvidia("527.40", "8.9")], no_rocm())),
        ("windows_driver_527_41_cuda12_fork_floor", features_input("windows", &[], vec![nvidia("527.41", "8.9")], no_rocm())),
        ("windows_driver_550_cuda12_only", features_input("windows", &[], vec![nvidia("550.00", "8.9")], no_rocm())),
        ("windows_driver_551_61_cuda12_only", features_input("windows", &[], vec![nvidia("551.61", "8.9")], no_rocm())),
        ("windows_driver_581_14_cuda12_only", features_input("windows", &[], vec![nvidia("581.14", "8.9")], no_rocm())),
        ("windows_driver_581_15_cuda12_and_cuda13", features_input("windows", &[], vec![nvidia("581.15", "8.9")], no_rocm())),
        ("windows_driver_581_42_cuda12_and_cuda13", features_input("windows", &[], vec![nvidia("581.42", "8.9")], no_rocm())),
        ("windows_cuda11_driver_452_39_only", features_input("windows", &[], vec![nvidia("452.39", "8.9")], no_rocm())),
        ("linux_volta_7_0_vetoes_cuda13", features_input("linux", &[], vec![nvidia("580.65", "7.0")], no_rocm())),
        ("linux_pascal_6_1_vetoes_cuda13", features_input("linux", &[], vec![nvidia("580.65", "6.1")], no_rocm())),
        ("linux_maxwell_5_2_vetoes_cuda13", features_input("linux", &[], vec![nvidia("580.65", "5.2")], no_rocm())),
        ("linux_turing_7_5_is_the_cuda13_floor", features_input("linux", &[], vec![nvidia("580.65", "7.5")], no_rocm())),
        ("linux_blackwell_10_0_gets_cuda13", features_input("linux", &[], vec![nvidia("580.65", "10.0")], no_rocm())),
        ("linux_blackwell_12_0_gets_cuda13", features_input("linux", &[], vec![nvidia("580.65", "12.0")], no_rocm())),
        ("linux_major_only_compute_capability_8", features_input("linux", &[], vec![nvidia("580.65", "8")], no_rocm())),
        (
            "linux_one_old_gpu_vetoes_cuda13_for_the_host",
            features_input("linux", &[], vec![nvidia("580.65", "8.9"), nvidia("580.65", "7.0")], no_rocm()),
        ),
        ("linux_unknown_compute_capability_keeps_cuda13", features_input("linux", &[], vec![nvidia("580.65", "")], no_rocm())),
        ("linux_unreadable_compute_capability_keeps_cuda13", features_input("linux", &[], vec![nvidia("580.65", "unknown")], no_rocm())),
        (
            "linux_nvidia_info_without_compute_capability",
            features_input(
                "linux",
                &[],
                vec![json!({"driver_version": "580.65", "nvidia_info": {"index": 0}, "vulkan_info": null})],
                no_rocm(),
            ),
        ),
        ("windows_volta_7_0_vetoes_cuda13", features_input("windows", &[], vec![nvidia("581.42", "7.0")], no_rocm())),
        (
            "linux_amd_rdna3_with_runtime_enables_rocm",
            features_input("linux", &[], vec![amd()], rocm_probe(&[GFX1100], true)),
        ),
        (
            "linux_amd_rdna3_without_runtime_no_rocm",
            features_input("linux", &[], vec![amd()], rocm_probe(&[GFX1100], false)),
        ),
        (
            "linux_amd_vega_with_runtime_no_rocm",
            features_input("linux", &[], vec![amd()], rocm_probe(&[GFX900], true)),
        ),
        (
            "linux_amd_no_kfd_nodes_no_rocm",
            features_input("linux", &[], vec![amd()], rocm_probe(&[], true)),
        ),
        (
            "linux_amd_any_supported_node_enables_rocm",
            features_input("linux", &[], vec![amd()], rocm_probe(&[GFX900, GFX1100], true)),
        ),
        (
            "linux_nvidia_with_rocm_facts_no_rocm",
            features_input("linux", &[], vec![nvidia("580.65", "8.9")], rocm_probe(&[GFX1100], true)),
        ),
        (
            "linux_amd_lowercase_vendor_enables_rocm",
            features_input("linux", &[], vec![vulkan_gpu(Some("amd"))], rocm_probe(&[GFX1100], true)),
        ),
        (
            "linux_amd_and_nvidia_side_by_side",
            features_input("linux", &[], vec![amd(), nvidia("580.65", "8.9")], rocm_probe(&[GFX1100], true)),
        ),
        (
            "windows_amd_rocm_facts_ignored",
            features_input("windows", &[], vec![amd()], rocm_probe(&[GFX1100], true)),
        ),
        (
            "macos_ignores_every_gpu",
            features_input("macos", &["avx"], vec![nvidia("581.42", "8.9"), amd()], rocm_probe(&[GFX1100], true)),
        ),
        ("unknown_os_only_cpu_flags", features_input("freebsd", &["avx2"], vec![nvidia("581.42", "8.9")], no_rocm())),
    ]
    .into_iter()
    .map(|(id, input)| (case_name("features", id), input))
    .collect();

    for gfx in ROCM_SUPPORTED_GFX_TARGET_VERSIONS {
        cases.push((
            case_name("features", &format!("linux_amd_gfx_target_{gfx}_enables_rocm")),
            features_input("linux", &[], vec![amd()], rocm_probe(&[*gfx], true)),
        ));
    }

    // The six machine profiles the app's own deterministic tests use. Their `features` block is
    // that TypeScript test's assumption; here the plugin computes the features itself. The
    // profiles carry no `vulkan_info.api_version`, which this plugin's `VulkanInfo` requires, so
    // `1.3` is added before the GPUs are handed to the command; no profile carries ROCm facts.
    let profiles: Vec<Value> = serde_json::from_str(&std::fs::read_to_string(root.join(PROFILES)).unwrap()).unwrap();
    for profile in profiles {
        let system_info = &profile["system_info"];
        let os_type = system_info["os_type"].as_str().unwrap();
        let cpu_extensions: Vec<&str> = system_info["cpu"]["extensions"]
            .as_array()
            .unwrap()
            .iter()
            .map(|e| e.as_str().unwrap())
            .collect();
        let gpus: Vec<Value> = system_info["gpus"]
            .as_array()
            .unwrap()
            .iter()
            .map(|gpu| {
                let mut gpu = gpu.clone();
                if let Some(vulkan) = gpu.get_mut("vulkan_info").and_then(|v| v.as_object_mut()) {
                    vulkan.entry("api_version").or_insert(json!("1.3"));
                }
                gpu
            })
            .collect();
        cases.push((
            case_name("features", &format!("profile_{}", profile["name"].as_str().unwrap())),
            features_input(os_type, &cpu_extensions, gpus, no_rocm()),
        ));
    }
    cases
}

fn supported_cases() -> Vec<(String, Value)> {
    // [cuda11, cuda12, cuda13, vulkan, rocm]
    const NONE: [bool; 5] = [false, false, false, false, false];
    const ALL: [bool; 5] = [true, true, true, true, true];
    vec![
        ("windows_x86_64_cuda12_vulkan_cuda11_ignored", supported_input("windows", "x86_64", [true, true, false, true, false])),
        ("windows_x86_64_every_flag_rocm_ignored", supported_input("windows", "x86_64", ALL)),
        ("windows_x86_64_cuda13_only", supported_input("windows", "x86_64", [false, false, true, false, false])),
        ("windows_x86_64_no_flags", supported_input("windows", "x86_64", NONE)),
        ("windows_aarch64_placeholder", supported_input("windows", "aarch64", ALL)),
        ("windows_arm64_placeholder", supported_input("windows", "arm64", NONE)),
        ("linux_x86_64_full_matrix", supported_input("linux", "x86_64", ALL)),
        ("linux_x86_64_cpu_only_keeps_vulkan_fallback", supported_input("linux", "x86_64", NONE)),
        ("linux_x86_64_rocm_absent_without_probe", supported_input("linux", "x86_64", [false, false, false, true, false])),
        ("linux_x86_64_cuda12_only", supported_input("linux", "x86_64", [true, true, false, false, false])),
        ("linux_x86_64_rocm_without_vulkan_flag", supported_input("linux", "x86_64", [false, false, false, false, true])),
        ("linux_x86_alias_full_matrix", supported_input("linux", "x86", ALL)),
        ("linux_aarch64_cuda13_only_build", supported_input("linux", "aarch64", [false, false, true, false, false])),
        ("linux_aarch64_without_cuda13_is_empty", supported_input("linux", "aarch64", [false, false, false, true, false])),
        ("linux_arm64_alias_cuda13", supported_input("linux", "arm64", [true, true, true, true, true])),
        ("macos_x86_64", supported_input("macos", "x86_64", NONE)),
        ("macos_x86_alias", supported_input("macos", "x86", ALL)),
        ("macos_aarch64", supported_input("macos", "aarch64", NONE)),
        ("macos_arm64", supported_input("macos", "arm64", ALL)),
        ("unsupported_freebsd_x86_64", supported_input("freebsd", "x86_64", ALL)),
        ("unsupported_windows_x86_32_bit", supported_input("windows", "x86", ALL)),
        ("unsupported_linux_riscv64", supported_input("linux", "riscv64", NONE)),
    ]
    .into_iter()
    .map(|(id, input)| (case_name("supported", id), input))
    .collect()
}

fn prioritize_cases() -> Vec<(String, Value)> {
    let windows = || {
        vec![
            vb("b10018-1.3.0", "windows-x64-cpu", 0),
            vb("b10018-1.3.0", "windows-x64-vulkan", 0),
            vb("b10018-1.3.0", "windows-x64-cuda-12.4", 0),
            vb("b10018-1.3.0", "windows-x64-cuda-13.3", 0),
        ]
    };
    let linux_vulkan = || vec![vb("b10018-1.3.0", "linux-x64-cpu", 0), vb("b10018-1.3.0", "linux-x64-vulkan", 0)];
    let linux_rocm = || {
        vec![
            vb("b10018-1.3.0", "linux-x64-vulkan", 0),
            vb("b10018-1.3.0", "linux-x64-rocm", 0),
            vb("b10018-1.3.0", "linux-x64-cpu", 0),
        ]
    };
    vec![
        ("windows_cuda13_first", prioritize_input(windows(), true)),
        ("windows_cuda13_leads_without_enough_vram_too", prioritize_input(windows(), false)),
        (
            "windows_cuda12_when_no_cuda13_build",
            prioritize_input(
                vec![vb("b10018-1.3.0", "windows-x64-vulkan", 0), vb("b10018-1.3.0", "windows-x64-cuda-12.4", 0)],
                false,
            ),
        ),
        ("linux_vulkan_with_enough_gpu_memory", prioritize_input(linux_vulkan(), true)),
        ("linux_cpu_without_enough_gpu_memory", prioritize_input(linux_vulkan(), false)),
        ("linux_rocm_over_vulkan_with_enough_gpu_memory", prioritize_input(linux_rocm(), true)),
        ("linux_cpu_over_gpu_tiers_without_enough_gpu_memory", prioritize_input(linux_rocm(), false)),
        ("empty_catalog_rejected", prioritize_input(vec![], true)),
        (
            "newest_unified_tag_within_category",
            prioritize_input(
                vec![
                    vb("b10018-1.2.9", "linux-x64-vulkan", 9),
                    vb("b10018-1.3.0", "linux-x64-vulkan", 1),
                    vb("b9900-1.4.0", "linux-x64-vulkan", 8),
                ],
                true,
            ),
        ),
        (
            "unified_tag_beats_legacy_tag",
            prioritize_input(
                vec![vb("turboquant-linux-x64-vulkan-bbbb", "linux-x64-vulkan", 99), vb("b10018-1.3.0", "linux-x64-vulkan", 1)],
                true,
            ),
        ),
        (
            "legacy_tags_decided_by_order",
            prioritize_input(
                vec![vb("turboquant-macos-arm64-e3dad20", "macos-arm64", 1), vb("turboquant-macos-arm64-18a8ef1", "macos-arm64", 2)],
                false,
            ),
        ),
        (
            "legacy_janhq_cu13_0_is_cuda13",
            prioritize_input(vec![vb("b7523", "win-cuda-12-common_cpus-x64", 0), vb("b7523", "win-noavx-cuda-cu13.0-x64", 0)], true),
        ),
        ("windows_arm64_placeholder_category", prioritize_input(vec![vb("b10018-1.3.0", "windows-arm64", 0)], true)),
        ("linux_arm64_cuda13_category", prioritize_input(vec![vb("b10018-1.3.0", "linux-arm64-cuda-13.3", 0)], false)),
        (
            "no_category_falls_back_to_first_entry",
            prioritize_input(vec![vb("b7523", "backend-a", 0), vb("b7524", "backend-b", 0)], true),
        ),
    ]
    .into_iter()
    .map(|(id, input)| (case_name("prioritize", id), input))
    .collect()
}

fn merge_cases() -> Vec<(String, Value)> {
    vec![
        (
            "sorting_and_dedup",
            merge_input(
                vec![vb("b7523", "backend-a", 1), vb("b7523", "backend-b", 1)],
                vec![vb("b7523", "backend-a", 0), vb("b7524", "backend-c", 2)],
            ),
        ),
        (
            "local_higher_order_replaces_remote",
            merge_input(vec![vb("b10018-1.3.0", "linux-x64-vulkan", 0)], vec![vb("b10018-1.3.0", "linux-x64-vulkan", 5)]),
        ),
        (
            "unified_tags_by_build_then_fork_semver",
            merge_input(
                vec![
                    vb("b10018-1.2.9", "linux-x64-rocm", 9),
                    vb("b10018-1.3.0", "linux-x64-rocm", 1),
                    vb("b9900-1.4.0", "linux-x64-rocm", 8),
                    vb("b10018-1.3.0", "linux-x64-cpu", 1),
                ],
                vec![],
            ),
        ),
        (
            "unified_above_legacy_whatever_the_order",
            merge_input(vec![vb("b10018-1.3.0", "linux-x64-vulkan", 0)], vec![vb("turboquant-linux-x64-vulkan-bbbb", "linux-x64-vulkan", 99)]),
        ),
        (
            "legacy_tags_by_order",
            merge_input(
                vec![vb("turboquant-macos-arm64-e3dad20", "macos-arm64", 1), vb("turboquant-macos-arm64-18a8ef1", "macos-arm64", 2)],
                vec![],
            ),
        ),
        (
            "clean_windows_id_with_numeric_tags_by_parsed_build",
            merge_input(vec![], vec![vb("b7524", "windows-x64-cuda-12.4", 9), vb("b7525", "windows-x64-cuda-12.4", 0)]),
        ),
        (
            "plain_bnnnn_tag_is_not_unified",
            merge_input(vec![vb("b10344", "linux-x64-vulkan", 0), vb("b10018-1.3.0", "linux-x64-vulkan", 0)], vec![]),
        ),
        (
            "ties_fall_to_version_then_backend",
            merge_input(vec![vb("custom-a", "macos-x64", 1), vb("custom-b", "macos-arm64", 1), vb("custom-a", "macos-arm64", 1)], vec![]),
        ),
        (
            "remote_without_order_defaults_to_zero",
            merge_input(
                vec![json!({"version": "b10018-1.3.0", "backend": "macos-arm64"})],
                vec![vb("turboquant-macos-arm64-18a8ef1", "macos-arm64", 1_800_000_000)],
            ),
        ),
        ("empty_inputs", merge_input(vec![], vec![])),
    ]
    .into_iter()
    .map(|(id, input)| (case_name("merge", id), input))
    .collect()
}

fn latest_cases() -> Vec<(String, Value)> {
    vec![
        (
            "legacy_tags_by_order",
            latest_input(
                vec![
                    vb("turboquant-linux-x64-vulkan-aaaa", "linux-x64-vulkan", 2),
                    vb("turboquant-linux-x64-vulkan-bbbb", "linux-x64-vulkan", 3),
                    vb("turboquant-linux-x64-vulkan-cccc", "linux-x64-vulkan", 1),
                ],
                "linux-x64-vulkan",
            ),
        ),
        (
            "prefers_the_newest_unified_release",
            latest_input(
                vec![
                    vb("b10018-1.3.0", "linux-x64-rocm", 1),
                    vb("b10018-1.2.9", "linux-x64-rocm", 9),
                    vb("b9900-1.4.0", "linux-x64-rocm", 8),
                ],
                "linux-x64-rocm",
            ),
        ),
        (
            "ranks_unified_above_legacy_tags",
            latest_input(
                vec![vb("turboquant-linux-x64-vulkan-bbbb", "linux-x64-vulkan", 99), vb("b10018-1.3.0", "linux-x64-vulkan", 1)],
                "linux-x64-vulkan",
            ),
        ),
        (
            "windows_uses_version_not_order",
            latest_input(
                vec![vb("b7524", "windows-x64-cuda-12.4", 1_800_000_000), vb("b7525", "windows-x64-cuda-12.4", 0)],
                "windows-x64-cuda-12.4",
            ),
        ),
        (
            "legacy_id_matches_after_migration",
            latest_input(
                vec![
                    vb("turboquant-linux-x64-vulkan-aaaa", "linux-avx2-x64", 1),
                    vb("turboquant-linux-x64-vulkan-bbbb", "linux-x64-vulkan", 2),
                ],
                "linux-x64-vulkan",
            ),
        ),
        (
            "keeps_legacy_spelling_when_it_wins",
            latest_input(vec![vb("b10018-1.3.0", "linux-avx2-x64", 0), vb("b10018-1.2.0", "linux-x64-vulkan", 0)], "linux-x64-vulkan"),
        ),
        ("none_when_type_absent", latest_input(vec![vb("b10018-1.3.0", "linux-x64-vulkan", 0)], "linux-x64-rocm")),
        ("none_for_empty_catalog", latest_input(vec![], "macos-arm64")),
        (
            "unified_fork_semver_decides_at_equal_build",
            latest_input(vec![vb("b10018-1.10.0", "macos-arm64", 0), vb("b10018-1.9.9", "macos-arm64", 0)], "macos-arm64"),
        ),
    ]
    .into_iter()
    .map(|(id, input)| (case_name("latest", id), input))
    .collect()
}

fn update_check_cases() -> Vec<(String, Value)> {
    let legacy = || {
        vec![
            vb("turboquant-macos-arm64-e3dad20", "macos-arm64", 1),
            vb("turboquant-macos-arm64-18a8ef1", "macos-arm64", 2),
        ]
    };
    vec![
        ("legacy_tags_by_order_needs_update", update_check_input("turboquant-macos-arm64-e3dad20/macos-arm64", legacy())),
        ("legacy_tags_by_order_already_latest", update_check_input("turboquant-macos-arm64-18a8ef1/macos-arm64", legacy())),
        (
            "windows_uses_version_not_order",
            update_check_input(
                "b7524/windows-x64-cuda-12.4",
                vec![vb("b7524", "windows-x64-cuda-12.4", 1_800_000_000), vb("b7525", "windows-x64-cuda-12.4", 0)],
            ),
        ),
        (
            "unified_release_newer_than_legacy_install",
            update_check_input(
                "turboquant-linux-x64-vulkan-bbbb/linux-x64-vulkan",
                vec![vb("turboquant-linux-x64-vulkan-bbbb", "linux-x64-vulkan", 99), vb("b10018-1.3.0", "linux-x64-vulkan", 0)],
            ),
        ),
        (
            "unified_already_latest",
            update_check_input("b10018-1.3.0/linux-x64-vulkan", vec![vb("b10018-1.3.0", "linux-x64-vulkan", 0), vb("b10018-1.2.9", "linux-x64-vulkan", 0)]),
        ),
        ("no_versions_for_type", update_check_input("b10018-1.3.0/linux-x64-rocm", vec![vb("b10018-1.3.0", "linux-x64-vulkan", 0)])),
        ("empty_catalog", update_check_input("b10018-1.3.0/macos-arm64", vec![])),
        ("invalid_format_no_slash", update_check_input("b10018-1.3.0", vec![vb("b10018-1.3.0", "macos-arm64", 0)])),
        ("invalid_format_two_slashes", update_check_input("b10018-1.3.0/macos-arm64/extra", vec![])),
        (
            "legacy_current_migrates_type",
            update_check_input("turboquant-linux-x64-vulkan-aaaa/linux-avx2-x64", vec![vb("b10018-1.3.0", "linux-x64-vulkan", 0)]),
        ),
        (
            "legacy_windows_current_migrates_type",
            update_check_input("b7523/win-cuda-13-common_cpus-x64", vec![vb("b10018-1.3.0", "windows-x64-cuda-13.3", 0)]),
        ),
    ]
    .into_iter()
    .map(|(id, input)| (case_name("update_check", id), input))
    .collect()
}

fn migrate_cases() -> Vec<(String, Value)> {
    vec![
        (
            "linux_avx2_to_vulkan_when_available",
            migrate_input("linux-avx2-x64", vec![vb("turboquant-linux-x64-vulkan-aaaa", "linux-x64-vulkan", 1)]),
        ),
        (
            "clean_id_needs_no_migration",
            migrate_input("linux-x64-vulkan", vec![vb("turboquant-linux-x64-vulkan-aaaa", "linux-x64-vulkan", 1)]),
        ),
        ("skipped_when_target_not_available", migrate_input("linux-avx2-x64", vec![vb("b10018-1.3.0", "linux-x64-cpu", 1)])),
        (
            "target_available_under_legacy_spelling",
            migrate_input("win-cuda-12-common_cpus-x64", vec![vb("b7524", "win-noavx-cuda-cu12.0-x64", 1)]),
        ),
        ("bom_prefixed_clean_id_migrates_to_itself", migrate_input("\u{FEFF}linux-x64-vulkan", vec![vb("b10018-1.3.0", "linux-x64-vulkan", 0)])),
        ("linux_arm64_stays", migrate_input("linux-arm64", vec![vb("b10018-1.3.0", "linux-arm64-cuda-13.3", 0)])),
        ("empty_catalog_skips", migrate_input("linux-avx2-x64", vec![])),
    ]
    .into_iter()
    .map(|(id, input)| (case_name("migrate", id), input))
    .collect()
}

fn setting_update_cases() -> Vec<(String, Value)> {
    let mut cases: Vec<(String, Value)> = vec![
        ("other_key_is_a_noop", setting_update_input("ctx_size", "4096", Some("windows-x64-cpu"))),
        ("new_type_with_nothing_stored", setting_update_input("version_backend", "b10018-1.3.0/windows-x64-cuda-12.4", None)),
        ("same_stored_type_not_updated", setting_update_input("version_backend", "b10018-1.3.0/windows-x64-cuda-12.4", Some("windows-x64-cuda-12.4"))),
        ("different_stored_type_updated", setting_update_input("version_backend", "b10018-1.3.0/windows-x64-cuda-12.4", Some("windows-x64-cpu"))),
        ("legacy_value_compared_after_migration", setting_update_input("version_backend", "b7523/win-cuda-12-common_cpus-x64", Some("windows-x64-cuda-12.4"))),
        ("bom_stripped", setting_update_input("version_backend", "\u{FEFF}b10018-1.3.0/windows-x64-cpu", None)),
        ("parts_trimmed", setting_update_input("version_backend", " b10018-1.3.0 / windows-x64-cpu ", None)),
        ("invalid_no_slash", setting_update_input("version_backend", "b10018-1.3.0", None)),
        ("invalid_two_slashes", setting_update_input("version_backend", "a/b/c", None)),
        ("invalid_empty_version", setting_update_input("version_backend", "/windows-x64-cpu", None)),
        ("invalid_empty_backend_reports_raw_value", setting_update_input("version_backend", "\u{FEFF}b1/", None)),
        ("invalid_empty_string", setting_update_input("version_backend", "", None)),
    ]
    .into_iter()
    .map(|(id, input)| (case_name("setting_update", id), input))
    .collect();

    // `map_old_backend_to_new`, pinned through the setting update's `effective_backend_type`.
    // Every id the plugin's own tests assert, plus the other clean ids and the odd spellings.
    for id in [
        "linux-avx2-cuda-cu12.0-x64",
        "win-noavx-cuda-cu11.7-x64",
        "win-cuda-12-common_cpus-x64",
        "win-cuda-13-common_cpus-x64",
        "win-cuda-12.4-x64",
        "win-cuda-13.3-x64",
        "win-cuda-13-x64",
        "windows-x64-cuda-12.4",
        "windows-x64-cuda-13.3",
        "linux-vulkan-x64",
        "win-vulkan-common_cpus-x64",
        "win-vulkan-x64",
        "linux-x64-vulkan",
        "windows-x64-vulkan",
        "win-avx512-x64",
        "win-common_cpus-x64",
        "win-cpu-x64",
        "win-rocm-7.14-x64",
        "linux-avx2-x64",
        "linux-cpu-x64",
        "linux-cuda-13-common_cpus-x64",
        "windows-x64-cpu",
        "windows-arm64",
        "linux-x64-cpu",
        "linux-x64-cuda-12.4",
        "linux-x64-cuda-13.3",
        "linux-x64-rocm",
        "linux-arm64",
        "linux-arm64-cuda-13.3",
        "linux-aarch64-vulkan",
        "linux-cpu-arm64",
        "ubuntu-vulkan-x64",
        "macos-arm64",
        "macos-x64",
        "macos-avx2-x64",
        "backend-a",
    ] {
        cases.push((
            case_name("setting_update", &format!("maps_{id}")),
            setting_update_input("version_backend", &format!("b10018-1.3.0/{id}"), None),
        ));
    }
    cases.push((
        case_name("setting_update", "maps_bom_and_padding_stripped_inside_id"),
        setting_update_input("version_backend", "b10018-1.3.0/\u{FEFF}windows-x64-vulkan", None),
    ));
    cases
}

#[tokio::test]
#[ignore]
async fn dump_fixtures() {
    let root = repo_root();
    let out = root.join("tests/fixtures/core-contracts").join(SET);
    let _ = std::fs::remove_dir_all(&out);
    std::fs::create_dir_all(&out).unwrap();
    let commit = git_head(&root);

    let mut cases = feature_cases(&root);
    cases.extend(supported_cases());
    cases.extend(prioritize_cases());
    cases.extend(merge_cases());
    cases.extend(latest_cases());
    cases.extend(update_check_cases());
    cases.extend(migrate_cases());
    cases.extend(setting_update_cases());

    let mut names = Vec::new();
    for (name, input) in cases {
        assert!(!names.contains(&name), "duplicate case name {name}");
        let expected = run(&input).await;
        let doc = json!({
            "name": name,
            "source": {"file": SOURCE, "commit": commit, "provider": PROVIDER},
            "comparator": "json-exact",
            "input": input,
            "expected": expected,
        });
        std::fs::write(out.join(format!("{name}.json")), serde_json::to_string_pretty(&doc).unwrap() + "\n").unwrap();
        names.push(name);
    }
    let index = json!({
        "source": {"file": SOURCE, "commit": commit, "provider": PROVIDER},
        "comparator": "json-exact",
        "note": "Hardware-gated backend decisions of the TurboQuant provider (`llamacpp`). Call the command named by input.kind with the other input fields as its arguments and compare the result with expected as a JSON tree; a command that returns Err(String) is expected as {error}.",
        "comparator_notes": {
            "features": "get_supported_features(os_type, cpu_extensions, gpus) -> SupportedFeatures, with the Linux host probe replaced by input.rocm_probe {gfx_target_versions, has_runtime}: expected.rocm = rocm_supported(any AMD gpu, gfx_target_versions, has_runtime) on Linux and false elsewhere, exactly as the command composes it. input.gpus is the wire shape of this plugin's GpuInfo (driver_version required; vendor, nvidia_info{compute_capability}, vulkan_info{api_version} optional; unknown fields ignored). The features_profile_* cases are the machines of tests/fixtures/hardware/profiles.json: their own `features` block is that TypeScript test's assumption, not this command's output (driver_version \"fixture\" clears every CUDA floor), and `api_version: \"1.3\"` was added because this plugin's VulkanInfo requires it.",
            "supported": "determine_supported_backends(os_type, arch, features) -> string[] in the plugin's order (Linux x64 always ends with linux-x64-vulkan; Linux arm64 is empty without cuda13), or {error: \"Unsupported system type: <os>-<arch>\"}.",
            "prioritize": "prioritize_backends(version_backends, has_enough_gpu_memory) -> BestBackendResult {backend_string, version, backend_type}, or {error: \"No backends available\"}.",
            "merge": "list_supported_backends(remote, local) -> the merged list sorted newest first by the fork's comparator (unified tags first, then legacy janhq win-* numeric tags, then order); `order` is always serialised (0 when the input omitted it).",
            "latest": "find_latest_version_for_backend(version_backends, backend_type) -> \"<version>/<backend>\" with the original backend spelling, or null.",
            "update_check": "check_backend_for_updates(current, version_backends) -> UpdateCheckResult {update_needed, new_version, target_backend}, or {error: \"Invalid current backend format: <current>\"}.",
            "migrate": "should_migrate_backend(stored_type, version_backends) -> the mapped clean id, or null. The plugin's mapper strips a BOM and trims, so a BOM-prefixed clean id is reported as needing migration to itself.",
            "setting_update": "handle_setting_update(key, value, stored_type) -> SettingUpdateResult, or {error: \"Invalid backend format: <value>\"}. The setting_update_maps_* cases pin map_old_backend_to_new(<id>) as expected.effective_backend_type.",
            "known_divergence": {
                "merge_remote_without_order_defaults_to_zero": "The core's `listSupportedBackends` copies an input entry as it is, so an entry that came without `order` stays without it where `#[serde(default)]` wrote `order: 0` here. Every reader uses `order ?? 0`; the replay asserts the field absent for such entries.",
            },
            "behaviour_not_captured": "amdkfd_gfx_target_versions and host_has_rocm_runtime (the sysfs and library-path reads behind rocm_probe), get_local_installed_backends, remove_old_backend_versions and install_bundled_backend touch the disk and are not pinned here.",
        },
        "cases": names,
    });
    std::fs::write(out.join("index.json"), serde_json::to_string_pretty(&index).unwrap() + "\n").unwrap();
    eprintln!("wrote {} {SET} fixtures", names.len());
}
