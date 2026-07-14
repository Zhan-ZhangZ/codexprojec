#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
# 默认不指向任何个人路径；依次尝试：bundled bin → PATH → 用户通过 XHS_MCP_DIR 指定 → 自动下载
DEFAULT_XHS_MCP_DIR="${XHS_MCP_DIR:-}"
XHS_MCP_DIR="${XHS_MCP_DIR:-}"
XHS_LOGIN_BIN="${XHS_LOGIN_BIN:-}"
XHS_SERVER_BIN="${XHS_SERVER_BIN:-}"
XHS_MCP_PORT="${XHS_MCP_PORT:-18060}"
XHS_MCP_HEADLESS="${XHS_MCP_HEADLESS:-true}"
XHS_AUTO_INSTALL="${XHS_AUTO_INSTALL:-true}"
XHS_INSTALL_DIR="${XHS_INSTALL_DIR:-${SKILL_DIR}/bin}"
XHS_GIT_REPO="${XHS_GIT_REPO:-https://github.com/xpzouying/xiaohongshu-mcp.git}"
XHS_VERSION="${XHS_VERSION:-latest}"
XHS_RUNTIME_DIR="${XHS_RUNTIME_DIR:-${SKILL_DIR}/runtime}"

usage() {
  cat <<'EOF'
Usage:
  start_xhs_mcp.sh install
  start_xhs_mcp.sh login
  start_xhs_mcp.sh server
  start_xhs_mcp.sh status

Environment overrides:
  XHS_SKILL_DIR
  XHS_AUTO_INSTALL
  XHS_INSTALL_DIR
  XHS_GIT_REPO
  XHS_VERSION
  XHS_RUNTIME_DIR
  XHS_MCP_DIR
  XHS_LOGIN_BIN
  XHS_SERVER_BIN
  XHS_MCP_PORT
  XHS_MCP_HEADLESS
  XHS_BROWSER_BIN
EOF
}

fail() {
  echo "[xhs-skill] $*" >&2
  exit 1
}

log() {
  echo "[xhs-skill] $*" >&2
}

pick_first_existing() {
  local path
  for path in "$@"; do
    if [[ -n "${path}" && -x "${path}" ]]; then
      printf '%s\n' "${path}"
      return 0
    fi
  done
  return 1
}

find_browser() {
  if [[ -n "${XHS_BROWSER_BIN:-}" && -x "${XHS_BROWSER_BIN}" ]]; then
    printf '%s\n' "${XHS_BROWSER_BIN}"
    return 0
  fi

  local candidates=(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  )
  local path
  for path in "${candidates[@]}"; do
    if [[ -x "${path}" ]]; then
      printf '%s\n' "${path}"
      return 0
    fi
  done

  return 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

detect_platform_suffix() {
  local os arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"

  case "${os}" in
    darwin) ;;
    linux) ;;
    msys*|mingw*|cygwin*) os="windows" ;;
    *) return 1 ;;
  esac

  case "${arch}" in
    arm64|aarch64) arch="arm64" ;;
    x86_64|amd64) arch="amd64" ;;
    *) return 1 ;;
  esac

  if [[ "${os}" == "windows" && "${arch}" != "amd64" ]]; then
    return 1
  fi

  if [[ "${os}" == "linux" && "${arch}" != "amd64" ]]; then
    return 1
  fi

  printf '%s-%s\n' "${os}" "${arch}"
}

release_archive_name() {
  local suffix="$1"
  case "${suffix}" in
    windows-amd64) printf 'xiaohongshu-mcp-%s.zip\n' "${suffix}" ;;
    darwin-arm64|darwin-amd64|linux-amd64) printf 'xiaohongshu-mcp-%s.tar.gz\n' "${suffix}" ;;
    *) return 1 ;;
  esac
}

ensure_install_dir() {
  mkdir -p "${XHS_INSTALL_DIR}"
}

