#!/usr/bin/env python3
"""
电商采购成本计算辅助脚本
提供供应商评分、成本拆解、采购决策支持
"""

import json
from datetime import datetime


def calculate_supplier_score(scores):
    """
    计算供应商综合评分
    
    Parameters:
        scores: dict, 各维度得分 {'production': 4, 'quality': 5, ...}
    
    Returns:
        dict, 含总分、等级、建议
    """
    weights = {
        'production': 0.20,
        'quality': 0.25,
        'compliance': 0.15,
        'business': 0.20,
        'communication': 0.20
    }
    
    total = sum(scores.get(k, 0) * v for k, v in weights.items())
    
    if total >= 4.0:
        grade = 'A'
        suggestion = '战略供应商，优先合作，可谈更长账期'
    elif total >= 3.0:
        grade = 'B'
        suggestion = '合格供应商，正常合作，持续观察改进'
    elif total >= 2.0:
        grade = 'C'
        suggestion = '观察改进，限制订单量，要求整改计划'
    else:
        grade = 'D'
        suggestion = '淘汰替换，启动备选供应商切换'
    
    return {
        'total_score': round(total, 2),
        'grade': grade,
        'suggestion': suggestion,
        'details': {k: {'score': scores.get(k, 0), 'weight': v} 
                   for k, v in weights.items()}
    }


def calculate_unit_cost(direct_costs, indirect_costs, logistics_costs, quantity):
    """
    计算单件总成本
    
    Parameters:
        direct_costs: dict, 直接成本 {'material': 10, 'processing': 5, 'packaging': 2}
        indirect_costs: dict, 间接成本 {'mold': 500, 'certification': 1000}
        logistics_costs: dict, 物流成本 {'shipping': 200, 'insurance': 50}
        quantity: int, 采购数量
    
    Returns:
        dict, 成本拆解结果
    """
    direct_total = sum(direct_costs.values())
    indirect_total = sum(indirect_costs.values()) / quantity
    logistics_total = sum(logistics_costs.values()) / quantity
    
    unit_cost = direct_total + indirect_total + logistics_total
    
    return {
        'quantity': quantity,
        'unit_cost': round(unit_cost, 2),
        'direct_cost': round(direct_total, 2),
        'indirect_cost_per_unit': round(indirect_total, 2),
        'logistics_cost_per_unit': round(logistics_total, 2),
        'cost_breakdown': {
            'direct': direct_costs,
            'indirect': {k: round(v/quantity, 2) for k, v in indirect_costs.items()},
            'logistics': {k: round(v/quantity, 2) for k, v in logistics_costs.items()}
        }
    }


def calculate_moq_optimizer(target_price, costs, min_margin=0.30):
    """
    计算满足目标利润率的最小起订量建议
    
    Parameters:
        target_price: float, 目标售价
        costs: dict, 成本结构
        min_margin: float, 最低毛利率
    
    Returns:
        dict, 优化建议
    """
    direct = sum(costs.get('direct', {}).values())
    indirect_fixed = sum(costs.get('indirect', {}).values())
    logistics_fixed = sum(costs.get('logistics', {}).values())
    
    # 求解: (target_price - direct - (indirect+logistics)/Q) / target_price >= min_margin
    # => Q >= (indirect_fixed + logistics_fixed) / (target_price * (1-min_margin) - direct)
    
    denominator = target_price * (1 - min_margin) - direct
    
    if denominator <= 0:
        return {
            'feasible': False,
            'message': '目标售价过低，即使无限量也无法达到目标毛利率',
            'suggestion': '提高售价或降低直接成本'
        }
    
    min_quantity = int((indirect_fixed + logistics_fixed) / denominator) + 1
    
    # 计算建议量下的实际毛利率
    unit_cost = direct + (indirect_fixed + logistics_fixed) / min_quantity
    actual_margin = (target_price - unit_cost) / target_price
    
    return {
        'feasible': True,
        'min_quantity': min_quantity,
        'target_margin': min_margin,
        'actual_margin': round(actual_margin, 4),
        'unit_cost_at_moq': round(unit_cost, 2),
        'suggestion': f'建议首次下单≥{min_quantity}件，实际毛利率{actual_margin*100:.1f}%'
    }


def generate_po_summary(po_data):
    """
    生成采购订单摘要
    
    Parameters:
        po_data: dict, 订单信息
    
    Returns:
        str, 格式化摘要
    """
    lines = [
        f"采购订单摘要 PO-{po_data.get('po_number', 'N/A')}",
        f"供应商: {po_data.get('supplier', 'N/A')}",
        f"下单日期: {po_data.get('order_date', datetime.now().strftime('%Y-%m-%d'))}",
        f"要求交期: {po_data.get('delivery_date', 'N/A')}",
        "",
        "商品明细:",
        "-" * 60
    ]
    
    total = 0
    for item in po_data.get('items', []):
        line_total = item.get('quantity', 0) * item.get('unit_price', 0)
        total += line_total
        lines.append(
            f"  {item.get('sku', 'N/A')} | {item.get('name', 'N/A')} | "
            f"{item.get('quantity', 0)} × ¥{item.get('unit_price', 0)} = ¥{line_total}"
        )
    
    lines.extend([
        "-" * 60,
        f"订单总额: ¥{total}",
        f"付款方式: {po_data.get('payment_terms', 'N/A')}",
        f"备注: {po_data.get('remarks', '无')}"
    ])
    
    return "\n".join(lines)


if __name__ == '__main__':
    # 示例用法
    print("=" * 60)
    print("电商采购成本计算脚本")
    print("=" * 60)
    
    # 示例1: 供应商评分
    print("\n【示例1】供应商评分")
    scores = {
        'production': 4,
        'quality': 5,
        'compliance': 3,
        'business': 4,
        'communication': 4
    }
    result = calculate_supplier_score(scores)
    print(f"综合得分: {result['total_score']}")
    print(f"等级: {result['grade']}")
    print(f"建议: {result['suggestion']}")
    
    # 示例2: 单件成本计算
    print("\n【示例2】单件成本计算")
    direct = {'material': 15, 'processing': 8, 'packaging': 3}
    indirect = {'mold': 2000, 'certification': 1500}
    logistics = {'shipping': 500, 'insurance': 100}
    cost_result = calculate_unit_cost(direct, indirect, logistics, 500)
    print(f"采购数量: {cost_result['quantity']}")
    print(f"单件总成本: ¥{cost_result['unit_cost']}")
    print(f"  - 直接成本: ¥{cost_result['direct_cost']}")
    print(f"  - 间接成本/件: ¥{cost_result['indirect_cost_per_unit']}")
    print(f"  - 物流成本/件: ¥{cost_result['logistics_cost_per_unit']}")
    
    # 示例3: MOQ优化
    print("\n【示例3】MOQ优化建议")
    moq_result = calculate_moq_optimizer(
        target_price=89,
        costs={'direct': direct, 'indirect': indirect, 'logistics': logistics},
        min_margin=0.35
    )
    print(f"可行性: {'可行' if moq_result['feasible'] else '不可行'}")
    if moq_result['feasible']:
        print(f"建议最小起订量: {moq_result['min_quantity']}件")
        print(f"实际毛利率: {moq_result['actual_margin']*100:.1f}%")
        print(f"建议: {moq_result['suggestion']}")
    
    print("\n" + "=" * 60)
    print("请 import 需要的函数使用")
    print("=" * 60)
