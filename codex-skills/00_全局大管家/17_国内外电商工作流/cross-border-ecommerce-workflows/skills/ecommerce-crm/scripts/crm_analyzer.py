#!/usr/bin/env python3
"""
电商CRM分析脚本
提供RFM分析、客户分层、LTV预测、流失预警等功能
"""

import json
from datetime import datetime, timedelta
from collections import defaultdict


def calculate_rfm(customers, reference_date=None):
    """
    RFM客户分层分析
    
    Parameters:
        customers: list of dict, 客户交易数据
            [{customer_id, order_date, order_amount, order_id}, ...]
        reference_date: datetime, 参考日期（默认今天）
    
    Returns:
        list, 含RFM评分和分层的客户列表
    """
    if reference_date is None:
        reference_date = datetime.now()
    
    # 按客户聚合数据
    customer_data = defaultdict(lambda: {'orders': [], 'total_amount': 0})
    
    for record in customers:
        cid = record['customer_id']
        customer_data[cid]['orders'].append({
            'date': record['order_date'] if isinstance(record['order_date'], datetime) else datetime.strptime(record['order_date'], '%Y-%m-%d'),
            'amount': record['order_amount']
        })
        customer_data[cid]['total_amount'] += record['order_amount']
    
    results = []
    
    for cid, data in customer_data.items():
        orders = sorted(data['orders'], key=lambda x: x['date'], reverse=True)
        
        # R: 最近购买距今天数
        last_order_date = orders[0]['date']
        recency_days = (reference_date - last_order_date).days
        
        # F: 购买频率（订单数）
        frequency = len(orders)
        
        # M: 累计消费金额
        monetary = data['total_amount']
        
        # 评分（5分制）
        r_score = 5 if recency_days <= 7 else 4 if recency_days <= 30 else 3 if recency_days <= 90 else 2 if recency_days <= 180 else 1
        f_score = 5 if frequency >= 20 else 4 if frequency >= 10 else 3 if frequency >= 5 else 2 if frequency >= 2 else 1
        m_score = 5 if monetary >= 10000 else 4 if monetary >= 5000 else 3 if monetary >= 2000 else 2 if monetary >= 500 else 1
        
        rfm_total = r_score + f_score + m_score
        
        # 分层
        if rfm_total >= 13:
            segment = '核心VIP'
            strategy = '专属服务、新品优先、生日礼'
        elif rfm_total >= 10:
            segment = '重要客户'
            strategy = '会员权益、积分加速、专属折扣'
        elif rfm_total >= 7:
            segment = '潜力客户'
            strategy = '复购激励、品类拓展、升级引导'
        elif rfm_total >= 4:
            segment = '普通客户'
            strategy = '促销触达、优惠券、活动提醒'
        else:
            segment = '沉睡/流失'
            strategy = '大额召回券、问卷调研、限时激活'
        
        results.append({
            'customer_id': cid,
            'recency_days': recency_days,
            'frequency': frequency,
            'monetary': round(monetary, 2),
            'r_score': r_score,
            'f_score': f_score,
            'm_score': m_score,
            'rfm_total': rfm_total,
            'segment': segment,
            'strategy': strategy
        })
    
    # 按RFM总分降序
    results.sort(key=lambda x: x['rfm_total'], reverse=True)
    
    return results


def calculate_ltv(customer_data, gross_margin=0.3, years=3):
    """
    计算客户生命周期价值（LTV）
    
    Parameters:
        customer_data: dict, 客户数据
            {customer_id, avg_order_value, purchase_frequency_per_year}
        gross_margin: float, 毛利率
        years: int, 预测年限
    
    Returns:
        dict, LTV计算结果
    """
    aov = customer_data.get('avg_order_value', 0)
    frequency = customer_data.get('purchase_frequency_per_year', 0)
    
    annual_value = aov * frequency
    ltv = annual_value * years * gross_margin
    
    return {
        'customer_id': customer_data.get('customer_id', 'N/A'),
        'avg_order_value': round(aov, 2),
        'annual_purchase_frequency': frequency,
        'annual_value': round(annual_value, 2),
        'predicted_ltv': round(ltv, 2),
        'gross_margin': gross_margin,
        'prediction_years': years
    }


def churn_prediction(customers, reference_date=None):
    """
    流失风险预测
    
    Parameters:
        customers: list of dict, 客户数据
        reference_date: datetime, 参考日期
    
    Returns:
        list, 流失风险分级
    """
    if reference_date is None:
        reference_date = datetime.now()
    
    risks = []
    
    for customer in customers:
        last_order = customer.get('last_order_date')
        if isinstance(last_order, str):
            last_order = datetime.strptime(last_order, '%Y-%m-%d')
        
        days_since_last = (reference_date - last_order).days
        total_orders = customer.get('total_orders', 0)
        total_spent = customer.get('total_spent', 0)
        
        # 流失风险评分
        risk_score = 0
        
        # 基于最近购买时间
        if days_since_last > 180:
            risk_score += 50
        elif days_since_last > 90:
            risk_score += 30
        elif days_since_last > 30:
            risk_score += 10
        
        # 基于历史价值（高价值客户流失风险权重更高）
        if total_spent > 5000:
            risk_score += 20
        elif total_spent > 1000:
            risk_score += 10
        
        # 基于购买频率
        if total_orders == 1:
            risk_score += 20
        
        # 风险等级
        if risk_score >= 60:
            risk_level = '高风险'
            action = '立即电话回访+大额专属券'
        elif risk_score >= 40:
            risk_level = '中风险'
            action = '发送召回券+新品推荐'
        elif risk_score >= 20:
            risk_level = '低风险'
            action = '常规关怀+积分提醒'
        else:
            risk_level = '健康'
            action = '正常维护'
        
        risks.append({
            'customer_id': customer.get('customer_id'),
            'days_since_last_order': days_since_last,
            'total_orders': total_orders,
            'total_spent': total_spent,
            'risk_score': risk_score,
            'risk_level': risk_level,
            'recommended_action': action
        })
    
    # 按风险分降序
    risks.sort(key=lambda x: x['risk_score'], reverse=True)
    
    return risks


