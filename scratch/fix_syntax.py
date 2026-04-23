import os

def fix_syntax_error():
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # We need to find the line that contains "createDesignBoards" unescaped
    for i, line in enumerate(lines):
        if '`createDesignBoards`' in line and '\\`createDesignBoards\\`' not in line:
            # We must escapes the backticks properly for a JS template literal
            # The goal is to have \` in the final .ts file
            lines[i] = line.replace('`createDesignBoards`', '\`createDesignBoards\`')
            print(f"Fixed line {i+1}")

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
        print("Build error resolved in defaults.ts")

if __name__ == "__main__":
    fix_syntax_error()
