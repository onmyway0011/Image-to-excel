#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os

def create_simple_excel(output_path):
    """创建一个简单的CSV文件作为Excel替代"""
    # 创建示例数据
    csv_content = '''姓名,年龄,部门,工资
张三,25,技术部,8000
李四,30,销售部,6000
王五,35,人事部,7000
赵六,28,财务部,9000'''
    
    # 将.xlsx扩展名改为.csv
    if output_path.endswith('.xlsx'):
        output_path = output_path.replace('.xlsx', '.csv')
    
    # 写入CSV文件
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(csv_content)
    
    return output_path

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("用法: python3 simple_image_to_excel.py <图像路径> <输出Excel文件名>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    output_filename = sys.argv[2]
    
    try:
        result_path = create_simple_excel(output_filename)
        print(f"成功生成文件: {result_path}")
        print("注意：这是一个示例CSV文件，实际OCR功能需要安装PaddleOCR等依赖")
    except Exception as e:
        print(f"错误: {str(e)}")
        sys.exit(1)