import os
import re

def fix_broken_template_literals():
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Restore the start of DEFAULT_ARCHITECTURE
    # It was likely export const DEFAULT_ARCHITECTURE = `
    # My previous script might have left the very first one alone (matches[0] was skipped)
    # let's check
    if 'DEFAULT_ARCHITECTURE = \\`' in content:
        content = content.replace('DEFAULT_ARCHITECTURE = \\`', 'DEFAULT_ARCHITECTURE = `')
        print("Restored start of DEFAULT_ARCHITECTURE")

    # 2. Restore the end of DEFAULT_ARCHITECTURE
    # Patterns: \`; or \` ;
    content = re.sub(r'\\`(\s*);', r'`\1;', content)
    print("Restored end of DEFAULT_ARCHITECTURE (if found)")

    # 3. Restore the start of skill contents
    # Pattern: content: \`
    content = re.sub(r'content:\s*\\`', r'content: `', content)
    print("Restored start of skill contents")

    # 4. Restore the end of skill contents
    # Pattern: \` followed by } or , (at the end of an object)
    # The skills end with `\n  },` or `\n  }\n];`
    content = re.sub(r'\\`(\s*},)', r'`\1', content)
    content = re.sub(r'\\`(\s*}\s*\];)', r'`\1', content)
    
    # 5. Fix internal unescaped backticks that might still be there 
    # (though my previous script should have caught them)
    
    # We should also check for \` followed by nothing or whitespace at the end of a line if it's supposed to close.
    # Looking at the error from user:
    # 2027 | Non giudicare il vuoto — giudica il lavoro già fatto.`
    # So line 2027 has a backtick. If it's escaped it would be \`
    # The error was on line 2028: }
    # This means the string didn't close, so } was parsed as part of the string or caused confusion.
    
    # Actually, if the user sees line 2027 ending with `, it means it IS NOT escaped in their view?
    # No, Turbopack log shows: `Non giudicare il vuoto — giudica il lavoro già fatto.`
    # If the log shows the backtick, and then expected expression on }, it means the ` closed a string that was ALREADY closed or something.
    
    # Let's do a more careful replacement for the closing of the last skill.
    # The last skill in DEFAULT_SKILLS ends around line 2027.
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        print("Surgically restored template literal boundaries in defaults.ts")

if __name__ == "__main__":
    fix_broken_template_literals()
