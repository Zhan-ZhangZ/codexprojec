#!/usr/bin/env python3
"""
电商BI自动化脚本
提供数据标准化、销售预测、报表生成、指标计算等功能
"""

import json
import math
from datetime import datetime, timedelta
from collections import defaultdict


def standardize_order_data(raw_data, platform):
    """
    标准化多平台订单数据
    
    Parameters:
        raw_data: dict, 原始订单数据
        platform: str, 平台标识 (taobao/jd/amazon/douyin)
    
    Returns:
        dict, 标准化后的数据
    """
    # 字段映射表
    mappings = {
        'taobao': {
            'order_id': 'tid',
            'amount': 'payment',
            'order_time': 'created',
            'sku': 'sku_id',
            'status': 'status',
            'buyer_id': 'buyer_nick'
        },
        'jd': {
            'order_id': 'order_id',
            'amount': 'order_amount',
            'order_time': 'order_start_time',
            'sku': 'sku',
            'status': 'order_state',
            'buyer_id': 'pin'
        },
        'amazon': {
            'order_id': 'AmazonOrderId',
            'amount': 'OrderTotal',
            'order_time': 'PurchaseDate',
            'sku': 'SellerSKU',
            'status': 'OrderStatus',
            'buyer_id': 'BuyerEmail'
        },
        'douyin': {
            'order_id': 'order_id',
            'amount': 'total_amount',
            'order_time': 'create_time',
            'sku': 'sku_id',
            'status': 'logistics_status',
            'buyer_id': 'user_id'
        }
    }
    
    mapping = mappings.get(platform, {})
    
    standardized = {
        'platform': platform,
        'order_id': raw_data.get(mapping.get('order_id')),
        'amount': float(raw_data.get(mapping.get('amount'), 0)),
        'order_time': raw_data.get(mapping.get('order_time')),
        'sku': raw_data.get(mapping.get('sku')),
        'status': raw_data.get(mapping.get('status')),
        'buyer_id': raw_data.get(mapping.get('buyer_id')),
        'raw_data': raw_data  # 保留原始数据
    }
    
    return standardized


def calculate_kpi_daily(orders, date):
    """
    计算每日核心KPI
    
    Parameters:
        orders: list of dict, 订单列表
        date: str, 日期 (YYYY-MM-DD)
    
    Returns:
        dict, KPI数据
    """
    day_orders = [o for o in orders if o.get('order_time', '').startswith(date)]
    
    total_orders = len(day_orders)
    total_gmv = sum(o.get('amount', 0) for o in day_orders)
    
    # 客单价
    aov = total_gmv / total_orders if total_orders > 0 else 0
    
    # 退款订单
    refund_orders = [o for o in day_orders if o.get('status') in ['refunded', 'closed', 'cancelled']]
    refund_rate = len(refund_orders) / total_orders if total_orders > 0 else 0
    
    # 去重买家数
    unique_buyers = len(set(o.get('buyer_id') for o in day_orders))
    
    return {
        'date': date,
        'gmv': round(total_gmv, 2),
        'orders': total_orders,
        'aov': round(aov, 2),
        'unique_buyers': unique_buyers,
        'refund_rate': round(refund_rate * 100, 2),
        'avg_order_value': round(aov, 2)
    }


def exponential_smoothing_forecast(data, alpha=0.3, forecast_periods=7):
    """
    指数平滑预测
    
    Parameters:
        data: list, 历史数据 (按时间顺序)
        alpha: float, 平滑系数
        forecast_periods: int, 预测期数
    
    Returns:
        dict, 预测结果
    """
    if not data:
        return {'error': '无历史数据'}
    
    # 初始化
    smoothed = [data[0]]
    
    # 平滑计算
    for i in range(1, len(data)):
        smoothed_value = alpha * data[i] + (1 - alpha) * smoothed[i-1]
        smoothed.append(smoothed_value)
    
    # 预测未来值
    forecast = [smoothed[-1]] * forecast_periods
    
    # 计算MAPE（平均绝对百分比误差）
    errors = []
    for i in range(1, len(data)):
        if data[i-1] > 0:
            error = abs(data[i] - smoothed[i-1]) / data[i]
            errors.append(error)
    
    mape = sum(errors) / len(errors) * 100 if errors else 0
    
    return {
        'historical_data': data,
        'smoothed_values': [round(v, 2) for v in smoothed],
        'forecast_values': [round(v, 2) for v in forecast],
        'forecast_periods': forecast_periods,
        'alpha': alpha,
        'mape': round(mape, 2),
        'confidence': 'high' if mape < 10 else 'medium' if mape < 20 else 'low'
    }


def generate_daily_report(kpi_data, comparison_date=None):
    """
    生成运营日报
    
    Parameters:
        kpi_data: dict, 当日KPI数据
        comparison_date: str, 对比日期（默认昨日）
    
    Returns:
        str, 格式化日报
    """
    lines = [
        f"📊 运营日报 - {kpi_data['date']}",
        "=" * 50,
        "",
        f"💰 GMV: ¥{kpi_data['gmv']}",
        f"📦 订单量: {kpi_data['orders']}单",
        f"👥 购买用户数: {kpi_data['unique_buyers']}人",
        f"💳 客单价: ¥{kpi_data['aov']}",
        f"🔄 退款率: {kpi_data['refund_rate']}%",
        "",
        "=" * 50,
        f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    ]
    
    return "\n".join(lines)