download_latest_release() {
  require_cmd curl
  local suffix archive_name url tmp_dir archive_path
  suffix="$(detect_platform_suffix)" || return 1
  archive_name="$(release_archive_name "${suffix}")" || return 1

  if [[ "${XHS_VERSION}" == "latest" ]]; then
    url="https://github.com/xpzouying/xiaohongshu-mcp/releases/latest/download/${archive_name}"
  else
    url="https://github.com/xpzouying/xiaohongshu-mcp/releases/download/${XHS_VERSION}/${archive_name}"
  fi

  tmp_dir="$(mktemp -d)"
  archive_path="${tmp_dir}/${archive_name}"
  log "downloading ${url}"
  curl -fL "${url}" -o "${archive_path}"

  ensure_install_dir
  case "${archive_name}" in
    *.tar.gz)
      require_cmd tar
      tar -xzf "${archive_path}" -C "${XHS_INSTALL_DIR}"
      ;;
    *.zip)
      require_cmd unzip
      unzip -o "${archive_path}" -d "${XHS_INSTALL_DIR}" >/dev/null
      ;;
    *)
      rm -rf "${tmp_dir}"
      fail "unsupported archive type: ${archive_name}"
      ;;
  esac

  rm -rf "${tmp_dir}"
}

build_from_source() {
  require_cmd git
  require_cmd go

  local repo_dir
  repo_dir="${XHS_RUNTIME_DIR}/xiaohongshu-mcp"
  mkdir -p "${XHS_RUNTIME_DIR}"

  if [[ -d "${repo_dir}/.git" ]]; then
    log "updating source repo in ${repo_dir}"
    git -C "${repo_dir}" fetch --tags origin
    if [[ "${XHS_VERSION}" == "latest" ]]; then
      git -C "${repo_dir}" checkout origin/main
    else
      git -C "${repo_dir}" checkout "${XHS_VERSION}"
    fi
  else
    log "cloning source repo from ${XHS_GIT_REPO}"
    git clone --depth 1 "${XHS_GIT_REPO}" "${repo_dir}"
    if [[ "${XHS_VERSION}" != "latest" ]]; then
      git -C "${repo_dir}" fetch --tags origin
      git -C "${repo_dir}" checkout "${XHS_VERSION}"
    fi
  fi

  ensure_install_dir
  local server_out login_out exe_suffix=""
  case "$(uname -s | tr '[:upper:]' '[:lower:]')" in
    msys*|mingw*|cygwin*) exe_suffix=".exe" ;;
  esac
  server_out="${XHS_INSTALL_DIR}/xiaohongshu-mcp-$(detect_platform_suffix)${exe_suffix}"
  login_out="${XHS_INSTALL_DIR}/xiaohongshu-login-$(detect_platform_suffix)${exe_suffix}"

  log "building server binary"
  (cd "${repo_dir}" && go build -o "${server_out}" .)
  log "building login binary"
  (cd "${repo_dir}" && go build -o "${login_out}" ./cmd/login)
}

bootstrap_install() {
  log "binaries not found; attempting install"
  if download_latest_release; then
    log "installed binaries from GitHub Releases into ${XHS_INSTALL_DIR}"
    return 0
  fi

  log "release download failed; falling back to source build"
  build_from_source
  log "built binaries from source into ${XHS_INSTALL_DIR}"
}

