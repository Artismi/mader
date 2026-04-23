import os

def executioner_sanitizer():
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = []
    i = 0
    total_len = len(content)
    
    # We use a simple loop but with context
    while i < total_len:
        # Check for start of a block
        if content[i:].startswith('content:') or content[i:].startswith('DEFAULT_ARCHITECTURE ='):
            # Find the opening backtick
            start_search = i
            while i < total_len and content[i] != '`':
                # If we see \`, it might be an incorrectly escaped start - we want THAT too
                if content[i:i+2] == '\\`':
                    break
                new_content.append(content[i])
                i += 1
            
            if i >= total_len: 
                break
                
            # Now i points to ` or \`
            if content[i] == '\\':
                i += 2 # skip \`
            else:
                i += 1 # skip `
            
            new_content.append('`')
            
            # Find the CLOSING backtick
            # It's the first backtick preceded by zero (or even) backslashes
            body_start = i
            while i < total_len:
                if content[i] == '`':
                    # Check escape parity
                    bs_count = 0
                    j = i - 1
                    while j >= body_start and content[j] == '\\':
                        bs_count += 1
                        j -= 1
                    
                    if bs_count % 2 == 0:
                        # This IS the closer
                        break
                i += 1
                
            if i >= total_len:
                # Malformed file - just append the rest
                new_content.append(content[body_start:])
                break
                
            # Sanitize the body
            body = content[body_start:i]
            # Neutralize: \` -> `
            clean_body = body.replace('\\`', '`')
            # Escape: ` -> \`
            sanitized_body = clean_body.replace('`', '\\`')
            
            new_content.append(sanitized_body)
            new_content.append('`')
            i += 1 # skip the closing backtick
        else:
            new_content.append(content[i])
            i += 1

    final_text = "".join(new_content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(final_text)
        print("Executioner Sanitization COMPLETE.")

if __name__ == "__main__":
    executioner_sanitizer()
