import csv
import re
import os

def process_markdown(input_file, output_file):
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found.")
        return

    data = []
    current_batch = ""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for line in lines:
        line = line.strip()
        
        # Identify Batch
        batch_match = re.search(r'### \*\*BATCH \d+: (.*?)\*\*', line)
        if batch_match:
            current_batch = batch_match.group(1).split('(')[0].strip()
            continue
            
        # Identify table rows
        if line.startswith('|') and line.endswith('|'):
            # Split by | and strip whitespace
            parts = [p.strip() for p in line.split('|')]
            # Remove the empty strings at start and end
            parts = parts[1:-1]
            
            # Skip header and separator rows
            if not parts or parts[0] == '#' or all(p.startswith('---') or p == '' for p in parts):
                continue
                
            # If we have 7 columns (as per the structure)
            if len(parts) >= 7:
                row = {
                    'Batch': current_batch,
                    'ID': parts[0],
                    'Name': parts[1],
                    'Primary Domain': parts[2],
                    'Blurring Line Angle': parts[3],
                    'Location': parts[4],
                    'Outreach Priority': parts[5],
                    'Contact Method': parts[6]
                }
                data.append(row)

    if not data:
        print("No data found to process.")
        return

    fieldnames = ['Batch', 'ID', 'Name', 'Primary Domain', 'Blurring Line Angle', 'Location', 'Outreach Priority', 'Contact Method']
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
        
    print(f"Successfully processed {len(data)} entries into {output_file}")

if __name__ == "__main__":
    input_path = r'c:\Users\Janmejai\Downloads\tedxoutreach\TEDxXLRI-Master-Consolidated-List.md'
    output_path = r'c:\Users\Janmejai\Downloads\tedxoutreach\TEDxXLRI_Master_Speaker_List.csv'
    process_markdown(input_path, output_path)
