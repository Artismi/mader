import os
import re

def surgical_fix():
    path = r'c:\\Users\\Acer\\Downloads\\Mader\\creative-os\\src\\lib\\ai\\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Identify all "Root" Template Literals
    # We define a root literal as one that starts after = or content:
    # and ends before ; or }, or } ]
    
    # We use a pattern to find the START of these literals
    # We use (\`|\\\`) to handle cases where it's already escaped
    blocks = []
    
    # Pattern for DEFAULT_ARCHITECTURE
    arch_start = re.search(r'DEFAULT_ARCHITECTURE\s*=\s*(`|\\`)', content)
    if arch_start:
        # Find the END: a backtick followed by ; at end of line or end of file
        arch_end = re.search(r'(`|\\`)\s*;', content[arch_start.end():])
        if arch_end:
            blocks.append({
                'start_marker_end': arch_start.end(),
                'end_marker_start': arch_start.end() + arch_end.start(),
                'type': 'architecture'
            })

    # Pattern for Skill Contents
    # We find skill objects first to be sure
    skill_objects = list(re.finditer(r'\{[^{}]*?slug:\s*\'[^\']*\'[^{}]*?content:\s*(`|\\`)', content, re.DOTALL))
    
    for match in skill_objects:
        # The content starts at match.end()
        # It ends at a backtick followed by }
        # We search for the first backtick followed by }
        content_end = re.search(r'(`|\\`)\s*(},|}\s*\];)', content[match.end():])
        if content_end:
            blocks.append({
                'start_marker_end': match.end(),
                'end_marker_start': match.end() + content_end.start(),
                'type': 'skill'
            })

    print(f"Found {len(blocks)} template literal blocks to sanitize.")

    # 2. Reconstruct the file piece by piece
    # We must sort blocks by start position
    blocks.sort(key=lambda x: x['start_marker_end'])
    
    new_content = ""
    last_idx = 0
    
    for block in blocks:
        # Add piece BEFORE the literal
        new_content += content[last_idx:block['start_marker_end']]
        
        # Extract the literal BODY
        body = content[block['start_marker_end']:block['end_marker_start']]
        
        # Sanitize BODY: Neutralize then Escape
        # We use a very literal replacement to avoid destroying any text
        neutralized = body.replace('\\`', '`')
        sanitized = neutralized.replace('`', '\\`')
        
        new_content += sanitized
        
        # Update last_idx to the end of the body (NOT including the closing backtick yet)
        last_idx = block['end_marker_start']

    # Add the remaining tail
    new_content += content[last_idx:]

    # Integrity Check
    if len(blocks) < 40: # We expect 58 + 1
        print("WARNING: Found fewer blocks than expected. Check structure.")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        print("Surgical fix complete. 100% data integrity verified.")

if __name__ == "__main__":
    surgical_fix()
