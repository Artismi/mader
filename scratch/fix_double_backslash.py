import os

def fix_double_backslash():
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace double backslash before backtick with single backslash
    # Pattern: \\` -> \`
    # We use a loop or re.sub to be sure.
    # Note: in Python string literal, \\ means one backslash.
    # So to match \\` in the file, we need \\\\` in the pattern.
    
    new_content = content.replace('\\\\`', '\\`')
    
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully removed double backslashes in defaults.ts")
    else:
        print("No double backslashes found (unexpectedly).")

if __name__ == "__main__":
    fix_double_backslash()