def data_quality_check(data, required_fields):
    """
    数据质量检查
    
    Parameters:
        data: list of dict, 数据列表
        required_fields: list, 必填字段
    
    Returns:
        dict, 质量报告
    """
    total_records = len(data)
    
    if total_records == 0:
        return {'error': '无数据'}
    
    # 完整性检查
    completeness = {}
    for field in required_fields:
        non_empty = sum(1 for record in data if record.get(field) not in [None, '', 0])
        completeness[field] = {
            'non_empty': non_empty,
            'rate': round(non_empty / total_records * 100, 2)
        }
    
    # 唯一性检查
    order_ids = [r.get('order_id') for r in data if r.get('order_id')]
    unique_ids = len(set(order_ids))
    duplicate_rate = (len(order_ids) - unique_ids) / len(order_ids) * 100 if order_ids else 0
    
    # 异常值检查
    amounts = [r.get('amount', 0) for r in data]
    negative_amounts = sum(1 for a in amounts if a < 0)
    
    return {
        'total_records': total_records,
        'completeness': completeness,
        'uniqueness': {
            'unique_ids': unique_ids,
            'duplicate_rate': round(duplicate_rate, 2)
        },
        'anomalies': {
            'negative_amounts': negative_amounts,
            'negative_rate': round(negative_amounts / total_records * 100, 2)
        },
        'overall_score': round(
            (sum(c['rate'] for c in completeness.values()) / len(completeness)) * 
            (1 - duplicate_rate / 100) * 
            (1 - negative_amounts / total_records),
            2
        )
    }


if __name__ == '__main__':
    print("=" * 60)
    print("电商BI自动化脚本")
    print("=" * 60)
    
    # 示例1: 数据标准化
    print("\n【示例1】多平台数据标准化")
    taobao_order = {'tid': 'T123', 'payment': '199.99', 'created': '2024-01-15 10:30:00', 'sku_id': 'SKU001', 'status': 'paid', 'buyer_nick': 'user001'}
    std_taobao = standardize_order_data(taobao_order, 'taobao')
    print(f"  淘宝订单标准化: {std_taobao['order_id']} | ¥{std_taobao['amount']} | {std_taobao['status']}")
    
    amazon_order = {'AmazonOrderId': 'A456', 'OrderTotal': '29.99', 'PurchaseDate': '2024-01-15', 'SellerSKU': 'SKU002', 'OrderStatus': 'Shipped', 'BuyerEmail': 'buyer@example.com'}
    std_amazon = standardize_order_data(amazon_order, 'amazon')
    print(f"  Amazon订单标准化: {std_amazon['order_id']} | ${std_amazon['amount']} | {std_amazon['status']}")
    
    # 示例2: KPI计算
    print("\n【示例2】每日KPI计算")
    sample_orders = [
        {'order_time': '2024-01-15', 'amount': 200, 'status': 'paid', 'buyer_id': 'U001'},
        {'order_time': '2024-01-15', 'amount': 350, 'status': 'paid', 'buyer_id': 'U002'},
        {'order_time': '2024-01-15', 'amount': 150, 'status': 'refunded', 'buyer_id': 'U003'},
        {'order_time': '2024-01-15', 'amount': 500, 'status': 'paid', 'buyer_id': 'U001'},
    ]
    kpi = calculate_kpi_daily(sample_orders, '2024-01-15')
    print(f"  GMV: ¥{kpi['gmv']}")
    print(f"  订单量: {kpi['orders']}单")
    print(f"  客单价: ¥{kpi['aov']}")
    print(f"  退款率: {kpi['refund_rate']}%")
    print(f"  购买用户数: {kpi['unique_buyers']}人")
    
    # 示例3: 销售预测
    print("\n【示例3】指数平滑销售预测")
    sales_history = [100, 120, 115, 130, 125, 140, 135, 150, 145, 160, 155, 170]
    forecast = exponential_smoothing_forecast(sales_history, alpha=0.3, forecast_periods=7)
    print(f"  历史数据: {forecast['historical_data']}")
    print(f"  预测未来7天: {forecast['forecast_values']}")
    print(f"  预测精度(MAPE): {forecast['mape']}%")
    print(f"  置信度: {forecast['confidence']}")
    
    # 示例4: 数据质量检查
    print("\n【示例4】数据质量检查")
    test_data = [
        {'order_id': 'O001', 'amount': 100, 'status': 'paid'},
        {'order_id': 'O002', 'amount': 200, 'status': 'paid'},
        {'order_id': 'O003', 'amount': -50, 'status': 'refunded'},  # 异常：负数金额
        {'order_id': 'O001', 'amount': 150, 'status': 'paid'},      # 异常：重复ID
        {'order_id': '', 'amount': 300, 'status': 'paid'},          # 异常：空ID
    ]
    quality = data_quality_check(test_data, ['order_id', 'amount', 'status'])
    print(f"  总记录数: {quality['total_records']}")
    print(f"  完整性:")
    for field, result in quality['completeness'].items():
        print(f"    {field}: {result['rate']}%")
    print(f"  重复率: {quality['uniqueness']['duplicate_rate']}%")
    print(f"  异常金额数: {quality['anomalies']['negative_amounts']}")
    print(f"  综合质量分: {quality['overall_score']}")
    
    # 示例5: 生成日报
    print("\n【示例5】自动生成运营日报")
    report = generate_daily_report(kpi)
    print(report)
    
    print("\n" + "=" * 60)
    print("请 import 需要的函数使用")
    print("=" * 60)
