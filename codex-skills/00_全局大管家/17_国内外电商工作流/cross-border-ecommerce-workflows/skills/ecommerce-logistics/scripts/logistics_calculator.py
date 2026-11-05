#!/usr/bin/env python3
"""
电商物流成本计算与路由推荐脚本
提供头程/尾程成本核算、智能路由推荐、时效预估等功能
"""

import json
from typing import List, Dict


def calculate_domestic_shipping_cost(weight_kg, zone='standard', carrier='tongda'):
    """
    计算国内快递成本
    
    Parameters:
        weight_kg: float, 重量(kg)
        zone: str, 区域类型 (standard/remote/xinjiang)
        carrier: str, 快递公司 (tongda/shunfeng/jd)
    
    Returns:
        dict, 成本明细
    """
    # 基础费率表 (元/kg)
    rates = {
        'tongda': {'first_kg': 8, 'additional_kg': 3, 'remote_multiplier': 1.5},
        'shunfeng': {'first_kg': 18, 'additional_kg': 8, 'remote_multiplier': 1.3},
        'jd': {'first_kg': 15, 'additional_kg': 6, 'remote_multiplier': 1.4},
    }
    
    rate = rates.get(carrier, rates['tongda'])
    
    # 计算运费
    if weight_kg <= 1:
        shipping = rate['first_kg']
    else:
        shipping = rate['first_kg'] + (weight_kg - 1) * rate['additional_kg']
    
    # 偏远地区加成
    if zone in ['remote', 'xinjiang']:
        shipping *= rate['remote_multiplier']
    
    # 固定附加费
    packaging = 1.2  # 包装费
    label = 0.3      # 面单费
    handling = 0.8   # 操作费
    
    total = shipping + packaging + label + handling
    
    return {
        'carrier': carrier,
        'weight_kg': weight_kg,
        'zone': zone,
        'shipping_fee': round(shipping, 2),
        'packaging_fee': packaging,
        'label_fee': label,
        'handling_fee': handling,
        'total_cost': round(total, 2),
        'cost_per_kg': round(total / weight_kg, 2) if weight_kg > 0 else 0
    }


def calculate_cross_border_cost(weight_kg, volume_m3, route_type='fba', destination='us'):
    """
    计算跨境物流成本
    
    Parameters:
        weight_kg: float, 重量(kg)
        volume_m3: float, 体积(m³)
        route_type: str, 路线类型 (fba/3pl/self_ship)
        destination: str, 目的国 (us/eu/jp)
    
    Returns:
        dict, 成本明细
    """
    # 计费重 = max(实际重, 体积重/5000)
    volumetric_weight = volume_m3 * 1000 / 0.5  # 体积重(kg)
    chargeable_weight = max(weight_kg, volumetric_weight)
    
    if route_type == 'fba':
        # FBA费用结构
        first_leg_rates = {'us': 1.5, 'eu': 1.8, 'jp': 2.0}  # $/kg 头程
        fba_fulfillment = {'us': 5.5, 'eu': 6.0, 'jp': 4.5}  # $/单 配送
        fba_storage = {'us': 0.8, 'eu': 0.9, 'jp': 0.6}      # $/月/单位
        
        first_leg = chargeable_weight * first_leg_rates.get(destination, 1.5)
        fulfillment = fba_fulfillment.get(destination, 5.5)
        storage = fba_storage.get(destination, 0.8)
        
        total = first_leg + fulfillment + storage
        
        return {
            'route_type': 'FBA',
            'destination': destination,
            'chargeable_weight_kg': round(chargeable_weight, 2),
            'first_leg_cost': round(first_leg, 2),
            'fulfillment_cost': fulfillment,
            'storage_cost_monthly': storage,
            'total_cost': round(total, 2),
            'breakdown': {
                '头程海运': f'${round(first_leg, 2)}',
                'FBA配送': f'${fulfillment}',
                'FBA仓储(月)': f'${storage}'
            }
        }
    
    elif route_type == 'self_ship':
        # 自发货费用结构
        international_rates = {
            'us': {'line': 5.0, 'post': 3.0},
            'eu': {'line': 6.0, 'post': 3.5},
            'jp': {'line': 4.0, 'post': 2.5}
        }
        
        rates = international_rates.get(destination, international_rates['us'])
        line_cost = chargeable_weight * rates['line']
        post_cost = chargeable_weight * rates['post']
        
        return {
            'route_type': 'Self-Ship',
            'destination': destination,
            'chargeable_weight_kg': round(chargeable_weight, 2),
            'line_cost': round(line_cost, 2),
            'post_cost': round(post_cost, 2),
            'recommendation': '专线' if line_cost < 50 else '邮政小包'
        }
    
    return {'error': '不支持的路线类型'}


