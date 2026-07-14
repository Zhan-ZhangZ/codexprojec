#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEFAULT_VIEWER_VERCEL_BLOB_PREFIX="models"

function usage() {
  cat <<'EOF'
Usage:
  BLOB_READ_WRITE_TOKEN=<token> scripts/viewer/upload-viewer-models-catalog.sh [directory] [upload options]

Uploads the models catalog and CAD Viewer-supported assets to Vercel Blob.
The uploader excludes mechbench/, mechbench2/, 7dof_arm/, and Python source
files by default.

Environment:
  BLOB_READ_WRITE_TOKEN                     Vercel Blob read/write token.
  VIEWER_VERCEL_BLOB_READ_WRITE_TOKEN       Alternate Vercel Blob read/write token.
  VIEWER_ASSET_BACKEND                      Optional. Defaults to vercel-blob.

Blob prefix:
  models                                    Script-defined upload prefix for this branch.

Options are passed through to npm --prefix viewer run upload:blob.
If no directory is passed, models/ is uploaded.
Use --skip-existing to reuse matching remote catalog assets, and
--fetch-missing-lfs to download only the Git LFS objects needed for new or
changed uploads.
EOF
}

case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
esac

if [ -z "${BLOB_READ_WRITE_TOKEN:-}" ] && [ -z "${VIEWER_VERCEL_BLOB_READ_WRITE_TOKEN:-}" ]; then
  echo "Set BLOB_READ_WRITE_TOKEN or VIEWER_VERCEL_BLOB_READ_WRITE_TOKEN before uploading to Vercel Blob." >&2
  exit 1
fi

export VIEWER_ASSET_BACKEND="${VIEWER_ASSET_BACKEND:-vercel-blob}"
export VIEWER_VERCEL_BLOB_PREFIX="$DEFAULT_VIEWER_VERCEL_BLOB_PREFIX"

UPLOAD_DIR="$REPO_ROOT/models"
if [ "$#" -gt 0 ] && [[ "${1:-}" != --* ]]; then
  UPLOAD_DIR="$1"
  shift
fi

echo "Uploading viewer models catalog to Blob prefix: $VIEWER_VERCEL_BLOB_PREFIX"

npm --prefix "$REPO_ROOT/viewer" run upload:blob -- \
  "$UPLOAD_DIR" \
  "$@"
