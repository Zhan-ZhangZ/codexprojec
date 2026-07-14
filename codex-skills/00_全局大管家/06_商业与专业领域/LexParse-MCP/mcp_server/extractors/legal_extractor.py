"""Claude-backed extraction service with heuristic fallbacks."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable, Literal

import structlog
from anthropic import Anthropic
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from pydantic import BaseModel, Field

from config import get_settings
from mcp_server.extractors.schemas import (
    CommonFields,
    CompareDocVersionsResult,
    ComplaintSchema,
    ContractClause,
    ContractSchema,
    DocumentType,
    EvidenceRecord,
    GenericEntity,
    GenericLegalSchema,
    JudgmentOutcome,
    JudgmentSchema,
    Jurisdiction,
    LegalBasis,
    LegalDocumentSchema,
    Party,
    RiskAnalysisResult,
    RiskItem,
    RiskLevel,
    VersionDifference,
)
from mcp_server.parsers.base import ParsedDocument, get_extension, parse_plain_text
from mcp_server.parsers.docx_parser import DOCXParser
from mcp_server.parsers.pdf_parser import PDFParser

logger = structlog.get_logger(__name__)

CASE_NUMBER_RE = re.compile(r"[（(]\d{4}[）)][^\n]{0,30}?号")
MONEY_RE = re.compile(r"([0-9][0-9,]*(?:\.\d+)?)\s*(元|港元|人民币|HKD|RMB)")
ARTICLE_RE = re.compile(r"(《[^》]+》[^。\n]{0,40}?(?:第[一二三四五六七八九十百零0-9条款项之（）()]+))")
DATE_RE = re.compile(r"(\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?)")
ROLE_RE = re.compile(
    r"^(原告|被告|上诉人|被上诉人|申请人|被申请人|再审申请人|被执行人|执行申请人|甲方|乙方|丙方|买方|卖方|许可方|被许可方|出租方|承租方)[：:\s]*(.+)$"
)
SECTION_HEADING_RE = re.compile(
    r"^(第[一二三四五六七八九十百零0-9]+条.*|[0-9]+(?:\.[0-9]+)*[^\n]{0,40}|[一二三四五六七八九十]+、.*)$",
    re.MULTILINE,
)


class DocTypeDecision(BaseModel):
    """Internal schema for document type routing."""

    document_type: Literal["judgment", "contract", "complaint", "generic"]
    confidence: float = Field(..., ge=0, le=100)
    explanation: str


class LegalExtractionService:
    """Service layer shared by MCP tools and local test scripts."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.pdf_parser = PDFParser()
        self.docx_parser = DOCXParser()
        self._client: Anthropic | None = None

    @property
    def client(self) -> Anthropic | None:
        """Lazily construct Anthropic client when an API key is configured."""

        if self._client is None and self.settings.anthropic_api_key:
            self._client = Anthropic(api_key=self.settings.anthropic_api_key)
        return self._client

    def extract_legal_structure(
        self,
        document_content: str | bytes,
        file_name: str,
        doc_type: Literal["judgment", "contract", "complaint", "auto"] = "auto",
        jurisdiction: Jurisdiction = "CN",
    ) -> LegalDocumentSchema:
        """Extract a structured legal schema from text, PDF, or DOCX input."""

        decrypted_content = self._maybe_decrypt(document_content)
        parsed_document = self._parse_document(decrypted_content, file_name=file_name)
        resolved_doc_type = self._resolve_doc_type(
            requested_doc_type=doc_type,
            file_name=file_name,
            text=parsed_document.text,
            jurisdiction=jurisdiction,
        )

        logger.info(
            "extract.start",
            file_name=file_name,
            file_type=parsed_document.file_type,
            resolved_doc_type=resolved_doc_type,
            jurisdiction=jurisdiction,
        )

        if self.client is not None:
            try:
                return self._extract_with_llm(
                    text=parsed_document.text,
                    file_name=file_name,
                    doc_type=resolved_doc_type,
                    jurisdiction=jurisdiction,
                )
            except Exception as exc:
                logger.warning("extract.llm_failed", error=str(exc), file_name=file_name)

        return self._extract_with_heuristics(
            text=parsed_document.text,
            doc_type=resolved_doc_type,
            jurisdiction=jurisdiction,
            file_name=file_name,
        )

    def analyze_legal_risks(
        self,
        structured_document: dict[str, Any] | CommonFields | str,
        custom_risk_rules: list[str] | None = None,
        jurisdiction: Jurisdiction | None = None,
    ) -> RiskAnalysisResult:
        """Analyze legal risks from an extracted JSON payload."""

        normalized = self._normalize_structured_document(structured_document)
        resolved_jurisdiction = jurisdiction or normalized.get("jurisdiction", self.settings.default_jurisdiction)

        if self.client is not None:
            try:
                return self._analyze_risks_with_llm(
                    structured_document=normalized,
                    custom_risk_rules=custom_risk_rules or [],
                    jurisdiction=resolved_jurisdiction,
                )
            except Exception as exc:
                logger.warning("risk.llm_failed", error=str(exc), document_type=normalized.get("document_type"))

        return self._analyze_risks_with_heuristics(
            structured_document=normalized,
            custom_risk_rules=custom_risk_rules or [],
            jurisdiction=resolved_jurisdiction,
        )

    def compare_doc_versions(
        self,
        previous_document: dict[str, Any] | CommonFields | str,
        current_document: dict[str, Any] | CommonFields | str,
        jurisdiction: Jurisdiction | None = None,
    ) -> CompareDocVersionsResult:
        """Compare two structured JSON versions and produce highlighted differences."""

        previous = self._normalize_structured_document(previous_document)
        current = self._normalize_structured_document(current_document)
        resolved_jurisdiction = (
            jurisdiction
            or current.get("jurisdiction")
            or previous.get("jurisdiction")
            or self.settings.default_jurisdiction
        )
        resolved_doc_type = current.get("document_type") or previous.get("document_type") or "generic"

        flat_previous = self._flatten_structure(previous)
        flat_current = self._flatten_structure(current)
        differences: list[VersionDifference] = []

        for path in sorted(set(flat_previous) | set(flat_current)):
            old_value = flat_previous.get(path)
            new_value = flat_current.get(path)
            if old_value == new_value:
                continue

            if path not in flat_previous:
                change_type: Literal["added", "removed", "modified"] = "added"
            elif path not in flat_current:
                change_type = "removed"
            else:
                change_type = "modified"

            differences.append(
                VersionDifference(
                    字段路径=path,
                    变化类型=change_type,
                    旧值=old_value,
                    新值=new_value,
                    高亮说明=self._build_diff_highlight(path, old_value, new_value, change_type),
                    影响等级=self._estimate_diff_impact(path),
                    confidence=88,
                    explanation="通过结构化字段逐项比对生成差异结果。",
                    jurisdiction=resolved_jurisdiction,
                )
            )

        summary = "未发现结构化字段差异。" if not differences else f"共发现 {len(differences)} 处结构化差异。"
        return CompareDocVersionsResult(
            document_type=resolved_doc_type,
            差异列表=differences,
            变化摘要=summary,
            confidence=92 if differences else 96,
            explanation="基于字段路径的递归比对完成版本变化汇总。",
            jurisdiction=resolved_jurisdiction,
        )

    def _parse_document(self, document_content: str | bytes, file_name: str) -> ParsedDocument:
        extension = get_extension(file_name)
        if extension == ".pdf":
            return self.pdf_parser.parse(document_content, file_name=file_name)
        if extension == ".docx":
            return self.docx_parser.parse(document_content, file_name=file_name)
        return parse_plain_text(document_content, file_name=file_name)

    def _resolve_doc_type(
        self,
        requested_doc_type: Literal["judgment", "contract", "complaint", "auto"],
        file_name: str,
        text: str,
        jurisdiction: Jurisdiction,
    ) -> DocumentType:
        if requested_doc_type != "auto":
            return requested_doc_type

        heuristic_doc_type = self._heuristic_doc_type(file_name=file_name, text=text)
        if self.client is None:
            return heuristic_doc_type

        try:
            decision = self.client.messages.parse(
                model=self.settings.haiku_model,
                max_tokens=self.settings.classification_max_tokens,
                system="请仅判断该法律文书属于 judgment、contract、complaint 或 generic 之一。",
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"文件名: {file_name}\n"
                            f"法域: {jurisdiction}\n"
                            f"启发式结果: {heuristic_doc_type}\n\n"
                            f"文书片段:\n{self._trim_text(text, self.settings.classification_char_limit)}"
                        ),
                    }
                ],
                output_format=DocTypeDecision,
            )
            if getattr(decision, "parsed_output", None):
                return decision.parsed_output.document_type
        except Exception as exc:
            logger.warning("doctype.llm_failed", error=str(exc), heuristic=heuristic_doc_type)

        return heuristic_doc_type

    def _extract_with_llm(
        self,
        text: str,
        file_name: str,
        doc_type: DocumentType,
        jurisdiction: Jurisdiction,
    ) -> LegalDocumentSchema:
        schema_model = self._schema_for_doc_type(doc_type)
        system_prompt = self._load_prompt_for_doc_type(doc_type)
        user_message = (
            f"文件名: {file_name}\n"
            f"法域: {jurisdiction}\n"
            f"文书类型: {doc_type}\n\n"
            f"请抽取以下法律文书。\n"
            f"如果某字段无法从原文确认，请返回 null、空字符串或空数组。\n\n"
            f"原文开始:\n{self._trim_text(text, self.settings.max_document_chars)}"
        )

        if hasattr(self.client.messages, "parse"):
            response = self.client.messages.parse(
                model=self.settings.sonnet_model,
                max_tokens=self.settings.extraction_max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
                output_format=schema_model,
            )
            parsed_output = getattr(response, "parsed_output", None)
            if parsed_output is not None:
                return parsed_output

        response = self.client.messages.create(
            model=self.settings.sonnet_model,
            max_tokens=self.settings.extraction_max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            format={"type": "json_schema", "schema": schema_model.model_json_schema()},
        )
        return schema_model.model_validate_json(self._extract_message_text(response))

    def _analyze_risks_with_llm(
        self,
        structured_document: dict[str, Any],
        custom_risk_rules: list[str],
        jurisdiction: Jurisdiction,
    ) -> RiskAnalysisResult:
        system_prompt = self._load_prompt("system_prompt_risk.md")
        user_message = (
            f"法域: {jurisdiction}\n"
            f"自定义规则: {json.dumps(custom_risk_rules, ensure_ascii=False)}\n\n"
            f"结构化文书 JSON:\n{json.dumps(structured_document, ensure_ascii=False, indent=2)}"
        )

        if hasattr(self.client.messages, "parse"):
            response = self.client.messages.parse(
                model=self.settings.sonnet_model,
                max_tokens=self.settings.risk_max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
                output_format=RiskAnalysisResult,
            )
            parsed_output = getattr(response, "parsed_output", None)
            if parsed_output is not None:
                return parsed_output

        response = self.client.messages.create(
            model=self.settings.sonnet_model,
            max_tokens=self.settings.risk_max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            format={"type": "json_schema", "schema": RiskAnalysisResult.model_json_schema()},
        )
        return RiskAnalysisResult.model_validate_json(self._extract_message_text(response))

    def _extract_with_heuristics(
        self,
        text: str,
        doc_type: DocumentType,
        jurisdiction: Jurisdiction,
        file_name: str,
    ) -> LegalDocumentSchema:
        if doc_type == "judgment":
            return self._fallback_judgment(text=text, jurisdiction=jurisdiction)
        if doc_type == "contract":
            return self._fallback_contract(text=text, jurisdiction=jurisdiction)
        if doc_type == "complaint":
            return self._fallback_complaint(text=text, jurisdiction=jurisdiction)
        return self._fallback_generic(text=text, jurisdiction=jurisdiction, file_name=file_name)

    def _analyze_risks_with_heuristics(
        self,
        structured_document: dict[str, Any],
        custom_risk_rules: list[str],
        jurisdiction: Jurisdiction,
    ) -> RiskAnalysisResult:
        document_type = structured_document.get("document_type", "generic")
        risks: list[RiskItem] = []

        if document_type == "contract":
            clauses = structured_document.get("条款列表", [])
            for index, clause in enumerate(clauses, start=1):
                if clause.get("风险标记"):
                    risks.append(
                        RiskItem(
                            风险点=f"合同条款风险 #{index}",
                            风险等级=clause.get("风险等级") or "medium",
                            建议=clause.get("风险原因") or "建议复核该条款并补充双方权利义务的明确表述。",
                            相关条款原文=clause.get("条款原文"),
                            关联字段=f"条款列表[{index - 1}]",
                            规则来源="built_in_clause_rule",
                            confidence=min(float(clause.get("confidence", 75)), 95),
                            explanation=clause.get("explanation", "基于合同条款中的风险关键词启发式判定。"),
                            jurisdiction=jurisdiction,
                        )
                    )
            if not structured_document.get("争议解决方式"):
                risks.append(
                    RiskItem(
                        风险点="争议解决条款缺失",
                        风险等级="high",
                        建议="建议明确约定仲裁机构或有管辖权的法院，以及适用法律。",
                        相关条款原文=None,
                        关联字段="争议解决方式",
                        规则来源="built_in_dispute_rule",
                        confidence=90,
                        explanation="合同中未识别到明确的争议解决方式字段。",
                        jurisdiction=jurisdiction,
                    )
                )

        if document_type == "complaint" and structured_document.get("诉讼请求"):
            if len(structured_document["诉讼请求"]) >= 3:
                risks.append(
                    RiskItem(
                        风险点="诉讼请求较多",
                        风险等级="medium",
                        建议="建议按主张基础逐项核对应诉证据和法律依据，避免请求之间冲突。",
                        相关条款原文="；".join(structured_document["诉讼请求"][:3]),
                        关联字段="诉讼请求",
                        规则来源="built_in_complaint_rule",
                        confidence=84,
                        explanation="诉讼请求数量较多，潜在增加举证和抗辩复杂度。",
                        jurisdiction=jurisdiction,
                    )
                )

        if document_type == "judgment":
            outcomes = structured_document.get("判决结果", [])
            if outcomes:
                first_outcome = outcomes[0]
                risks.append(
                    RiskItem(
                        风险点="判决执行风险",
                        风险等级="medium",
                        建议="建议结合判决结果、履行期限和财产线索评估执行可行性。",
                        相关条款原文=first_outcome.get("原文引用"),
                        关联字段="判决结果[0]",
                        规则来源="built_in_enforcement_rule",
                        confidence=78,
                        explanation="判决书已形成明确裁判结果，后续可能进入履行或执行阶段。",
                        jurisdiction=jurisdiction,
                    )
                )

        flattened_text = json.dumps(structured_document, ensure_ascii=False)
        for rule in custom_risk_rules:
            if rule and any(keyword in flattened_text for keyword in rule.split()):
                risks.append(
                    RiskItem(
                        风险点=f"自定义规则命中: {rule[:30]}",
                        风险等级="medium",
                        建议="建议根据该自定义规则进一步人工复核原文与结构化字段。",
                        相关条款原文=None,
                        关联字段=None,
                        规则来源="custom_rule",
                        confidence=72,
                        explanation="输入的自定义规则关键词与结构化文书内容存在重合。",
                        jurisdiction=jurisdiction,
                    )
                )

        conclusion = "未识别到明显高风险项，建议结合原文继续复核。" if not risks else f"共识别出 {len(risks)} 个潜在风险点。"
        return RiskAnalysisResult(
            document_type=document_type,
            风险列表=risks,
            总体结论=conclusion,
            confidence=86 if risks else 91,
            explanation="基于结构化字段与内置风险规则进行启发式分析。",
            jurisdiction=jurisdiction,
        )

    def _fallback_judgment(self, text: str, jurisdiction: Jurisdiction) -> JudgmentSchema:
        facts = self._extract_section(text, ["事实", "查明", "案件事实", "法院查明"], default=self._safe_excerpt(text, 1200))
        outcomes = self._extract_judgment_outcomes(text, jurisdiction)

        return JudgmentSchema(
            案号=self._first_match(CASE_NUMBER_RE, text),
            法院名称=self._extract_court_name(text),
            案由=self._extract_case_cause(text),
            审理程序=self._extract_trial_procedure(text),
            裁判日期=self._last_match(DATE_RE, text),
            当事人列表=self._extract_parties(text, jurisdiction),
            事实经过=facts,
            法律依据=self._extract_legal_bases(text, jurisdiction),
            判决结果=outcomes,
            诉讼费=self._extract_litigation_fee(text),
            原文引用=self._collect_excerpts(text, ["判决如下", "依照", "诉讼费"]),
            confidence=76,
            explanation="未调用 Claude，使用正则和段落标题进行启发式抽取。",
            jurisdiction=jurisdiction,
        )

    def _fallback_contract(self, text: str, jurisdiction: Jurisdiction) -> ContractSchema:
        clauses = self._extract_contract_clauses(text, jurisdiction)
        return ContractSchema(
            合同名称=self._extract_contract_title(text),
            当事人列表=self._extract_parties(text, jurisdiction),
            条款列表=clauses,
            签署日期=self._first_match(DATE_RE, text),
            生效日期=self._extract_effective_date(text),
            终止条件=self._extract_section(text, ["终止", "解除", "Termination"], default=None),
            争议解决方式=self._extract_section(text, ["争议解决", "争议处理", "管辖", "仲裁"], default=None),
            风险摘要=self._build_contract_risk_summary(clauses),
            原文引用=self._collect_excerpts(text, ["甲方", "乙方", "争议解决", "违约责任"]),
            confidence=78,
            explanation="未调用 Claude，使用条款标题、角色标记和风险关键词完成合同抽取。",
            jurisdiction=jurisdiction,
        )

    def _fallback_complaint(self, text: str, jurisdiction: Jurisdiction) -> ComplaintSchema:
        parties = self._extract_parties(text, jurisdiction)
        plaintiffs = [party for party in parties if party.角色 in {"原告", "申请人", "上诉人"}]
        defendants = [party for party in parties if party.角色 in {"被告", "被申请人", "被上诉人"}]
        return ComplaintSchema(
            标题=self._first_nonempty_line(text),
            案由=self._extract_case_cause(text),
            原告=plaintiffs,
            被告=defendants,
            诉讼请求=self._extract_claims(text),
            事实与理由=self._extract_section(text, ["事实与理由", "事实和理由", "事实依据"], default=self._safe_excerpt(text, 1000)),
            证据清单=self._extract_evidence_records(text, jurisdiction),
            法律依据=self._extract_legal_bases(text, jurisdiction),
            原文引用=self._collect_excerpts(text, ["诉讼请求", "事实与理由", "证据"]),
            confidence=75,
            explanation="未调用 Claude，使用标题分段与诉讼角色关键词完成起诉状抽取。",
            jurisdiction=jurisdiction,
        )

    def _fallback_generic(self, text: str, jurisdiction: Jurisdiction, file_name: str) -> GenericLegalSchema:
        entities = []
        for party in self._extract_parties(text, jurisdiction)[:5]:
            entities.append(
                GenericEntity(
                    实体名称=party.名称,
                    实体类型=party.角色,
                    原文引用=party.备注,
                    confidence=party.confidence,
                    explanation=party.explanation,
                    jurisdiction=jurisdiction,
                )
            )

        return GenericLegalSchema(
            标题=self._first_nonempty_line(text) or file_name,
            摘要=self._safe_excerpt(text, 1000),
            关键实体=entities,
            原文引用=self._collect_excerpts(text, ["法院", "合同", "诉讼请求", "事实"]),
            confidence=68,
            explanation="未能稳定识别文书类型，返回通用法律文书结构。",
            jurisdiction=jurisdiction,
        )

    def _extract_parties(self, text: str, jurisdiction: Jurisdiction) -> list[Party]:
        parties: list[Party] = []
        seen: set[tuple[str, str]] = set()
        for raw_line in text.splitlines():
            line = raw_line.strip()
            match = ROLE_RE.match(line)
            if not match:
                continue
            role = match.group(1)
            details = match.group(2).strip()
            name = re.split(r"[，。,；;（( ]", details, maxsplit=1)[0].strip() or details[:20]
            key = (role, name)
            if key in seen:
                continue
            seen.add(key)
            parties.append(
                Party(
                    名称=name,
                    角色=role,
                    地址=self._extract_inline_value(details, ["住址", "住所", "地址"]),
                    法定代表人=self._extract_inline_value(details, ["法定代表人", "负责人"]),
                    代理律师=self._extract_inline_lawyers(details),
                    备注=details,
                    confidence=78,
                    explanation=f"根据行首角色标记“{role}”抽取当事人信息。",
                    jurisdiction=jurisdiction,
                )
            )
        return parties

    def _extract_legal_bases(self, text: str, jurisdiction: Jurisdiction) -> list[LegalBasis]:
        bases: list[LegalBasis] = []
        seen: set[str] = set()
        for match in ARTICLE_RE.finditer(text):
            citation = match.group(1).strip()
            if citation in seen:
                continue
            seen.add(citation)
            law_name = citation.split("》", maxsplit=1)[0] + "》"
            article = citation.replace(law_name, "", 1).strip() or None
            bases.append(
                LegalBasis(
                    法律名称=law_name,
                    条文=article,
                    适用说明="依据文书中明确援引的法律条文抽取。",
                    原文引用=citation,
                    confidence=83,
                    explanation="通过法条引用正则匹配提取法律依据。",
                    jurisdiction=jurisdiction,
                )
            )
        return bases

    def _extract_judgment_outcomes(self, text: str, jurisdiction: Jurisdiction) -> list[JudgmentOutcome]:
        section = self._extract_section(text, ["判决如下", "裁定如下", "决定如下"], default="")
        if not section:
            section = self._safe_excerpt(text, 800)

        items = []
        for line in section.splitlines():
            stripped = line.strip()
            if len(stripped) < 8:
                continue
            amount_match = MONEY_RE.search(stripped)
            items.append(
                JudgmentOutcome(
                    裁判项=stripped,
                    金额=float(amount_match.group(1).replace(",", "")) if amount_match else None,
                    币种=amount_match.group(2) if amount_match else None,
                    履行期限=self._extract_inline_value(stripped, ["十日内", "十五日内", "三十日内", "期限"]),
                    原文引用=stripped,
                    confidence=74,
                    explanation="根据裁判结果段落逐行拆分判决项。",
                    jurisdiction=jurisdiction,
                )
            )
            if len(items) >= 6:
                break
        return items

    def _extract_contract_clauses(self, text: str, jurisdiction: Jurisdiction) -> list[ContractClause]:
        matches = list(SECTION_HEADING_RE.finditer(text))
        clauses: list[ContractClause] = []
        if not matches:
            paragraph = self._safe_excerpt(text, 1200)
            return [
                ContractClause(
                    条款标题="合同正文",
                    条款编号=None,
                    条款原文=paragraph,
                    风险标记=self._is_clause_risky(paragraph),
                    风险等级=self._assess_clause_risk_level(paragraph),
                    风险原因=self._explain_clause_risk(paragraph),
                    confidence=70,
                    explanation="未识别到明确条款标题，使用正文摘要作为单条款兜底。",
                    jurisdiction=jurisdiction,
                )
            ]

        positions = [match.start() for match in matches] + [len(text)]
        for index, match in enumerate(matches):
            start = positions[index]
            end = positions[index + 1]
            heading = match.group(0).strip()
            clause_text = text[start:end].strip()
            clause_number = heading.split()[0] if " " in heading else heading.split("条")[0] + ("条" if "条" in heading else "")
            clauses.append(
                ContractClause(
                    条款标题=heading[:80],
                    条款编号=clause_number[:30] if clause_number else None,
                    条款原文=clause_text[:2000],
                    风险标记=self._is_clause_risky(clause_text),
                    风险等级=self._assess_clause_risk_level(clause_text),
                    风险原因=self._explain_clause_risk(clause_text),
                    confidence=79,
                    explanation="根据条款标题模式拆分合同正文。",
                    jurisdiction=jurisdiction,
                )
            )
            if len(clauses) >= 30:
                break
        return clauses

    def _extract_claims(self, text: str) -> list[str]:
        section = self._extract_section(text, ["诉讼请求", "请求事项", "Claims"], default="")
        if not section:
            return []

        claims: list[str] = []
        for line in section.splitlines():
            cleaned = line.strip()
            if re.match(r"^[0-9一二三四五六七八九十]+[、.．)]", cleaned):
                claims.append(cleaned)
        return claims or [line.strip() for line in section.splitlines() if line.strip()][:5]

    def _extract_evidence_records(self, text: str, jurisdiction: Jurisdiction) -> list[EvidenceRecord]:
        section = self._extract_section(text, ["证据", "证据清单", "附件"], default="")
        if not section:
            return []

        records: list[EvidenceRecord] = []
        for line in section.splitlines():
            cleaned = line.strip()
            if len(cleaned) < 4:
                continue
            records.append(
                EvidenceRecord(
                    证据名称=cleaned[:80],
                    证明目的=None,
                    原文引用=cleaned,
                    confidence=73,
                    explanation="从证据相关段落逐行抽取证据项。",
                    jurisdiction=jurisdiction,
                )
            )
            if len(records) >= 10:
                break
        return records

    def _heuristic_doc_type(self, file_name: str, text: str) -> DocumentType:
        sample = f"{file_name}\n{self._trim_text(text, 5000)}"
        scores = {"judgment": 0, "contract": 0, "complaint": 0, "generic": 0}

        judgment_keywords = ["判决书", "裁定书", "判决如下", "法院查明", "审判员", "诉讼费"]
        contract_keywords = ["合同", "协议", "甲方", "乙方", "违约责任", "争议解决"]
        complaint_keywords = ["起诉状", "诉讼请求", "事实与理由", "原告", "被告", "证据清单"]

        for keyword in judgment_keywords:
            if keyword in sample:
                scores["judgment"] += 2
        for keyword in contract_keywords:
            if keyword in sample:
                scores["contract"] += 2
        for keyword in complaint_keywords:
            if keyword in sample:
                scores["complaint"] += 2

        if CASE_NUMBER_RE.search(sample):
            scores["judgment"] += 2
        if "Clause" in sample or "Party A" in sample or "Party B" in sample:
            scores["contract"] += 1

        best = max(scores.items(), key=lambda item: item[1])
        return best[0] if best[1] > 0 else "generic"

    def _normalize_structured_document(self, structured_document: dict[str, Any] | CommonFields | str) -> dict[str, Any]:
        if isinstance(structured_document, CommonFields):
            return structured_document.model_dump()
        if isinstance(structured_document, dict):
            return structured_document
        return json.loads(structured_document)

    def _schema_for_doc_type(self, doc_type: DocumentType) -> type[LegalDocumentSchema]:
        if doc_type == "judgment":
            return JudgmentSchema
        if doc_type == "contract":
            return ContractSchema
        if doc_type == "complaint":
            return ComplaintSchema
        return GenericLegalSchema

    def _extract_message_text(self, response: Any) -> str:
        content = getattr(response, "content", [])
        texts = [block.text for block in content if getattr(block, "type", "") == "text"]
        return "\n".join(texts).strip()

    def _maybe_decrypt(self, document_content: str | bytes) -> str | bytes:
        if not isinstance(document_content, str):
            return document_content
        if not self.settings.aes_key:
            return document_content
        try:
            payload = json.loads(document_content)
        except json.JSONDecodeError:
            return document_content

        if payload.get("encryption") != "AESGCM":
            return document_content

        nonce = self._b64decode(payload["nonce"])
        ciphertext = self._b64decode(payload["ciphertext"])
        plaintext = AESGCM(self.settings.aes_key).decrypt(nonce, ciphertext, None)
        return plaintext

    def _flatten_structure(self, value: Any, prefix: str = "") -> dict[str, Any]:
        flattened: dict[str, Any] = {}
        if isinstance(value, dict):
            for key, item in value.items():
                next_prefix = f"{prefix}.{key}" if prefix else str(key)
                flattened.update(self._flatten_structure(item, next_prefix))
            return flattened
        if isinstance(value, list):
            if not value:
                flattened[prefix] = []
                return flattened
            for index, item in enumerate(value):
                next_prefix = f"{prefix}[{index}]"
                flattened.update(self._flatten_structure(item, next_prefix))
            return flattened

        flattened[prefix] = value
        return flattened

    def _build_diff_highlight(self, path: str, old_value: Any, new_value: Any, change_type: str) -> str:
        if change_type == "added":
            return f"{path} 新增为 {new_value!r}"
        if change_type == "removed":
            return f"{path} 已从 {old_value!r} 删除"
        return f"{path} 从 {old_value!r} 变更为 {new_value!r}"

    def _estimate_diff_impact(self, path: str) -> RiskLevel:
        high_keywords = ("判决结果", "诉讼请求", "争议解决方式", "风险", "法律依据")
        medium_keywords = ("当事人", "金额", "日期", "终止条件")
        if any(keyword in path for keyword in high_keywords):
            return "high"
        if any(keyword in path for keyword in medium_keywords):
            return "medium"
        return "low"

    def _extract_court_name(self, text: str) -> str | None:
        for line in text.splitlines()[:20]:
            if "法院" in line:
                return line.strip()
        return None

    def _extract_case_cause(self, text: str) -> str | None:
        for pattern in (r"案由[：:\s]*(.+)", r"案\s*由[：:\s]*(.+)"):
            match = re.search(pattern, text)
            if match:
                return match.group(1).splitlines()[0].strip()
        for keyword in ("买卖合同纠纷", "借款合同纠纷", "劳动争议", "侵权责任纠纷"):
            if keyword in text:
                return keyword
        return None

    def _extract_trial_procedure(self, text: str) -> str | None:
        for keyword in ("一审", "二审", "再审", "简易程序", "普通程序"):
            if keyword in text:
                return keyword
        return None

    def _extract_litigation_fee(self, text: str) -> str | None:
        match = re.search(r"诉讼费[^。\n]*", text)
        return match.group(0).strip() if match else None

    def _extract_contract_title(self, text: str) -> str | None:
        first_line = self._first_nonempty_line(text)
        if first_line and any(keyword in first_line for keyword in ("合同", "协议", "Agreement")):
            return first_line
        for line in text.splitlines()[:10]:
            if "合同" in line or "协议" in line:
                return line.strip()
        return first_line

    def _extract_effective_date(self, text: str) -> str | None:
        for pattern in (r"生效日期[：:\s]*(.+)", r"自(.+?)起生效"):
            match = re.search(pattern, text)
            if match:
                return match.group(1).splitlines()[0].strip()
        return None

    def _build_contract_risk_summary(self, clauses: Iterable[ContractClause]) -> str | None:
        risky_clauses = [clause for clause in clauses if clause.风险标记]
        if not risky_clauses:
            return "未识别到显著高风险条款。"
        levels = ", ".join(filter(None, [clause.风险等级 for clause in risky_clauses[:5]]))
        return f"共识别到 {len(risky_clauses)} 个风险条款，主要风险等级包括: {levels or 'medium'}。"

    def _extract_section(self, text: str, headings: list[str], default: str | None) -> str | None:
        lines = text.splitlines()
        stop_markers = ["判决如下", "诉讼费", "法律依据", "争议解决", "证据", "此致", "敬礼", "审判长", "书记员"]
        for index, line in enumerate(lines):
            if any(heading in line for heading in headings):
                collected: list[str] = []
                for candidate in lines[index + 1 :]:
                    if any(stop in candidate for stop in stop_markers) and collected:
                        break
                    collected.append(candidate)
                section = "\n".join(collected).strip()
                if section:
                    return section[:2000]
        return default

    def _collect_excerpts(self, text: str, keywords: list[str]) -> list[str]:
        excerpts: list[str] = []
        for line in text.splitlines():
            cleaned = line.strip()
            if not cleaned:
                continue
            if any(keyword in cleaned for keyword in keywords):
                excerpts.append(cleaned[:200])
            if len(excerpts) >= 5:
                break
        return excerpts

    def _first_match(self, pattern: re.Pattern[str], text: str) -> str | None:
        match = pattern.search(text)
        return match.group(0).strip() if match else None

    def _last_match(self, pattern: re.Pattern[str], text: str) -> str | None:
        matches = list(pattern.finditer(text))
        return matches[-1].group(1).strip() if matches else None

    def _first_nonempty_line(self, text: str) -> str | None:
        for line in text.splitlines():
            cleaned = line.strip()
            if cleaned:
                return cleaned[:120]
        return None

    def _trim_text(self, text: str, limit: int) -> str:
        return text if len(text) <= limit else text[:limit] + "\n\n[内容已截断]"

    def _safe_excerpt(self, text: str, limit: int) -> str:
        excerpt = self._trim_text(text.strip(), limit)
        return excerpt or "原文内容为空。"

    def _extract_inline_value(self, text: str, keywords: list[str]) -> str | None:
        for keyword in keywords:
            match = re.search(rf"{re.escape(keyword)}[：:\s]*([^，。；;\n]+)", text)
            if match:
                return match.group(1).strip()
            if keyword in text:
                return keyword
        return None

    def _extract_inline_lawyers(self, text: str) -> list[str]:
        lawyers = re.findall(r"(?:代理律师|委托诉讼代理人)[：:\s]*([^，。；;\n]+)", text)
        return [lawyer.strip() for lawyer in lawyers if lawyer.strip()]

    def _is_clause_risky(self, clause_text: str) -> bool:
        risk_keywords = ["免责", "单方", "最终解释权", "自动续约", "不承担责任", "全部损失", "立即解除"]
        return any(keyword in clause_text for keyword in risk_keywords)

    def _assess_clause_risk_level(self, clause_text: str) -> RiskLevel | None:
        if any(keyword in clause_text for keyword in ["最终解释权", "全部损失", "单方解除"]):
            return "high"
        if any(keyword in clause_text for keyword in ["自动续约", "免责", "立即解除"]):
            return "medium"
        return None

    def _explain_clause_risk(self, clause_text: str) -> str | None:
        if not self._is_clause_risky(clause_text):
            return None
        if "最终解释权" in clause_text:
            return "条款包含单方最终解释权表述，可能导致权利义务失衡。"
        if "自动续约" in clause_text:
            return "条款包含自动续约安排，建议增加明确通知和退出机制。"
        if "免责" in clause_text or "不承担责任" in clause_text:
            return "条款包含免责或责任限制内容，建议核查其合法性与适用范围。"
        return "条款中出现潜在不公平或高约束性关键词，建议重点复核。"

    @staticmethod
    def _b64decode(value: str) -> bytes:
        import base64

        return base64.b64decode(value)

    @staticmethod
    @lru_cache(maxsize=8)
    def _load_prompt(file_name: str) -> str:
        prompt_path = Path(__file__).resolve().parent.parent / "prompts" / file_name
        return prompt_path.read_text(encoding="utf-8")

    def _load_prompt_for_doc_type(self, doc_type: DocumentType) -> str:
        mapping = {
            "judgment": "system_prompt_judgment.md",
            "contract": "system_prompt_contract.md",
            "complaint": "system_prompt_complaint.md",
            "generic": "system_prompt_contract.md",
        }
        return self._load_prompt(mapping[doc_type])
