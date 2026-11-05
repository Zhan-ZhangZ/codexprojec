#!/usr/bin/env python3
"""
电商库存优化计算脚本
提供ABC分类、安全库存、补货点、滞销预警等功能
"""

import json
import math
from datetime import datetime, timedelta


def classify_abc(data, value_col='sales_amount', sku_col='sku'):
    """
    ABC库存分类分析
    
    Parameters:
        data: list of dict, 包含sku和销量/金额数据
        value_col: str, 用于分类的数值列名
        sku_col: str, SKU列名
    
    Returns:
        list, 增加ABC分类的结果
    """
    # 按销量降序排列
    sorted_data = sorted(data, key=lambda x: x.get(value_col, 0), reverse=True)
    
    total_value = sum(item.get(value_col, 0) for item in sorted_data)
    cumulative = 0
    
    result = []
    for item in sorted_data:
        cumulative += item.get(value_col, 0)
        cumulative_pct = (cumulative / total_value) * 100 if total_value > 0 else 0
        
        if cumulative_pct <= 70:
            abc_class = 'A'
        elif cumulative_pct <= 90:
            abc_class = 'B'
        else:
            abc_class = 'C'
        
        result.append({
            **item,
            'cumulative_pct': round(cumulative_pct, 2),
            'abc_class': abc_class
        })
    
    return result


def calculate_safety_stock(daily_sales_history, lead_time_days, service_level=0.95):
    """
    计算安全库存
    
    Parameters:
        daily_sales_history: list, 历史日销量数据
        lead_time_days: int, 补货周期（天）
        service_level: float, 服务水平（0.9-0.99）
    
    Returns:
        dict, 安全库存计算结果
    """
    # 服务水平系数
    z_scores = {0.90: 1.28, 0.95: 1.65, 0.99: 2.33}
    z = z_scores.get(service_level, 1.65)
    
    # 计算均值和标准差
    n = len(daily_sales_history)
    if n < 2:
        return {'error': '需要至少2天的历史销售数据'}
    
    mean = sum(daily_sales_history) / n
    variance = sum((x - mean) ** 2 for x in daily_sales_history) / (n - 1)
    std = math.sqrt(variance)
    
    # 安全库存 = Z * σ * √L
    safety_stock = z * std * math.sqrt(lead_time_days)
    
    return {
        'service_level': service_level,
        'z_score': z,
        'daily_mean': round(mean, 2),
        'daily_std': round(std, 2),
        'lead_time_days': lead_time_days,
        'safety_stock': math.ceil(safety_stock),
        'reorder_point': math.ceil(mean * lead_time_days + safety_stock)
    }


def calculate_eoq(annual_demand, order_cost, holding_cost_per_unit):
    """
    计算经济订货量（EOQ）
    
    Parameters:
        annual_demand: int, 年需求量
        order_cost: float, 每次订货成本
        holding_cost_per_unit: float, 单位库存持有成本
    
    Returns:
        dict, EOQ计算结果
    """
    if holding_cost_per_unit <= 0:
        return {'error': '持有成本必须大于0'}
    
    eoq = math.sqrt((2 * annual_demand * order_cost) / holding_cost_per_unit)
    
    # 计算年订货次数和订货周期
    annual_orders = annual_demand / eoq
    order_cycle_days = 365 / annual_orders
    
    # 总成本
    total_ordering_cost = annual_orders * order_cost
    total_holding_cost = (eoq / 2) * holding_cost_per_unit
    total_cost = total_ordering_cost + total_holding_cost
    
    return {
        'eoq': round(eoq, 0),
        'annual_orders': round(annual_orders, 1),
        'order_cycle_days': round(order_cycle_days, 1),
        'total_ordering_cost': round(total_ordering_cost, 2),
        'total_holding_cost': round(total_holding_cost, 2),
        'total_inventory_cost': round(total_cost, 2)
    }


def inventory_health_check(inventory_data):
    """
    库存健康度检查
    
    Parameters:
        inventory_data: list of dict, 库存数据
        
    Returns:
        dict, 健康度报告
    """
    total_sku = len(inventory_data)
    total_inventory_value = sum(item.get('inventory_value', 0) for item in inventory_data)
    
    # 各类预警统计
    out_of_stock = [item for item in inventory_data if item.get('available_days', 999) <= 3]
    low_stock = [item for item in inventory_data if 3 < item.get('available_days', 999) <= 7]
    stagnant = [item for item in inventory_data if item.get('age_days', 0) > 90]
    overstock = [item for item in inventory_data if item.get('available_days', 0) > 90]
    
    # 计算周转天数（简化版：库存金额 / 日均销售成本）
    total_daily_sales = sum(item.get('daily_sales', 0) * item.get('unit_cost', 0) 
                           for item in inventory_data)
    turnover_days = total_inventory_value / total_daily_sales if total_daily_sales > 0 else 999
    
    return {
        'report_date': datetime.now().strftime('%Y-%m-%d'),
        'total_sku': total_sku,
        'total_inventory_value': round(total_inventory_value, 2),
        'turnover_days': round(turnover_days, 1),
        'stagnant_rate': round(len(stagnant) / total_sku * 100, 1) if total_sku > 0 else 0,
        'out_of_stock_count': len(out_of_stock),
        'low_stock_count': len(low_stock),
        'stagnant_count': len(stagnant),
        'overstock_count': len(overstock),
        'alerts': {
            'out_of_stock': out_of_stock,
            'low_stock': low_stock,
            'stagnant': stagnant,
            'overstock': overstock
        },
        'health_status': 'healthy' if turnover_days < 60 else 'warning' if turnover_days < 90 else 'critical'
    }