def recommend_route(order_params):
    """
    智能路由推荐
    
    Parameters:
        order_params: dict, 订单参数
            - weight_kg: 重量
            - volume_m3: 体积
            - destination: 目的地
            - delivery_days: 要求时效(天)
            - product_value: 商品价值
            - is_fragile: 是否易碎
    
    Returns:
        list, 推荐方案排序
    """
    weight = order_params.get('weight_kg', 1)
    volume = order_params.get('volume_m3', 0.001)
    dest = order_params.get('destination', 'us')
    required_days = order_params.get('delivery_days', 10)
    value = order_params.get('product_value', 50)
    
    # 定义可选方案
    options = [
        {
            'name': 'FBA',
            'delivery_days': 3,
            'cost_factor': 1.0,
            'reliability': 0.98,
            'tracking': 'full'
        },
        {
            'name': '海外仓',
            'delivery_days': 5,
            'cost_factor': 0.85,
            'reliability': 0.95,
            'tracking': 'full'
        },
        {
            'name': '国际专线',
            'delivery_days': 12,
            'cost_factor': 0.65,
            'reliability': 0.90,
            'tracking': 'standard'
        },
        {
            'name': '邮政小包',
            'delivery_days': 25,
            'cost_factor': 0.45,
            'reliability': 0.80,
            'tracking': 'limited'
        }
    ]
    
    # 筛选满足时效的方案
    feasible = [opt for opt in options if opt['delivery_days'] <= required_days]
    
    if not feasible:
        # 如果没有满足时效的，返回最快方案
        feasible = [min(options, key=lambda x: x['delivery_days'])]
    
    # 计算综合得分 (成本40% + 时效30% + 可靠性20% + 追踪10%)
    for opt in feasible:
        cost_score = (1 - opt['cost_factor']) * 100  # 成本越低分越高
        time_score = (30 - opt['delivery_days']) / 30 * 100  # 时效越快分越高
        reliability_score = opt['reliability'] * 100
        tracking_score = {'full': 100, 'standard': 70, 'limited': 40}[opt['tracking']]
        
        opt['total_score'] = (
            cost_score * 0.4 +
            time_score * 0.3 +
            reliability_score * 0.2 +
            tracking_score * 0.1
        )
    
    # 排序
    feasible.sort(key=lambda x: x['total_score'], reverse=True)
    
    return feasible


