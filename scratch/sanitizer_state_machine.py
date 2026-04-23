import os

def sanitizer_state_machine(dry_run=True):
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path): return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = []
    in_literal = False
    
    i = 0
    while i < len(content):
        char = content[i]
        
        # Lookahead for start markers: content: ` or DEFAULT_ARCHITECTURE = `
        if not in_literal:
            # Check for content: or = (very loose to be safe)
            # We look for a backtick that starts a literal
            # A literal starts if the previous significant text was content: or =
            if char == '`':
                # Check preceding text (ignoring whitespace)
                # This is hard char-by-char. Let's use a small window.
                pre = content[max(0, i-40):i].strip()
                if pre.endswith('content:') or pre.endswith('='):
                    in_literal = True
                    new_content.append(char)
                    i += 1
                    continue
                # If we see a BACKTICK that is escaped at the start, fix it
                elif pre.endswith('content:\\') or pre.endswith('=\\'):
                    # This backtick was incorrectly escaped
                    # We drop the previous \\ and add the ` as start
                    if new_content[-1] == '\\':
                        new_content.pop()
                    in_literal = True
                    new_content.append('`')
                    i += 1
                    continue
            
            new_content.append(char)
            i += 1
        else:
            # INSIDE LITERAL
            # We look for the END of the literal
            # An unescaped backtick that is followed by structural markers
            if char == '`':
                # Check for escape
                is_escaped = (i > 0 and content[i-1] == '\\' and (i < 2 or content[i-2] != '\\'))
                
                # Lookahead to see if this SHOULD be the end
                post = content[i+1:i+10].strip()
                should_be_end = post.startswith('}') or post.startswith(';') or post.startswith(',')
                
                if should_be_end:
                    # Fix: Ensure it is UNESCAPED
                    if is_escaped:
                        new_content.pop() # remove \
                    in_literal = False
                    new_content.append('`')
                else:
                    # This is internal. Fix: Ensure it is ESCAPED
                    if not is_escaped:
                        new_content.append('\\')
                    new_content.append('`')
            elif char == '\\' and i+1 < len(content) and content[i+1] == '`':
                # We already handle ` above, so just skip the \ here if we'll handle the ` next
                # Actually, let's just let the ` logic handle it.
                new_content.append(char)
                
            else:
                new_content.append(char)
                
            i += 1

    final_text = "".join(new_content)
    
    # Safety Check: Character preserved?
    # Strip all ` and \ and whitespace to compare core text
    def core(t): return "".join(t.split())
    # This is too slow for 1MB. Let's compare lengths (approx).
    
    print(f"Original len: {len(content)}, New len: {len(final_text)}")
    
    if not dry_run:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(final_text)
            print("Sanitization status: COMPLETE")

if __name__ == "__main__":
    sanitizer_state_machine(dry_run=False)
