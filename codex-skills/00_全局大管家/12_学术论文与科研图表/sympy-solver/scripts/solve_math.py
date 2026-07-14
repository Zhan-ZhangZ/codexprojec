#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import argparse

try:
    import sympy
    from sympy import Symbol, symbols, simplify, solve, diff, integrate, limit, oo, Matrix, latex, S
    from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
except ImportError:
    print("[!] 错误: 您的环境未安装 sympy 库。 请运行 'pip install sympy' 安装。", file=sys.stderr)
    sys.exit(1)

def parse_expression_safely(expr_str, local_dict=None):
    """
    Parse a mathematical expression string into a SymPy expression safely,
    supporting implicit multiplication (e.g., '2x' -> '2*x').
    """
    transformations = standard_transformations + (implicit_multiplication_application,)
    try:
        # Standardize symbols dynamically
        return parse_expr(expr_str, local_dict=local_dict, transformations=transformations)
    except Exception as e:
        print(f"[!] 表达式解析失败: '{expr_str}'。错误原因: {e}", file=sys.stderr)
        sys.exit(1)

def run_simplify(expr_str, vars_list):
    # Register symbols
    syms = {v: Symbol(v) for v in vars_list}
    expr = parse_expression_safely(expr_str, local_dict=syms)
    result = simplify(expr)
    
    print("# SymPy 表达式化简结果\n")
    print(f"- **输入表达式**: `{expr_str}`")
    print(f"- **输入 LaTeX**: $${latex(expr)}$$")
    print(f"- **化简结果**: `{result}`")
    print(f"- **化简 LaTeX**: $${latex(result)}$$")

def run_diff(expr_str, var_name, order=1):
    sym = Symbol(var_name)
    expr = parse_expression_safely(expr_str, local_dict={var_name: sym})
    result = diff(expr, sym, order)
    
    print("# SymPy 符号求导结果\n")
    print(f"- **原函数**: `{expr_str}`")
    print(f"- **原函数 LaTeX**: $${latex(expr)}$$")
    print(f"- **求导变量**: `{var_name}` (阶数: {order})")
    print(f"- **求导结果**: `{result}`")
    print(f"- **求导 LaTeX**: $${latex(result)}$$")

def run_integrate(expr_str, var_name, limits_str=None):
    sym = Symbol(var_name)
    expr = parse_expression_safely(expr_str, local_dict={var_name: sym})
    
    if limits_str:
        # Definite integral
        limits_parts = [p.strip() for p in limits_str.split(',')]
        if len(limits_parts) != 2:
            print("[!] 错误: 定积分限格式应为 '下限,上限'，例如 '0,pi' 或 '0,oo'。", file=sys.stderr)
            sys.exit(1)
            
        # Parse limits in SymPy context
        local_dict = {
            'pi': sympy.pi,
            'oo': oo,
            'inf': oo,
            'infinity': oo,
            'e': sympy.E
        }
        lower = parse_expression_safely(limits_parts[0], local_dict=local_dict)
        upper = parse_expression_safely(limits_parts[1], local_dict=local_dict)
        
        result = integrate(expr, (sym, lower, upper))
        
        print("# SymPy 定积分求解结果\n")
        print(f"- **被积函数**: `{expr_str}`")
        print(f"- **积分变量**: `{var_name}`")
        print(f"- **积分区间**: `[{lower}, {upper}]`")
        print(f"- **定积分 LaTeX**: $$\\int_{{{latex(lower)}}}^{{{latex(upper)}}} {latex(expr)} \\, d{var_name} = {latex(result)}$$")
        print(f"- **精确结果**: `{result}`")
    else:
        # Indefinite integral
        result = integrate(expr, sym)
        print("# SymPy 不定积分求解结果\n")
        print(f"- **被积函数**: `{expr_str}`")
        print(f"- **积分变量**: `{var_name}`")
        print(f"- **不定积分 LaTeX**: $$\\int {latex(expr)} \\, d{var_name} = {latex(result)} + C$$")
        print(f"- **积分结果**: `{result}`")

