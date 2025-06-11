import os

# Define paths relative to the project root
projects_dir = '../projects'  # Input folder with .md files
output_file = '../projects/projects-cache-static-export.js'  # Output JavaScript file

# Dictionary to store project content
projects_content = {}

# Traverse the projects directory
for root, dirs, files in os.walk(projects_dir):
    for file in files:
        if file.endswith('.md'):  # Process only .md files, excluding .mdx
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()  # Read the raw Markdown content
            key = file.replace('.md', '')  # Use filename without extension as key
            projects_content[key] = content

# Generate the JavaScript code with conditional assignment
js_code = 'if (!location.protocol.startsWith(\'http\')) {\n'
js_code += '  window.projectsContent = {\n'
for key, content in projects_content.items():
    # Escape special characters for JavaScript template literals
    escaped_content = content.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
    js_code += f"    '{key}': `{escaped_content}`,\n"
js_code += '  };\n'
js_code += '}\n'

# Write the generated code to the output file
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(js_code)