import os
import re
import subprocess

def get_image_dimensions(path):
    try:
        # Use sips to get dimensions. sips is standard on macOS.
        out = subprocess.check_output(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', path])
        out = out.decode('utf-8')
        w = re.search(r'pixelWidth: (\d+)', out)
        h = re.search(r'pixelHeight: (\d+)', out)
        if w and h:
            return int(w.group(1)), int(h.group(1))
    except Exception as e:
        print(f"Error reading dimensions for {path}: {e}")
    return None

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    changed = False

    def replace_img(match):
        nonlocal changed
        full_tag = match.group(0)
        
        # Check if width and height already exist
        if 'width=' in full_tag and 'height=' in full_tag:
            return full_tag

        src_match = re.search(r'src=["\']([^"\']+)["\']', full_tag)
        if not src_match:
            return full_tag
        
        src = src_match.group(1)
        
        # Skip remote URLs
        if src.startswith('http') or src.startswith('//'):
            return full_tag
            
        # Resolve path. Markdown paths relative to root in this project
        image_path = os.path.join(os.getcwd(), src.lstrip('/'))
        
        if not os.path.exists(image_path):
             print(f"Warning: Image not found: {image_path} (referenced in {os.path.basename(filepath)})")
             return full_tag

        dims = get_image_dimensions(image_path)
        if not dims:
            return full_tag
            
        w, h = dims
        
        # Insert width and height before the closing > or />
        # We need to handle attributes nicely.
        
        # Strip the closing part
        if full_tag.endswith('/>'):
            base = full_tag[:-2].rstrip()
            suffix = ' />'
        elif full_tag.endswith('>'):
            base = full_tag[:-1].rstrip()
            suffix = '>'
        else:
             return full_tag # Should not happen with regex matches
             
        new_tag = f'{base} width="{w}" height="{h}"{suffix}'
            
        print(f"Updated {src} in {os.path.basename(filepath)}: {w}x{h}")
        changed = True
        return new_tag

    # Regex for img tag
    # Matches <img ... >
    new_content = re.sub(r'<img\s+[^>]+>', replace_img, content)
    
    # Also handle markdown syntax: ![alt](src) ?
    # The user request mentioned "project detail view... .md file".
    # Standard markdown ![]() doesn't support dimensions.
    # To fix layout shift for these, we'd need to convert them to HTML <img>.
    # Let's see if we should do that. The user primarily uses HTML for figures as seen in example.
    # But if there are plain markdown images, they will still shift.
    # Let's add a converter for standard markdown images too.
    
    def replace_md_img(match):
        nonlocal changed
        alt = match.group(1)
        src = match.group(2)
        
        if src.startswith('http') or src.startswith('//'):
            return match.group(0)

        image_path = os.path.join(os.getcwd(), src.lstrip('/'))
        if not os.path.exists(image_path):
             return match.group(0)
             
        dims = get_image_dimensions(image_path)
        if not dims:
            return match.group(0)
            
        w, h = dims
        print(f"Converted MD image {src} in {os.path.basename(filepath)} to HTML with dims")
        changed = True
        return f'<img src="{src}" alt="{alt}" width="{w}" height="{h}">'

    # Regex for markdown image: ![alt](src)
    # Be careful not to match inside other things? Basic regex should be ok for this context.
    new_content = re.sub(r'!\[(.*?)\]\((.*?)\)', replace_md_img, new_content)

    if changed:
        with open(filepath, 'w') as f:
            f.write(new_content)

def main():
    root_dir = 'projects'
    print("Starting image dimension update...")
    if not os.path.exists(root_dir):
        print(f"Directory {root_dir} not found.")
        return

    for dirpath, _, filenames in os.walk(root_dir):
        for fname in filenames:
            if fname.endswith('.md'):
                process_file(os.path.join(dirpath, fname))
    print("Done.")

if __name__ == "__main__":
    main()
