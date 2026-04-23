import os
import re

def master_parser():
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = []
    state = "OUTSIDE"
    
    i = 0
    total_len = len(content)
    
    while i < total_len:
        char = content[i]
        
        if state == "OUTSIDE":
            # Check for start of a template literal
            # Look for content: or =
            found_start = False
            
            # Check for content:
            if content[i:].startswith('content:'):
                new_content.append(content[i:i+8])
                i += 8
                # Skip whitespace to find the opening backtick
                while i < total_len and content[i].isspace():
                    new_content.append(content[i])
                    i += 1
                
                # Now we expect ` or \`
                if i < total_len:
                    if content[i] == '`':
                        new_content.append('`')
                        i += 1
                        state = "INSIDE_TEMPLATE"
                        found_start = True
                    elif content[i:i+2] == '\\`':
                        # Incorrectly escaped start - fix it
                        new_content.append('`')
                        i += 2
                        state = "INSIDE_TEMPLATE"
                        found_start = True
            
            # Check for ARCHITECTURE = 
            elif content[i:].startswith('ARCHITECTURE ='):
                new_content.append(content[i:i+14])
                i += 14
                while i < total_len and (content[i].isspace() or content[i] == '='):
                    new_content.append(content[i])
                    i += 1
                if i < total_len:
                    if content[i] == '`':
                        new_content.append('`')
                        i += 1
                        state = "INSIDE_TEMPLATE"
                        found_start = True
                    elif content[i:i+2] == '\\`':
                        new_content.append('`')
                        i += 2
                        state = "INSIDE_TEMPLATE"
                        found_start = True
            
            if not found_start:
                new_content.append(char)
                i += 1

        else:
            # INSIDE_TEMPLATE
            # Look for backtick
            if char == '`':
                # Count preceding backslashes in new_content (to see current parity)
                # No, we must check the ORIGINAL preceding backslashes to see intent?
                # Actually, let's just use the lookahead to decide if it's a closer.
                
                # Lookahead to see structural delimiter
                lookahead = content[i+1:i+20].strip()
                # A closer is followed by , } or ; } or ; 
                # (allowing for some whitespace/newlines)
                is_closer = lookahead.startswith('}') or lookahead.startswith(';') or lookahead.startswith(',')
                
                if is_closer:
                    # Deliberately closing. Remove any accidental escape before it.
                    if len(new_content) > 0 and new_content[-1] == '\\':
                        # Check if it was a double backslash \\
                        if len(new_content) > 1 and new_content[-2] == '\\':
                             # It was \\, so one \ remains. This is rare but let's be safe.
                             pass 
                        else:
                             new_content.pop() # Remove the single \
                    new_content.append('`')
                    state = "OUTSIDE"
                else:
                    # Internal backtick. Ensure it IS escaped.
                    if len(new_content) == 0 or new_content[-1] != '\\':
                        new_content.append('\\')
                    new_content.append('`')
                i += 1
            elif char == '\\':
                # Handle backslash. If it's escaping a backtick, we handle it in '`' logic above.
                # If it's just a backslash, we append it.
                if i+1 < total_len and content[i+1] == '`':
                    # We'll handle this in the next iteration when char becomes '`'
                    # But we must append the \ to maintain parity check intent?
                    # No, my `char == '`'` logic is cleaner.
                    new_content.append('\\')
                    i += 1
                else:
                    new_content.append('\\')
                    i += 1
            else:
                new_content.append(char)
                i += 1

    final_text = "".join(new_content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(final_text)
        print(f"Master Parser completed. File restored and sanitized.")

if __name__ == "__main__":
    master_parser()
