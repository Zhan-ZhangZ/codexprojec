"""Local smoke test script for LexParse MCP."""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path

from mcp_server.extractors.legal_extractor import LegalExtractionService

SAMPLE_JUDGMENT_TEXT = """
上海市浦东新区人民法院
民事判决书
（2024）沪0115民初12345号

原告：上海某科技有限公司，住所地上海市浦东新区。
被告：张三，男，住上海市徐汇区。

案由：买卖合同纠纷

本院查明：2023年5月，原告与被告签署设备采购合同。被告收到货物后未按约付款。

依照《中华人民共和国民法典》第五百七十七条之规定，判决如下：
一、被告张三于本判决生效之日起十日内支付原告货款人民币120000元；
二、被告承担本案诉讼费人民币2300元。

审判员 李四
二〇二四年六月十日
"""

SAMPLE_CONTRACT_TEXT = """
技术服务合同

甲方：上海甲公司
乙方：深圳乙公司

第一条 服务内容
乙方为甲方提供数据处理和系统维护服务。

第二条 付款安排
甲方应在验收后30日内支付全部服务费。

第三条 免责条款
乙方对任何间接损失不承担责任，并享有对本合同的最终解释权。

第四条 争议解决
因本合同引起的争议，提交上海仲裁委员会仲裁。

签署日期：2024年1月8日
生效日期：2024年1月10日
"""


def load_document(path: Path) -> str | bytes:
    if path.suffix.lower() in {".pdf", ".docx"}:
        return path.read_bytes()
    return path.read_text(encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="LexParse MCP local smoke test")
    parser.add_argument("--file", type=Path, help="Path to a local PDF, DOCX, or TXT file")
    parser.add_argument(
        "--doc-type",
        choices=["auto", "judgment", "contract", "complaint"],
        default="auto",
        help="Document type hint",
    )
    parser.add_argument("--jurisdiction", choices=["CN", "HK"], default="CN")
    parser.add_argument("--compare-demo", action="store_true", help="Also run compare_doc_versions demo")
    args = parser.parse_args()

    service = LegalExtractionService()

    if args.file:
        document_content = load_document(args.file)
        file_name = args.file.name
    else:
        document_content = SAMPLE_CONTRACT_TEXT if args.doc_type == "contract" else SAMPLE_JUDGMENT_TEXT
        file_name = "sample_contract.txt" if args.doc_type == "contract" else "sample_judgment.txt"

    structured = service.extract_legal_structure(
        document_content=document_content,
        file_name=file_name,
        doc_type=args.doc_type,
        jurisdiction=args.jurisdiction,
    )
    print("=== extract_legal_structure ===")
    print(structured.model_dump_json(indent=2))

    risks = service.analyze_legal_risks(structured)
    print("\n=== analyze_legal_risks ===")
    print(risks.model_dump_json(indent=2))

    if args.compare_demo:
        current = structured.model_dump()
        previous = copy.deepcopy(current)
        if current.get("document_type") == "contract":
            current["争议解决方式"] = "提交香港国际仲裁中心仲裁。"
        else:
            current["诉讼费"] = "本案诉讼费人民币5000元。"

        diff = service.compare_doc_versions(previous, current)
        print("\n=== compare_doc_versions ===")
        print(diff.model_dump_json(indent=2))

    print(
        "\n提示: 如果没有设置 `ANTHROPIC_API_KEY`，脚本会自动使用启发式抽取逻辑，"
        "以便本地先完成联调。"
    )


if __name__ == "__main__":
    main()