def calculate_logistics_kpi(orders_data):
    """
    计算物流核心KPI
    
    Parameters:
        orders_data: list of dict, 订单物流数据
    
    Returns:
        dict, KPI报告
    """
    total_orders = len(orders_data)
    if total_orders == 0:
        return {'error': '无订单数据'}
    
    # 准时送达率
    on_time = sum(1 for o in orders_data if o.get('actual_days', 999) <= o.get('promised_days', 999))
    on_time_rate = on_time / total_orders
    
    # 平均配送时效
    avg_days = sum(o.get('actual_days', 0) for o in orders_data) / total_orders
    
    # 物流成本占比
    total_gmv = sum(o.get('order_value', 0) for o in orders_data)
    total_logistics_cost = sum(o.get('logistics_cost', 0) for o in orders_data)
    cost_ratio = total_logistics_cost / total_gmv if total_gmv > 0 else 0
    
    # 异常率
    abnormal = sum(1 for o in orders_data if o.get('status') in ['lost', 'damaged', 'delayed'])
    abnormal_rate = abnormal / total_orders
    
    return {
        'total_orders': total_orders,
        'on_time_rate': round(on_time_rate * 100, 1),
        'avg_delivery_days': round(avg_days, 1),
        'logistics_cost_ratio': round(cost_ratio * 100, 1),
        'abnormal_rate': round(abnormal_rate * 100, 2),
        'health_status': 'excellent' if on_time_rate >= 0.98 else 'good' if on_time_rate >= 0.95 else 'warning'
    }


if __name__ == '__main__':
    print("=" * 60)
    print("电商物流成本计算脚本")
    print("=" * 60)
    
    # 示例1: 国内快递
    print("\n【示例1】国内快递成本")
    domestic = calculate_domestic_shipping_cost(weight_kg=2.5, zone='standard', carrier='tongda')
    print(f"  快递公司: {domestic['carrier']}")
    print(f"  重量: {domestic['weight_kg']}kg")
    print(f"  运费: ¥{domestic['shipping_fee']}")
    print(f"  总成本: ¥{domestic['total_cost']}")
    print(f"  单kg成本: ¥{domestic['cost_per_kg']}")
    
    # 示例2: 跨境FBA
    print("\n【示例2】跨境FBA成本")
    fba = calculate_cross_border_cost(weight_kg=1.2, volume_m3=0.008, route_type='fba', destination='us')
    print(f"  路线: {fba['route_type']}")
    print(f"  计费重: {fba['chargeable_weight_kg']}kg")
    print(f"  头程: {fba['breakdown']['头程海运']}")
    print(f"  配送: {fba['breakdown']['FBA配送']}")
    print(f"  总成本: ${fba['total_cost']}")
    
    # 示例3: 智能路由推荐
    print("\n【示例3】智能路由推荐")
    order = {
        'weight_kg': 0.8,
        'volume_m3': 0.005,
        'destination': 'us',
        'delivery_days': 7,
        'product_value': 80
    }
    routes = recommend_route(order)
    print(f"  订单要求: {order['delivery_days']}天内送达美国")
    print("  推荐方案:")
    for i, route in enumerate(routes[:3], 1):
        print(f"    {i}. {route['name']}: {route['delivery_days']}天, 综合得分{route['total_score']:.1f}")
    
    # 示例4: 物流KPI
    print("\n【示例4】物流KPI分析")
    sample_orders = [
        {'actual_days': 2, 'promised_days': 3, 'order_value': 100, 'logistics_cost': 8, 'status': 'delivered'},
        {'actual_days': 3, 'promised_days': 3, 'order_value': 150, 'logistics_cost': 10, 'status': 'delivered'},
        {'actual_days': 5, 'promised_days': 3, 'order_value': 80, 'logistics_cost': 6, 'status': 'delayed'},
        {'actual_days': 2, 'promised_days': 3, 'order_value': 200, 'logistics_cost': 12, 'status': 'delivered'},
    ]
    kpi = calculate_logistics_kpi(sample_orders)
    print(f"  订单总数: {kpi['total_orders']}")
    print(f"  准时率: {kpi['on_time_rate']}%")
    print(f"  平均时效: {kpi['avg_delivery_days']}天")
    print(f"  物流成本占比: {kpi['logistics_cost_ratio']}%")
    print(f"  异常率: {kpi['abnormal_rate']}%")
    print(f"  健康状态: {kpi['health_status']}")
    
    print("\n" + "=" * 60)
    print("请 import 需要的函数使用")
    print("=" * 60)
