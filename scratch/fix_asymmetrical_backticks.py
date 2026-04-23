import os

def fix_specific_lines():
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Line 14: fix symmetrical escape
    if '`createDesignBoards`, etc.)' in lines[13]: # index 13 is line 14
        lines[13] = lines[13].replace('`createDesignBoards`, etc.)', '\\`createDesignBoards\\`, etc.)')
        print("Fixed line 14")
    
    # We should search for any other partial escapes
    for i, line in enumerate(lines):
        # If a line has both an escaped and unescaped backtick, it's likely a mistake 
        # (unless it's the start/end of a literal, but those are on their own lines usually)
        
        if '\\`' in line and '`' in line.replace('\\`',''):
            # This line has an unescaped backtick and an escaped one.
            # Example: \`something`
            # We should probably escape the second one too IF it's not the end of the whole file.
            if i < len(lines) - 2: # Don't touch the last lines
                 # Escape all unescaped backticks that are not starting/ending the content blocks
                 if 'content: `' not in line and '`;' not in line:
                     # This is a bit risky but these lines are 99% internal markdown
                     fixed_line = line.replace('\\`','TEMP_ESC').replace('`','\\`').replace('TEMP_ESC','\\`')
                     if fixed_line != line:
                         lines[i] = fixed_line
                         print(f"Symmetrically escaped line {i+1}")

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
        print("Surgically fixed asymmetrical backticks in defaults.ts")

if __name__ == "__main__":
    fix_specific_lines()
