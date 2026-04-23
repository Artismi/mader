import os
import re

def universal_skill_sanitizer():
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Sanitize DEFAULT_ARCHITECTURE
    arch_pattern = re.compile(r'(DEFAULT_ARCHITECTURE\s*=\s*)(`|\\`)(.*?)(`|\\`)\s*;', re.DOTALL)
    def replace_arch(match):
        prefix = match.group(1)
        body = match.group(3)
        clean_body = body.replace('\\`', '`').replace('`', '\\`')
        return f"{prefix}`{clean_body}`;"
    
    content = arch_pattern.sub(replace_arch, content)

    # 2. Sanitize ALL content properties in objects
    # This pattern looks for content: followed by a template literal, 
    # and then finds the end based on structural clues ( } , or } ] )
    # which are mandatory for these objects in the array.
    skill_content_pattern = re.compile(r'(content:\s*)(`|\\`)(.*?)(`|\\`)\s*(\},|\}\s*\];)', re.DOTALL)
    
    def replace_content(match):
        prefix = match.group(1)
        body = match.group(3)
        suffix = match.group(5)
        
        # Neutralize and Escape
        clean_body = body.replace('\\`', '`').replace('`', '\\`')
        return f"{prefix}`{clean_body}`\n  {suffix}"

    final_content, count = skill_content_pattern.subn(replace_content, content)
    
    print(f"Sanitized {count} skill content blocks.")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(final_content)
        print("Universal Sanitization COMPLETE.")

if __name__ == "__main__":
    universal_skill_sanitizer()
