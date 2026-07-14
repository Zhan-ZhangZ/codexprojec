"""PDF parser backed by PyMuPDF with pdfplumber fallback."""

from __future__ import annotations

import io

import fitz
import pdfplumber

from mcp_server.parsers.base import BaseParser, ParsedDocument, ensure_bytes, normalize_text


class PDFParser(BaseParser):
    """Parse PDF files into normalized text."""

    supported_extensions = (".pdf",)

    def parse(self, document_content: str | bytes, file_name: str) -> ParsedDocument:
        pdf_bytes = ensure_bytes(document_content, file_name=file_name)

        fitz_text, page_count = self._extract_with_fitz(pdf_bytes)
        plumber_text = self._extract_with_pdfplumber(pdf_bytes)

        primary_text = fitz_text if len(fitz_text) >= len(plumber_text) else plumber_text
        fallback_used = primary_text == plumber_text and len(plumber_text) > len(fitz_text)

        return ParsedDocument(
            file_name=file_name,
            file_type=".pdf",
            text=normalize_text(primary_text),
            metadata={
                "parser": "pdf",
                "page_count": page_count,
                "fitz_chars": len(fitz_text),
                "pdfplumber_chars": len(plumber_text),
                "fallback_used": fallback_used,
            },
        )

    @staticmethod
    def _extract_with_fitz(pdf_bytes: bytes) -> tuple[str, int]:
        pages: list[str] = []
        with fitz.open(stream=pdf_bytes, filetype="pdf") as pdf_document:
            page_count = pdf_document.page_count
            for index, page in enumerate(pdf_document, start=1):
                page_text = page.get_text("text").strip()
                if page_text:
                    pages.append(f"[第{index}页]\n{page_text}")

        return "\n\n".join(pages), page_count

    @staticmethod
    def _extract_with_pdfplumber(pdf_bytes: bytes) -> str:
        pages: list[str] = []
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf_document:
            for index, page in enumerate(pdf_document.pages, start=1):
                page_text = (page.extract_text() or "").strip()
                if page_text:
                    pages.append(f"[第{index}页]\n{page_text}")

        return "\n\n".join(pages)
