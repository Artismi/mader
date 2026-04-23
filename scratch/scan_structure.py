import os
import re

def scan_file_structure():
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find DEFAULT_ARCHITECTURE start/end
    arch_match = re.search(r'DEFAULT_ARCHITECTURE\s*=\s*(`|\\`)', content)
    if arch_match:
        print(f"Found DEFAULT_ARCHITECTURE at index {arch_match.start()}")

    # Find all content: matches
    # We look for the start of the string
    content_matches = list(re.finditer(r'content:\s*(`|\\`)', content))
    print(f"Found {len(content_matches)} skill content blocks.")
    for i, m in enumerate(content_matches):
        # Snippet to check escaping
        snippet = content[m.start():m.end()+10]
        print(f"[{i+1}] {snippet}...")

    # Find all potential closing markers
    # Pattern: backtick (escaped or not) followed by }
    closers = list(re.finditer(r'(`|\\`)\s*(},|};\s*|]\s*;)', content))
    print(f"Found {len(closers)} potential block closers.")

if __name__ == "__main__":
    scan_file_structure()
