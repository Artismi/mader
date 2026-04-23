import os
import re

def fix_all_backticks():
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to find the content of DEFAULT_ARCHITECTURE template literal
    # and escape all interior backticks.
    # The literal starts with DEFAULT_ARCHITECTURE = `
    # and ends with `;
    
    # Actually, it's easier to just escape ALL backticks that aren't the start/end ones
    # or already escaped.
    
    # We'll use a regex that finds backticks not preceded by a backslash
    # and not being the very first/last occurrences (approximate)
    
    parts = content.split('`')
    if len(parts) <= 2:
        print("No template literals found or already broken.")
        return

    # parts[0] is everything before the first `
    # parts[-1] is everything after the last `
    # items in between need their internal backticks escaped? 
    # No, the split consumed the backticks.
    
    # Let's try a different approach: regex with lookbehind
    # We want to find ` but NOT \`
    # However, we must SPARE the first and the last ` for the template literal.
    
    # Finding all backticks and their positions
    matches = list(re.finditer(r'(?<!\\)`', content))
    
    if len(matches) < 2:
        print("Not enough backticks to process.")
        return

    # We skip the first and the last one
    to_escape = matches[1:-1]
    
    new_content = list(content)
    # We process from back to front to not mess up indices
    for m in reversed(to_escape):
        pos = m.start()
        new_content.insert(pos, '\\')
    
    final_content = "".join(new_content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(final_content)
        print(f"Fixed {len(to_escape)} backticks in defaults.ts")

if __name__ == "__main__":
    fix_all_backticks()
