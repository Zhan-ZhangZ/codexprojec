use crate::types::{FileSystemQueryOptions, FileSystemQueryResult};
use napi::{Error, Result, Status};
use napi_derive::napi;

/// Cross-platform filesystem traversal and metadata filtering for local tools.
///
/// Replaces the POSIX `find`/`ls` execution paths in octocode-tools-core while
/// keeping MCP response shaping in TypeScript.
#[napi(js_name = "queryFileSystem")]
pub fn query_file_system(options: FileSystemQueryOptions) -> Result<FileSystemQueryResult> {
    crate::fs_query::query_file_system_inner(options).map_err(|e| Error::new(Status::InvalidArg, e))
}