def generate_reorder_plan(inventory_data, service_level=0.95):
    """
    生成补货计划
    
    Parameters:
        inventory_data: list of dict, 库存数据
        service_level: float, 服务水平
        
    Returns:
        list, 补货建议清单
    """
    reorder_plan = []
    
    for item in inventory_data:
        current_stock = item.get('current_stock', 0)
        daily_sales = item.get('daily_sales', 0)
        lead_time = item.get('lead_time_days', 7)
        
        # 计算补货点
        safety = calculate_safety_stock(
            [daily_sales] * 30,  # 简化：假设30天相同销量
            lead_time,
            service_level
        )
        
        reorder_point = safety.get('reorder_point', 0)
        
        if current_stock <= reorder_point:
            suggested_qty = max(reorder_point * 2 - current_stock, reorder_point)
            
            reorder_plan.append({
                'sku': item.get('sku', 'N/A'),
                'name': item.get('name', 'N/A'),
                'current_stock': current_stock,
                'reorder_point': reorder_point,
                'suggested_qty': math.ceil(suggested_qty),
                'urgency': 'high' if current_stock <= safety.get('safety_stock', 0) else 'medium',
                'estimated_cost': round(suggested_qty * item.get('unit_cost', 0), 2)
            })
    
    # 按紧急度排序
    reorder_plan.sort(key=lambda x: 0 if x['urgency'] == 'high' else 1)
    
    return reorder_plan


if __name__ == '__main__':
    print("=" * 60)
    print("电商库存优化脚本")
    print("=" * 60)
    
    # 示例1: ABC分类
    print("\n【示例1】ABC分类")
    sales_data = [
        {'sku': 'SKU001', 'sales_amount': 50000},
        {'sku': 'SKU002', 'sales_amount': 30000},
        {'sku': 'SKU003', 'sales_amount': 15000},
        {'sku': 'SKU004', 'sales_amount': 8000},
        {'sku': 'SKU005', 'sales_amount': 5000},
        {'sku': 'SKU006', 'sales_amount': 3000},
        {'sku': 'SKU007', 'sales_amount': 2000},
        {'sku': 'SKU008', 'sales_amount': 1000},
    ]
    abc_result = classify_abc(sales_data)
    for item in abc_result[:5]:
        print(f"  {item['sku']}: 销售额¥{item['sales_amount']} → {item['abc_class']}类 (累计{item['cumulative_pct']}%)")
    
    # 示例2: 安全库存
    print("\n【示例2】安全库存计算")
    daily_sales = [10, 12, 8, 15, 11, 9, 13, 14, 10, 12, 11, 9, 13, 15, 10]
    safety = calculate_safety_stock(daily_sales, lead_time_days=7, service_level=0.95)
    print(f"  日均销量: {safety['daily_mean']}")
    print(f"  日销量标准差: {safety['daily_std']}")
    print(f"  安全库存: {safety['safety_stock']}件")
    print(f"  补货点: {safety['reorder_point']}件")
    
    # 示例3: EOQ
    print("\n【示例3】经济订货量")
    eoq = calculate_eoq(annual_demand=3600, order_cost=100, holding_cost_per_unit=5)
    print(f"  经济订货量: {eoq['eoq']}件")
    print(f"  年订货次数: {eoq['annual_orders']}次")
    print(f"  订货周期: {eoq['order_cycle_days']}天")
    print(f"  年库存总成本: ¥{eoq['total_inventory_cost']}")
    
    # 示例4: 库存健康度
    print("\n【示例4】库存健康度检查")
    inventory = [
        {'sku': 'A001', 'current_stock': 50, 'daily_sales': 10, 'unit_cost': 20, 'age_days': 30, 'lead_time_days': 7},
        {'sku': 'A002', 'current_stock': 5, 'daily_sales': 8, 'unit_cost': 30, 'age_days': 20, 'lead_time_days': 5},
        {'sku': 'B001', 'current_stock': 200, 'daily_sales': 2, 'unit_cost': 15, 'age_days': 120, 'lead_time_days': 10},
        {'sku': 'C001', 'current_stock': 500, 'daily_sales': 1, 'unit_cost': 10, 'age_days': 200, 'lead_time_days': 15},
    ]
    # 补充计算字段
    for item in inventory:
        item['available_days'] = item['current_stock'] / item['daily_sales'] if item['daily_sales'] > 0 else 999
        item['inventory_value'] = item['current_stock'] * item['unit_cost']
    
    health = inventory_health_check(inventory)
    print(f"  总SKU数: {health['total_sku']}")
    print(f"  库存总金额: ¥{health['total_inventory_value']}")
    print(f"  周转天数: {health['turnover_days']}天")
    print(f"  滞销率: {health['stagnant_rate']}%")
    print(f"  缺货SKU: {health['out_of_stock_count']}个")
    print(f"  健康状态: {health['health_status']}")
    
    print("\n" + "=" * 60)
    print("请 import 需要的函数使用")
    print("=" * 60)
