#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import csv

def update_column_types(csv_path, column_types):
    """更新CSV文件的列类型（简化版本）"""
    try:
        # 读取CSV文件
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            rows = list(reader)
        
        if not rows:
            return False, "文件为空"
        
        headers = rows[0]
        data_rows = rows[1:]
        
        # 根据列类型处理数据
        processed_rows = [headers]  # 保留标题行
        
        for row in data_rows:
            processed_row = []
            for i, cell in enumerate(row):
                if i < len(headers):
                    column_name = headers[i]
                    column_type = column_types.get(column_name, 'text')
                    
                    # 根据类型处理数据
                    if column_type == 'number':
                        try:
                            # 尝试转换为数字
                            if '.' in cell:
                                processed_cell = str(float(cell))
                            else:
                                processed_cell = str(int(cell))
                        except ValueError:
                            processed_cell = cell  # 保持原值
                    else:
                        processed_cell = cell
                    
                    processed_row.append(processed_cell)
                else:
                    processed_row.append(cell)
            
            processed_rows.append(processed_row)
        
        # 写回CSV文件
        with open(csv_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(processed_rows)
        
        return True, f"成功更新列类型: {csv_path}"
        
    except Exception as e:
        return False, f"更新列类型时出错: {str(e)}"

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("用法: python3 update_column_types.py <CSV路径> <列类型JSON>")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    column_types_json = sys.argv[2]
    
    try:
        column_types = json.loads(column_types_json)
        
        success, message = update_column_types(csv_path, column_types)
        
        if success:
            print(message)
        else:
            print(message)
            sys.exit(1)
    except json.JSONDecodeError:
        print("错误: 无效的JSON格式")
        sys.exit(1)
    except Exception as e:
        print(f"错误: {str(e)}")
        sys.exit(1)