import json
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple

class TemplateValidator:
    def __init__(self, template_path: str):
        with open(template_path, 'r') as f:
            self.template = json.load(f)
        self.required_columns = {col['name']: col for col in self.template['required_columns']}
    
    def validate_dataframe(self, df: pd.DataFrame) -> Tuple[bool, List[str], Dict]:
        """
        Validates a pandas DataFrame against the template
        Returns: (is_valid, error_messages, validation_results)
        """
        errors = []
        validation_results = {
            'missing_columns': [],
            'extra_columns': [],
            'type_errors': [],
            'validation_errors': []
        }
        
        # Check columns
        df_columns = set(df.columns)
        required_columns = set(self.required_columns.keys())
        
        missing = required_columns - df_columns
        if missing:
            errors.append(f"Missing required columns: {', '.join(missing)}")
            validation_results['missing_columns'] = list(missing)
        
        extra = df_columns - required_columns
        if extra:
            errors.append(f"Extra columns found: {', '.join(extra)}")
            validation_results['extra_columns'] = list(extra)
        
        if missing or extra:
            return False, errors, validation_results
        
        # Validate data types and values
        for col_name, col_spec in self.required_columns.items():
            try:
                # Convert to specified type
                if col_spec['type'] == 'float':
                    df[col_name] = pd.to_numeric(df[col_name], errors='raise')
                
                # Validate ranges
                if 'validation' in col_spec:
                    if 'min' in col_spec['validation']:
                        mask = df[col_name] < col_spec['validation']['min']
                        if mask.any():
                            invalid_rows = mask[mask].index.tolist()
                            errors.append(f"Column '{col_name}' has values below minimum {col_spec['validation']['min']} in rows: {invalid_rows}")
                            validation_results['validation_errors'].append({
                                'column': col_name,
                                'type': 'min_value',
                                'rows': invalid_rows
                            })
                    
                    if 'max' in col_spec['validation']:
                        mask = df[col_name] > col_spec['validation']['max']
                        if mask.any():
                            invalid_rows = mask[mask].index.tolist()
                            errors.append(f"Column '{col_name}' has values above maximum {col_spec['validation']['max']} in rows: {invalid_rows}")
                            validation_results['validation_errors'].append({
                                'column': col_name,
                                'type': 'max_value',
                                'rows': invalid_rows
                            })
            
            except (ValueError, TypeError):
                errors.append(f"Column '{col_name}' contains invalid {col_spec['type']} values")
                validation_results['type_errors'].append(col_name)
        
        is_valid = len(errors) == 0
        return is_valid, errors, validation_results
    
    def create_template_excel(self, output_path: str):
        """Creates an empty template Excel file with the required columns"""
        df = pd.DataFrame(columns=[col['name'] for col in self.template['required_columns']])
        
        # Add a sample row with valid data
        sample_row = {}
        for col in self.template['required_columns']:
            if col['type'] == 'float':
                min_val = col['validation'].get('min', 0)
                max_val = col['validation'].get('max', min_val + 100)
                sample_row[col['name']] = (min_val + max_val) / 2
        
        df.loc[0] = sample_row
        df.to_excel(output_path, index=False)
        
    def get_column_specs(self) -> Dict:
        """Returns the column specifications"""
        return self.required_columns 