def segment_analysis(rfm_results):
    """
    客户分层统计分析
    
    Parameters:
        rfm_results: list, RFM分析结果
    
    Returns:
        dict, 分层统计报告
    """
    segments = defaultdict(lambda: {'count': 0, 'total_value': 0, 'avg_rfm': 0})
    
    for customer in rfm_results:
        seg = customer['segment']
        segments[seg]['count'] += 1
        segments[seg]['total_value'] += customer['monetary']
        segments[seg]['avg_rfm'] += customer['rfm_total']
    
    total_customers = len(rfm_results)
    total_value = sum(c['monetary'] for c in rfm_results)
    
    report = {
        'total_customers': total_customers,
        'total_value': round(total_value, 2),
        'segments': {}
    }
    
    for seg, data in segments.items():
        count = data['count']
        report['segments'][seg] = {
            'count': count,
            'percentage': round(count / total_customers * 100, 1),
            'total_value': round(data['total_value'], 2),
            'value_percentage': round(data['total_value'] / total_value * 100, 1),
            'avg_rfm': round(data['avg_rfm'] / count, 1) if count > 0 else 0
        }
    
    return report


if __name__ == '__main__':
    print("=" * 60)
    print("电商CRM分析脚本")
    print("=" * 60)
    
    # 示例1: RFM分析
    print("\n【示例1】RFM客户分层")
    sample_customers = [
        {'customer_id': 'C001', 'order_date': '2024-01-15', 'order_amount': 500},
        {'customer_id': 'C001', 'order_date': '2024-01-20', 'order_amount': 800},
        {'customer_id': 'C001', 'order_date': '2024-02-01', 'order_amount': 1200},
        {'customer_id': 'C002', 'order_date': '2024-01-10', 'order_amount': 200},
        {'customer_id': 'C003', 'order_date': '2024-01-05', 'order_amount': 3000},
        {'customer_id': 'C003', 'order_date': '2024-01-25', 'order_amount': 5000},
        {'customer_id': 'C003', 'order_date': '2024-02-10', 'order_amount': 2000},
        {'customer_id': 'C004', 'order_date': '2023-10-01', 'order_amount': 150},
    ]
    
    # 使用固定参考日期以便复现
    ref_date = datetime(2024, 2, 15)
    rfm_results = calculate_rfm(sample_customers, reference_date=ref_date)
    
    for customer in rfm_results:
        print(f"  {customer['customer_id']}: R{customer['r_score']}F{customer['f_score']}M{customer['m_score']}="
              f"{customer['rfm_total']} → {customer['segment']}")
    
    # 示例2: 分层统计
    print("\n【示例2】客户分层统计")
    stats = segment_analysis(rfm_results)
    for seg, data in stats['segments'].items():
        print(f"  {seg}: {data['count']}人 ({data['percentage']}%) | "
              f"消费占比{data['value_percentage']}% | 平均RFM{data['avg_rfm']}")
    
    # 示例3: LTV计算
    print("\n【示例3】LTV预测")
    ltv_customer = {
        'customer_id': 'C003',
        'avg_order_value': 3333,
        'purchase_frequency_per_year': 4
    }
    ltv = calculate_ltv(ltv_customer, gross_margin=0.3, years=3)
    print(f"  客户: {ltv['customer_id']}")
    print(f"  年均消费: ¥{ltv['annual_value']}")
    print(f"  预测LTV: ¥{ltv['predicted_ltv']} (3年, 毛利率30%)")
    
    # 示例4: 流失预警
    print("\n【示例4】流失风险预警")
    churn_customers = [
        {'customer_id': 'C001', 'last_order_date': '2024-02-01', 'total_orders': 3, 'total_spent': 2500},
        {'customer_id': 'C002', 'last_order_date': '2024-01-10', 'total_orders': 1, 'total_spent': 200},
        {'customer_id': 'C004', 'last_order_date': '2023-10-01', 'total_orders': 1, 'total_spent': 150},
    ]
    
    churn_risks = churn_prediction(churn_customers, reference_date=ref_date)
    for risk in churn_risks:
        print(f"  {risk['customer_id']}: {risk['risk_level']} (得分{risk['risk_score']}) - {risk['recommended_action']}")
    
    print("\n" + "=" * 60)
    print("请 import 需要的函数使用")
    print("=" * 60)
