import os
import sys
from urllib.parse import unquote

def clean_path(path):
    """
    Clean and normalize a file path.
    Handles 'file:///' prefixes and spaces in paths.
    """
    # Remove 'file:///' prefix if present
    if path.startswith("file:///"):
        path = path[8:]  # Strip "file:///"
    # Decode URL-encoded characters (e.g., %20 for spaces)
    path = unquote(path)
    # Normalize path separators for cross-platform compatibility
    path = os.path.normpath(path)
    return path

def process_files(file_paths):
    """
    Process a list of file paths and write their content to prompt.txt.
    """
    with open('prompt.txt', 'a', encoding='utf-8') as prompt_file:
        for file_path in file_paths:
            file_path = clean_path(file_path.strip())
            
            if not os.path.exists(file_path):
                print(f"Error: File '{file_path}' not found.")
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8') as file:
                    content = file.read()
            except Exception as e:
                print(f"Error reading {file_path}: {str(e)}")
                continue
            
            prompt_file.write(f"[{file_path}]\n{content}\n\n")
            print(f"Added: {file_path}")

def main():
    print("Drag and drop files here or type 'stop' to finish.")

    if len(sys.argv) > 1:
        # Files were dragged and dropped onto the script
        file_paths = sys.argv[1:]
        process_files(file_paths)
        print("All files processed. Check prompt.txt for results.")
    else:
        # Interactive mode if no files are dragged
        while True:
            user_input = input("File path(s) (or type 'stop'): ").strip()
            if user_input.lower() == 'stop':
                print("Process stopped. Check prompt.txt for results.")
                break
            
            # Split multiple file paths separated by spaces
            file_paths = user_input.split()
            process_files(file_paths)

if __name__ == "__main__":
    main()