def run_solve(eqs_str, vars_list):
    # Setup variables
    syms = {v: Symbol(v) for v in vars_list}
    
    # Check if multiple equations
    eq_parts = [p.strip() for p in eqs_str.split(',')]
    parsed_eqs = []
    for eq_part in eq_parts:
        if '=' in eq_part:
            left, right = eq_part.split('=', 1)
            left_expr = parse_expression_safely(left, local_dict=syms)
            right_expr = parse_expression_safely(right, local_dict=syms)
            parsed_eqs.append(left_expr - right_expr)
        else:
            parsed_eqs.append(parse_expression_safely(eq_part, local_dict=syms))
            
    # Resolve variables to SymPy Symbol objects
    resolve_vars = [syms[v] for v in vars_list]
    
    # Solve
    result = solve(parsed_eqs, resolve_vars, dict=True)
    
    print("# SymPy 方程求解结果\n")
    print(f"- **待解方程**: {', '.join([f'`{eq}`' for eq in eq_parts])}")
    print(f"- **求解变量**: {', '.join([f'`{v}`' for v in vars_list])}\n")
    
    if not result:
        print("未找到解析解。")
        return
        
    print("## 求解结果列表\n")
    for idx, sol in enumerate(result, 1):
        sol_lines = []
        sol_latex = []
        for var, val in sol.items():
            sol_lines.append(f"{var} = {val}")
            sol_latex.append(f"{latex(var)} = {latex(val)}")
        print(f"{idx}. **解集 {idx}**: {', '.join(sol_lines)}")
        print(f"   - LaTeX: $${', '.join(sol_latex)}$$")
        print()

def run_limit(expr_str, var_name, target_str, direction='+'):
    sym = Symbol(var_name)
    local_dict = {
        var_name: sym,
        'pi': sympy.pi,
        'oo': oo,
        'inf': oo,
        'infinity': oo,
        'e': sympy.E
    }
    expr = parse_expression_safely(expr_str, local_dict=local_dict)
    target = parse_expression_safely(target_str, local_dict=local_dict)
    
    result = limit(expr, sym, target, dir=direction)
    
    print("# SymPy 极限求解结果\n")
    print(f"- **表达式**: `{expr_str}`")
    print(f"- **求极限变量**: `{var_name} \\to {target_str}` (方向: {direction})")
    print(f"- **极限 LaTeX**: $$\\lim_{{{var_name} \\to {latex(target)}}} {latex(expr)} = {latex(result)}$$")
    print(f"- **精确结果**: `{result}`")

