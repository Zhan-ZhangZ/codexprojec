#!/usr/bin/env python3
"""
电商数据分析辅助脚本
提供常用的数据处理、报表生成功能
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta


def calculate_growth_rate(current, previous):
    """计算环比增长率"""
    if previous == 0 or pd.isna(previous):
        return None
    return round((current - previous) / previous * 100, 2)


def format_currency(value, currency='CNY'):
    """格式化金额"""
    symbol = {'CNY': '¥', 'USD': '$', 'EUR': '€', 'JPY': '¥', 'GBP': '£'}
    s = symbol.get(currency, '')
    return f"{s}{value:,.2f}" if currency != 'JPY' else f"{s}{value:,.0f}"


def classify_abc(data, value_col, sku_col='sku'):
    """
    ABC库存分类分析
    
    Parameters:
        data: DataFrame, 包含sku和销量/金额列
        value_col: str, 用于分类的数值列名
        sku_col: str, SKU列名
    
    Returns:
        DataFrame, 增加ABC分类列
    """
    df = data.copy()
    df = df.sort_values(value_col, ascending=False)
    df['cumulative_pct'] = df[value_col].cumsum() / df[value_col].sum() * 100
    
    def classify(pct):
        if pct <= 70:
            return 'A'
        elif pct <= 90:
            return 'B'
        else:
            return 'C'
    
    df['abc_class'] = df['cumulative_pct'].apply(classify)
    return df


def calculate_inventory_turnover(cost_of_goods_sold, avg_inventory):
    """计算库存周转率"""
    if avg_inventory == 0:
        return 0
    return round(cost_of_goods_sold / avg_inventory, 2)


def generate_daily_report(sales_data, date):
    """
    生成日报核心指标
    
    Parameters:
        sales_data: DataFrame, 包含日期、销售额、订单量等
        date: str/datetime, 报告日期
    
    Returns:
        dict, 日报核心指标
    """
    if isinstance(date, str):
        date = pd.to_datetime(date)
    
    yesterday = date - timedelta(days=1)
    last_week_same = date - timedelta(days=7)
    
    today_data = sales_data[sales_data['date'] == date]
    yst_data = sales_data[sales_data['date'] == yesterday]
    lw_data = sales_data[sales_data['date'] == last_week_same]
    
    report = {
        'date': date.strftime('%Y-%m-%d'),
        'gmv': today_data['gmv'].sum() if len(today_data) > 0 else 0,
        'orders': today_data['orders'].sum() if len(today_data) > 0 else 0,
        'yesterday_gmv': yst_data['gmv'].sum() if len(yst_data) > 0 else 0,
        'lastweek_gmv': lw_data['gmv'].sum() if len(lw_data) > 0 else 0,
    }
    
    report['dod_growth'] = calculate_growth_rate(report['gmv'], report['yesterday_gmv'])
    report['wow_growth'] = calculate_growth_rate(report['gmv'], report['lastweek_gmv'])
    report['aov'] = round(report['gmv'] / report['orders'], 2) if report['orders'] > 0 else 0
    
    return report


def profit_analysis(revenue, costs):
    """
    利润分析
    
    Parameters:
        revenue: dict, 收入项 {'sales': xxx, ...}
        costs: dict, 成本项 {'cogs': xxx, 'shipping': xxx, ...}
    
    Returns:
        dict, 利润分析结果
    """
    total_revenue = sum(revenue.values())
    total_cost = sum(costs.values())
    gross_profit = total_revenue - costs.get('cogs', 0) - costs.get('shipping', 0)
    net_profit = total_revenue - total_cost
    
    return {
        'total_revenue': total_revenue,
        'total_cost': total_cost,
        'gross_profit': gross_profit,
        'net_profit': net_profit,
        'gross_margin': round(gross_profit / total_revenue * 100, 2) if total_revenue > 0 else 0,
        'net_margin': round(net_profit / total_revenue * 100, 2) if total_revenue > 0 else 0,
        'cost_breakdown': {k: round(v / total_cost * 100, 2) for k, v in costs.items()}
    }


def calculate_roas(ad_spend, ad_revenue):
    """计算ROAS"""
    if ad_spend == 0:
        return 0
    return round(ad_revenue / ad_spend, 2)


def calculate_acos(ad_spend, ad_revenue):
    """计算ACOS"""
    if ad_revenue == 0:
        return 0
    return round(ad_spend / ad_revenue * 100, 2)


if __name__ == '__main__':
    # 示例用法
    print("电商数据分析辅助脚本")
    print("请 import 需要的函数使用")