resolve_bins() {
  local skill_dir="${XHS_SKILL_DIR:-${SKILL_DIR}}"
  local bundled_dir="${skill_dir}/bin"
  local login_from_path=""
  local server_from_path=""

  if command -v xiaohongshu-login-darwin-arm64 >/dev/null 2>&1; then
    login_from_path="$(command -v xiaohongshu-login-darwin-arm64)"
  fi
  if command -v xiaohongshu-mcp-darwin-arm64 >/dev/null 2>&1; then
    server_from_path="$(command -v xiaohongshu-mcp-darwin-arm64)"
  fi

  local login_candidates=(
    "${bundled_dir}/xiaohongshu-login-darwin-arm64"
    "${bundled_dir}/xiaohongshu-login-darwin-amd64"
    "${bundled_dir}/xiaohongshu-login-linux-amd64"
    "${bundled_dir}/xiaohongshu-login-windows-amd64.exe"
    "${XHS_MCP_DIR:+${XHS_MCP_DIR}/xiaohongshu-login-darwin-arm64}"
    "${XHS_MCP_DIR:+${XHS_MCP_DIR}/xiaohongshu-login-darwin-amd64}"
    "${XHS_MCP_DIR:+${XHS_MCP_DIR}/xiaohongshu-login-linux-amd64}"
    "${XHS_MCP_DIR:+${XHS_MCP_DIR}/xiaohongshu-login-windows-amd64.exe}"
    "${login_from_path}"
    "${DEFAULT_XHS_MCP_DIR}/xiaohongshu-login-darwin-arm64"
  )
  local server_candidates=(
    "${bundled_dir}/xiaohongshu-mcp-darwin-arm64"
    "${bundled_dir}/xiaohongshu-mcp-darwin-amd64"
    "${bundled_dir}/xiaohongshu-mcp-linux-amd64"
    "${bundled_dir}/xiaohongshu-mcp-windows-amd64.exe"
    "${XHS_MCP_DIR:+${XHS_MCP_DIR}/xiaohongshu-mcp-darwin-arm64}"
    "${XHS_MCP_DIR:+${XHS_MCP_DIR}/xiaohongshu-mcp-darwin-amd64}"
    "${XHS_MCP_DIR:+${XHS_MCP_DIR}/xiaohongshu-mcp-linux-amd64}"
    "${XHS_MCP_DIR:+${XHS_MCP_DIR}/xiaohongshu-mcp-windows-amd64.exe}"
    "${server_from_path}"
    "${DEFAULT_XHS_MCP_DIR}/xiaohongshu-mcp-darwin-arm64"
  )

  if [[ -z "${XHS_LOGIN_BIN}" ]]; then
    XHS_LOGIN_BIN="$(
      pick_first_existing "${login_candidates[@]}"
    )" || true
  fi

  if [[ -z "${XHS_SERVER_BIN}" ]]; then
    XHS_SERVER_BIN="$(
      pick_first_existing "${server_candidates[@]}"
    )" || true
  fi

  if [[ ( -z "${XHS_LOGIN_BIN}" || -z "${XHS_SERVER_BIN}" ) && "${XHS_AUTO_INSTALL}" == "true" ]]; then
    bootstrap_install
    XHS_LOGIN_BIN="$(
      pick_first_existing "${login_candidates[@]}"
    )" || true
    XHS_SERVER_BIN="$(
      pick_first_existing "${server_candidates[@]}"
    )" || true
  fi

  [[ -n "${XHS_LOGIN_BIN}" ]] || fail "login binary not found; set XHS_LOGIN_BIN or XHS_MCP_DIR, put binaries in ${bundled_dir}, or run: $0 install"
  [[ -n "${XHS_SERVER_BIN}" ]] || fail "server binary not found; set XHS_SERVER_BIN or XHS_MCP_DIR, put binaries in ${bundled_dir}, or run: $0 install"
}

status() {
  if command -v curl >/dev/null 2>&1; then
    curl --silent --show-error --fail "http://127.0.0.1:${XHS_MCP_PORT}/health"
    echo
  else
    fail "curl is required for status checks"
  fi
}

run_login() {
  local browser_bin
  if browser_bin="$(find_browser)"; then
    exec "${XHS_LOGIN_BIN}" -bin "${browser_bin}"
  fi

  echo "[xhs-skill] no supported browser found; starting login without -bin override" >&2
  exec "${XHS_LOGIN_BIN}"
}

run_server() {
  local args=("-port" ":${XHS_MCP_PORT}")
  if [[ "${XHS_MCP_HEADLESS}" == "false" ]]; then
    args+=("-headless=false")
  fi

  local browser_bin
  if browser_bin="$(find_browser)"; then
    args+=("-bin" "${browser_bin}")
  fi

  exec "${XHS_SERVER_BIN}" "${args[@]}"
}

run_install() {
  bootstrap_install
  resolve_bins
  echo "XHS_LOGIN_BIN=${XHS_LOGIN_BIN}"
  echo "XHS_SERVER_BIN=${XHS_SERVER_BIN}"
}

main() {
  local cmd="${1:-}"
  case "${cmd}" in
    install)
      run_install
      ;;
    login)
      resolve_bins
      run_login
      ;;
    server)
      resolve_bins
      run_server
      ;;
    status)
      status
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
