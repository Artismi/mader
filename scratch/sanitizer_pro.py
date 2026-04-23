import os
import re

def sanitizer_pro():
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Identify all content blocks
    # We use a non-greedy catch for everything between content: ` and the potential closer
    # The closer for a skill content is: `\n  },  (or variations)
    # The closer for DEFAULT_ARCHITECTURE is: `;
    
    # Let's find all content: markers first
    content_starts = list(re.finditer(r'(content:\s*|DEFAULT_ARCHITECTURE\s*=\s*)(`|\\`)', content))
    
    new_content = ""
    last_idx = 0
    
    for i, match in enumerate(content_starts):
        # 1. Add everything from last_idx to the start of this property
        new_content += content[last_idx:match.start()]
        
        # 2. Add the property name and the OPENING backtick (FIXED: unescaped)
        prefix = match.group(1) # e.g. "content: "
        new_content += prefix + "`"
        
        # 3. Find the END of this template literal
        # We start searching from match.end()
        # The end is a backtick followed by a structural delimiter
        search_start = match.end()
        
        # We'll use a regex to find the potential closer
        # Potential closers:
        # - \s+},\n
        # - \s+}\n];
        # - \s*;\n
        closer_match = re.search(r'(`|\\`)(\s*},|\s*}\s*\];|\s*;)', content[search_start:])
        
        if not closer_match:
            print(f"ERROR: Could not find closer for block {i+1} starting at {match.start()}")
            # Fallback: add the rest of the file and stop to avoid damage
            new_content += content[match.start():]
            last_idx = len(content)
            break
            
        block_end_in_relative = closer_match.start()
        block_end_abs = search_start + block_end_in_relative
        
        # 4. Extract the BODY of the template literal
        body = content[search_start:block_end_abs]
        
        # 5. SANITIZE THE BODY:
        # - Remove all escapes first to neutralize: \` -> `
        # - Then, escape all backticks: ` -> \`
        # This ensures no double escapes and no unescaped internal backticks.
        # BUT: we must PRESERVE all other characters (including existing backslashes if they are not for backtick escaping)
        
        neutralized_body = body.replace('\\`', '`')
        sanitized_body = neutralized_body.replace('`', '\\`')
        
        new_content += sanitized_body
        
        # 6. Add the CLOSING backtick (FIXED: unescaped) and the delimiter
        new_content += "`" + closer_match.group(2)
        
        # 7. Update last_idx
        last_idx = search_start + closer_match.end()

    # Add the remaining tail of the file
    new_content += content[last_idx:]

    # Final sanity check: compare lengths or some heuristic
    if len(new_content) < len(content) * 0.9:
        print("CRITICAL ERROR: New content is significantly shorter than original. Aborting write.")
        print(f"Original: {len(content)}, New: {len(new_content)}")
        return

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        print(f"Sanitization complete. Processed {len(content_starts)} blocks.")

if __name__ == "__main__":
    sanitizer_pro()
