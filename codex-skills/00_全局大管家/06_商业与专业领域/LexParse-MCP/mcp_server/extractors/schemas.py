"""Pydantic schemas for legal document extraction and analysis."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


Jurisdiction = Literal["CN", "HK"]
DocumentType = Literal["judgment", "contract", "complaint", "generic"]
RiskLevel = Literal["low", "medium", "high", "critical"]
DifferenceType = Literal["added", "removed", "modified"]


class StrictModel(BaseModel):
    """Base model with strict validation for all derived schemas."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class CommonFields(StrictModel):
    """Shared fields required by every top-level extraction schema."""

    confidence: float = Field(
        ...,
        ge=0,
        le=100,
        description="Extraction confidence score (0-100) / 提取置信度",
    )
    explanation: str = Field(
        ...,
        description="Extraction rationale with direct evidence / 提取依据说明",
    )
    jurisdiction: Jurisdiction = Field(
        ...,
        description="Applicable jurisdiction, CN for Mainland China and HK for Hong Kong / 适用法域",
    )


class EvidenceItem(CommonFields):
    """Reusable schema for nested evidence-bearing entities."""


class Party(EvidenceItem):
    """Party information extracted from a legal document."""

    名称: str = Field(..., description="Party name / party name")
    角色: str = Field(..., description="Role in the document / party role")
    地址: str | None = Field(default=None, description="Address / address")
    法定代表人: str | None = Field(default=None, description="Legal representative / legal representative")
    代理律师: list[str] = Field(default_factory=list, description="Authorized counsels / counsels")
    备注: str | None = Field(default=None, description="Additional party notes / notes")


class LegalBasis(EvidenceItem):
    """Legal basis cited in a judgment or complaint."""

    法律名称: str = Field(..., description="Statute name / law name")
    条文: str | None = Field(default=None, description="Article or provision / article")
    适用说明: str | None = Field(default=None, description="How the law is applied / application notes")
    原文引用: str | None = Field(default=None, description="Quoted source passage / cited excerpt")


class JudgmentOutcome(EvidenceItem):
    """A single judgment outcome item."""

    裁判项: str = Field(..., description="Outcome item / judgment order")
    金额: float | None = Field(default=None, description="Amount involved if any / amount")
    币种: str | None = Field(default=None, description="Currency if amount exists / currency")
    履行期限: str | None = Field(default=None, description="Compliance deadline / deadline")
    原文引用: str | None = Field(default=None, description="Quoted source passage / cited excerpt")


class ContractClause(EvidenceItem):
    """A single contract clause with risk signal."""

    条款标题: str | None = Field(default=None, description="Clause title / clause title")
    条款编号: str | None = Field(default=None, description="Clause number / clause number")
    条款原文: str = Field(..., description="Original clause text / original clause")
    风险标记: bool = Field(..., description="Whether the clause contains legal or business risk / risk flag")
    风险等级: RiskLevel | None = Field(default=None, description="Risk severity / risk level")
    风险原因: str | None = Field(default=None, description="Why this clause is risky / risk rationale")


class EvidenceRecord(EvidenceItem):
    """Evidence referenced by a complaint or litigation document."""

    证据名称: str = Field(..., description="Evidence name / evidence name")
    证明目的: str | None = Field(default=None, description="Purpose of evidence / purpose")
    原文引用: str | None = Field(default=None, description="Quoted source passage / cited excerpt")


class GenericEntity(EvidenceItem):
    """Generic named entity extracted from any legal document."""

    实体名称: str = Field(..., description="Entity name / entity name")
    实体类型: str = Field(..., description="Entity type / entity type")
    原文引用: str | None = Field(default=None, description="Quoted source passage / cited excerpt")


class JudgmentSchema(CommonFields):
    """Structured schema for judgments."""

    document_type: Literal["judgment"] = Field(
        default="judgment",
        description="Document type / 文书类型",
    )
    案号: str | None = Field(default=None, description="Case number / case number")
    法院名称: str | None = Field(default=None, description="Court name / court name")
    案由: str | None = Field(default=None, description="Cause of action / cause of action")
    审理程序: str | None = Field(default=None, description="Trial procedure / procedure")
    裁判日期: str | None = Field(default=None, description="Decision date / decision date")
    当事人列表: list[Party] = Field(default_factory=list, description="Parties / parties")
    事实经过: str = Field(..., description="Facts found by the court / facts")
    法律依据: list[LegalBasis] = Field(default_factory=list, description="Legal basis / legal basis")
    判决结果: list[JudgmentOutcome] = Field(default_factory=list, description="Judgment outcomes / outcomes")
    诉讼费: str | None = Field(default=None, description="Litigation fee / litigation fee")
    原文引用: list[str] = Field(default_factory=list, description="Source excerpts / source excerpts")


