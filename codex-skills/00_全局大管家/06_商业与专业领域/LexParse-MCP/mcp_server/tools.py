"""Tool registration for LexParse MCP."""

from __future__ import annotations

from typing import Any, Literal

from mcp.server.fastmcp import FastMCP

from mcp_server.extractors.legal_extractor import LegalExtractionService
from mcp_server.extractors.schemas import CompareDocVersionsResult, Jurisdiction, LegalDocumentSchema, RiskAnalysisResult

_service = LegalExtractionService()


def register_tools(mcp: FastMCP) -> None:
    """Register LexParse MCP tools on a FastMCP instance."""

    @mcp.tool()
    def extract_legal_structure(
        document_content: str | bytes,
        file_name: str,
        doc_type: Literal["judgment", "contract", "complaint", "auto"] = "auto",
        jurisdiction: Jurisdiction = "CN",
    ) -> LegalDocumentSchema:
        """
        Extract structured JSON from judgment, contract, complaint, PDF, DOCX, or plain text input.
        """

        return _service.extract_legal_structure(
            document_content=document_content,
            file_name=file_name,
            doc_type=doc_type,
            jurisdiction=jurisdiction,
        )

    @mcp.tool()
    def analyze_legal_risks(
        structured_document: dict[str, Any] | str,
        custom_risk_rules: list[str] | None = None,
        jurisdiction: Jurisdiction | None = None,
    ) -> RiskAnalysisResult:
        """
        Analyze structured legal JSON and return risk items, severity, and mitigation suggestions.
        """

        return _service.analyze_legal_risks(
            structured_document=structured_document,
            custom_risk_rules=custom_risk_rules,
            jurisdiction=jurisdiction,
        )

    @mcp.tool()
    def compare_doc_versions(
        previous_document: dict[str, Any] | str,
        current_document: dict[str, Any] | str,
        jurisdiction: Jurisdiction | None = None,
    ) -> CompareDocVersionsResult:
        """
        Compare two versions of structured legal JSON and highlight changed fields.
        """

        return _service.compare_doc_versions(
            previous_document=previous_document,
            current_document=current_document,
            jurisdiction=jurisdiction,
        )