def run_matrix(matrix_str, op):
    # Parse matrix string like "[[1, 2], [3, 4]]"
    try:
        raw_mat = eval(matrix_str)
        m = Matrix(raw_mat)
    except Exception as e:
        print(f"[!] 矩阵解析失败: '{matrix_str}'。格式需类似于 '[[1, 2], [3, 4]]'。错误: {e}", file=sys.stderr)
        sys.exit(1)
        
    print("# SymPy 矩阵运算结果\n")
    print(f"- **输入矩阵**:\n  `{matrix_str}`")
    print(f"- **矩阵 LaTeX**:\n  $${latex(m)}$$\n")
    
    if op == 'det':
        res = m.det()
        print(f"- **行列式 (det)**: `{res}`")
        print(f"- **行列式 LaTeX**: $${latex(res)}$$")
    elif op == 'inv':
        try:
            res = m.inv()
            print(f"- **逆矩阵 (inverse)**:\n  `{res}`")
            print(f"- **逆矩阵 LaTeX**:\n  $${latex(res)}$$")
        except Exception as e:
            print(f"[!] 求逆失败: {e}", file=sys.stderr)
    elif op == 'eigen':
        vals = m.eigenvals()
        vects = m.eigenvects()
        print("- **特征值 (eigenvalues)**:")
        for val, mult in vals.items():
            print(f"  - 特征值: `{val}` (重数: {mult}), LaTeX: ${latex(val)}$")
        print("\n- **特征向量 (eigenvectors)**:")
        for idx, (val, mult, vecs) in enumerate(vects, 1):
            vec_strs = [latex(v) for v in vecs]
            print(f"  - 向量组 {idx} (对应特征值 ${latex(val)}$):")
            for vs in vec_strs:
                print(f"    $${vs}$$")
    else:
        print(f"[!] 未知的矩阵操作: {op}", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(description="SymPy 符号数学公式计算求解工具")
    subparsers = parser.add_subparsers(dest="task", help="需要执行的数学计算任务")
    
    # Simplify parser
    p_simplify = subparsers.add_parser("simplify", help="化简代数表达式")
    p_simplify.add_argument("expression", type=str, help="待化简的代数式")
    p_simplify.add_argument("--vars", "-v", default="x", help="使用的代数变量，逗号分隔 (默认: x)")
    
    # Diff parser
    p_diff = subparsers.add_parser("diff", help="对代数表达式求导")
    p_diff.add_argument("expression", type=str, help="被求导函数")
    p_diff.add_argument("--var", "-v", default="x", help="求导自变量 (默认: x)")
    p_diff.add_argument("--order", "-n", type=int, default=1, help="求导阶数 (默认: 1)")
    
    # Integrate parser
    p_integrate = subparsers.add_parser("integrate", help="求解不定积分或定积分")
    p_integrate.add_argument("expression", type=str, help="被积函数")
    p_integrate.add_argument("--var", "-v", default="x", help="积分自变量 (默认: x)")
    p_integrate.add_argument("--limits", "-l", help="积分限，格式为'下限,上限' (如: '0,pi'。留空表示求不定积分)")
    
    # Solve parser
    p_solve = subparsers.add_parser("solve", help="求解方程或方程组")
    p_solve.add_argument("equations", type=str, help="待解方程，多个方程用逗号分隔，等号写为'='（如 'x**2 - 4 = 0' 或 'x+y-3, x-y-1'）")
    p_solve.add_argument("--vars", "-v", default="x", help="求解的变量，逗号分隔 (默认: x)")
    
    # Limit parser
    p_limit = subparsers.add_parser("limit", help="求解极限")
    p_limit.add_argument("expression", type=str, help="待求极限表达式")
    p_limit.add_argument("target", type=str, help="变量趋近的目标值 (如 '0', 'pi', 'oo')")
    p_limit.add_argument("--var", "-v", default="x", help="自变量 (默认: x)")
    p_limit.add_argument("--dir", "-d", choices=["+", "-"], default="+", help="趋近方向: '+' (右极限，默认), '-' (左极限)")
    
    # Matrix parser
    p_matrix = subparsers.add_parser("matrix", help="矩阵代数计算")
    p_matrix.add_argument("matrix", type=str, help="嵌套列表格式的矩阵，例如 '[[1, 2], [3, 4]]'")
    p_matrix.add_argument("operation", choices=["det", "inv", "eigen"], help="矩阵操作: det (行列式), inv (逆矩阵), eigen (特征值/特征向量)")
    
    args = parser.parse_args()
    
    if not args.task:
        parser.print_help()
        sys.exit(1)
        
    if args.task == "simplify":
        vars_list = [v.strip() for v in args.vars.split(',')]
        run_simplify(args.expression, vars_list)
    elif args.task == "diff":
        run_diff(args.expression, args.var, args.order)
    elif args.task == "integrate":
        run_integrate(args.expression, args.var, args.limits)
    elif args.task == "solve":
        vars_list = [v.strip() for v in args.vars.split(',')]
        run_solve(args.equations, vars_list)
    elif args.task == "limit":
        run_limit(args.expression, args.var, args.target, args.dir)
    elif args.task == "matrix":
        run_matrix(args.matrix, args.operation)

if __name__ == "__main__":
    main()