class ContractSchema(CommonFields):
    """Structured schema for contracts."""

    document_type: Literal["contract"] = Field(
        default="contract",
        description="Document type / 文书类型",
    )
    合同名称: str | None = Field(default=None, description="Contract title / contract title")
    当事人列表: list[Party] = Field(default_factory=list, description="Parties / parties")
    条款列表: list[ContractClause] = Field(default_factory=list, description="Clauses / clauses")
    签署日期: str | None = Field(default=None, description="Signing date / signing date")
    生效日期: str | None = Field(default=None, description="Effective date / effective date")
    终止条件: str | None = Field(default=None, description="Termination conditions / termination")
    争议解决方式: str | None = Field(default=None, description="Dispute resolution / dispute resolution")
    风险摘要: str | None = Field(default=None, description="Overall risk summary / risk summary")
    原文引用: list[str] = Field(default_factory=list, description="Source excerpts / source excerpts")


class ComplaintSchema(CommonFields):
    """Structured schema for complaints or statements of claim."""

    document_type: Literal["complaint"] = Field(
        default="complaint",
        description="Document type / 文书类型",
    )
    标题: str | None = Field(default=None, description="Document title / title")
    案由: str | None = Field(default=None, description="Cause of action / cause of action")
    原告: list[Party] = Field(default_factory=list, description="Plaintiffs / plaintiffs")
    被告: list[Party] = Field(default_factory=list, description="Defendants / defendants")
    诉讼请求: list[str] = Field(default_factory=list, description="Claims / claims")
    事实与理由: str = Field(..., description="Facts and reasoning / facts and reasons")
    证据清单: list[EvidenceRecord] = Field(default_factory=list, description="Evidence list / evidence")
    法律依据: list[LegalBasis] = Field(default_factory=list, description="Legal basis / legal basis")
    原文引用: list[str] = Field(default_factory=list, description="Source excerpts / source excerpts")


class GenericLegalSchema(CommonFields):
    """Fallback schema for unsupported or unknown legal documents."""

    document_type: Literal["generic"] = Field(
        default="generic",
        description="Document type / 文书类型",
    )
    标题: str | None = Field(default=None, description="Document title / title")
    摘要: str = Field(..., description="Structured summary / summary")
    关键实体: list[GenericEntity] = Field(default_factory=list, description="Key entities / key entities")
    原文引用: list[str] = Field(default_factory=list, description="Source excerpts / source excerpts")


LegalDocumentSchema = JudgmentSchema | ContractSchema | ComplaintSchema | GenericLegalSchema


class RiskItem(CommonFields):
    """Single legal risk item."""

    风险点: str = Field(..., description="Risk title / risk point")
    风险等级: RiskLevel = Field(..., description="Risk severity / risk severity")
    建议: str = Field(..., description="Mitigation suggestion / suggestion")
    相关条款原文: str | None = Field(default=None, description="Relevant clause text / relevant clause")
    关联字段: str | None = Field(default=None, description="Structured field path / field path")
    规则来源: str | None = Field(default=None, description="Custom or built-in rule source / rule source")


class RiskAnalysisResult(CommonFields):
    """Risk analysis output for structured legal documents."""

    document_type: DocumentType = Field(..., description="Document type / 文书类型")
    风险列表: list[RiskItem] = Field(default_factory=list, description="Risk items / risk list")
    总体结论: str = Field(..., description="Overall conclusion / overall conclusion")


class VersionDifference(CommonFields):
    """Difference between two structured legal documents."""

    字段路径: str = Field(..., description="Field path / field path")
    变化类型: DifferenceType = Field(..., description="Change type / change type")
    旧值: Any | None = Field(default=None, description="Previous value / old value")
    新值: Any | None = Field(default=None, description="Current value / new value")
    高亮说明: str = Field(..., description="Human readable diff highlight / highlight")
    影响等级: RiskLevel = Field(..., description="Impact level / impact level")


class CompareDocVersionsResult(CommonFields):
    """Top-level output for version comparison."""

    document_type: DocumentType = Field(..., description="Document type / 文书类型")
    差异列表: list[VersionDifference] = Field(default_factory=list, description="Differences / differences")
    变化摘要: str = Field(..., description="Overall change summary / summary")

