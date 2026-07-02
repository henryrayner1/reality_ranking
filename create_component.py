import os
import sys

def create_component(component_name):
    """
    Creates a new folder with the given component name and generates
    a basic .tsx and .css file inside.
    """
    # Create a clean folder and file name from the input
    root = './src/components/'
    folder_name = f"{root}{component_name}"
    tsx_file_name = f"{component_name}.tsx"
    css_file_name = f"{component_name}.css"

    # Define file content
    tsx_content = f"""import React from 'react';
import './{css_file_name}';

interface {component_name}Props {{
// Define your props here
}}

const {component_name}: React.FC<{component_name}Props> = () => {{
return (
    <div className="{component_name.lower()}">
    <h1>{component_name} Component</h1>
    </div>
);
}};

export default {component_name};
"""

    css_content = f""".{component_name.lower()} {{
/* Add your component-specific styles here */
}}
"""

    # Create the component folder
    try:
        os.makedirs(folder_name, exist_ok=True)
        print(f"Created folder: {folder_name}/")
    except OSError as e:
        print(f"Error creating folder {folder_name}: {e}")
        return

    # Create the .tsx file
    try:
        with open(os.path.join(folder_name, tsx_file_name), 'w') as f:
            f.write(tsx_content)
        print(f"Created file: {folder_name}/{tsx_file_name}")
    except IOError as e:
        print(f"Error creating file {tsx_file_name}: {e}")

    # Create the .css file
    try:
        with open(os.path.join(folder_name, css_file_name), 'w') as f:
            f.write(css_content)
        print(f"Created file: {folder_name}/{css_file_name}")
    except IOError as e:
        print(f"Error creating file {css_file_name}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python create_component.py <ComponentName>")
        sys.exit(1)
    
    component_name_arg = sys.argv[1]
    # Ensure component name is capitalized for React naming conventions
    component_name = component_name_arg[0].upper() + component_name_arg[1:]
    
    create_component(component_name)
