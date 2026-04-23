import os
import re

def test_smart_scanner():
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find DEFAULT_ARCHITECTURE
    arch_match = re.search(r'DEFAULT_ARCHITECTURE\s*=\s*(`|\\`)(.*?)(?<!\\)`\s*;', content, re.DOTALL)
    if arch_match:
        print(f"Found ARCHITECTURE. Length: {len(arch_match.group(2))}")
    else:
        # Try again with escaped closer
        arch_match = re.search(r'DEFAULT_ARCHITECTURE\s*=\s*(`|\\`)(.*?)\\`\s*;', content, re.DOTALL)
        if arch_match:
            print(f"Found ARCHITECTURE (escaped closer). Length: {len(arch_match.group(2))}")

    # Find each skill block
    # A skill block starts with { and has a slug, and ends with },
    # We want the content inside content: `...`
    # We use a pattern that matches the content property specifically within an object
    skill_matches = list(re.finditer(r'content:\s*(`|\\`)(.*?)(?<!\\)(`|\\`)\s*},', content, re.DOTALL))
    print(f"Found {len(skill_matches)} skill blocks.")

    for i, m in enumerate(skill_matches[:5]):
        print(f"[{i+1}] Start: {m.start()}, Body length: {len(m.group(2))}")

if __name__ == "__main__":
    test_smart_scanner()
