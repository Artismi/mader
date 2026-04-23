import os
import re

def absolute_anchor_sanitizer():
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix DEFAULT_ARCHITECTURE
    # Starts at = `
    # Ends at `;
    arch_match = re.search(r'(DEFAULT_ARCHITECTURE\s*=\s*)(`|\\`)(.*?)(`|\\`)\s*;', content, re.DOTALL)
    if arch_match:
        prefix = arch_match.group(1)
        body = arch_match.group(3)
        # Neutralize and Escape
        clean_body = body.replace('\\`', '`').replace('`', '\\`')
        new_arch = f"{prefix}`{clean_body}`;"
        content = content[:arch_match.start()] + new_arch + content[arch_match.end():]
        print("Sanitized DEFAULT_ARCHITECTURE")

    # 2. Fix Skills
    # We find each skill object: { ... slug: '...', ... content: `...` }
    # We use re.finditer with a pattern that captures the whole object
    # We must be careful to not be too greedy.
    # Pattern: { followed by stuff including slug, until the content property and its closing }
    skill_pattern = re.compile(r'({[^{}]*?slug:\s*\'[^\']*\'[^{}]*?content:\s*)(`|\\`)(.*?)(`|\\`)\s*(},|})', re.DOTALL)
    
    def replace_skill(match):
        prefix = match.group(1)
        body = match.group(3)
        suffix = match.group(5)
        
        # Neutralize and Escape
        clean_body = body.replace('\\`', '`').replace('`', '\\`')
        return f"{prefix}`{clean_body}`{suffix}"

    new_content, count = skill_pattern.subn(replace_skill, content)
    
    print(f"Sanitized {count} skills.")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        print("Absolute Anchor Sanitization COMPLETE.")

if __name__ == "__main__":
    absolute_anchor_sanitizer()
