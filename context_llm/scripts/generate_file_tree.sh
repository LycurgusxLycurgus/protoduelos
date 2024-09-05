#!/bin/bash

# File to save the tree
OUTPUT_FILE="./context_llm/file_tree.txt"

# Directories to include (adjust as needed)
INCLUDE_DIRS=("src" "public" "context_llm" ".")

# Relevant file extensions and filenames
FILE_EXTENSIONS=("ts" "tsx" "json" "svg" "ico" "css" "local" "sh" "txt" "ts" "mjs" "md" "json" "yml" "sol" "local" "svg" "mjs" "prisma" "sql" "env")
SPECIAL_FILES=("package.json" "tsconfig.json")

# Function to check if a filename matches relevant criteria
function is_relevant {
    local filename=$1
    for ext in "${FILE_EXTENSIONS[@]}"; do
        if [[ $filename == *.$ext ]]; then
            return 0
        fi
    done
    for special in "${SPECIAL_FILES[@]}"; do
        if [[ $filename == $special ]]; then
            return 0
        fi
    done
    return 1
}

# Generate the file tree and save it to output file
echo "Project File Tree" > $OUTPUT_FILE
for dir in "${INCLUDE_DIRS[@]}"; do
    echo "$dir/" >> $OUTPUT_FILE
    find $dir \
        \( -path "./node_modules/*" -o \
          -path "./.git/*" -o \
          -path "./.cache/*" -o \
          -path "./.config/*" -o \
          -path "./.vscode/*" -o \
          -path "./venv/*" -o \
          -path "./.replit" -o \
          -path "./replit.nix" -o \
          -path "./*.lock" -o \
          -path "./package-lock.json" -o \
          -path "./.next/*" -o \
          -path "./yarn.lock" -o \
          -path "./dist/*" -o \
          -path "./frontend/node_modules/*" -o \
          -path "./frontend/.git/*" -o \
          -path "./frontend/.cache/*" -o \
          -path "./frontend/.config/*" -o \
          -path "./frontend/.vscode/*" -o \
          -path "./frontend/venv/*" -o \
          -path "./frontend/.replit" -o \
          -path "./frontend/replit.nix" -o \
          -path "./frontend/*.lock" -o \
          -path "./frontend/package-lock.json" -o \
          -path "./frontend/.next/*" -o \
          -path "./frontend/yarn.lock" -o \
          -path "./backend/node_modules/*" -o \
          -path "./backend/.git/*" -o \
          -path "./backend/.cache/*" -o \
          -path "./backend/.config/*" -o \
          -path "./backend/.vscode/*" -o \
          -path "./backend/venv/*" -o \
          -path "./backend/.replit" -o \
          -path "./backend/replit.nix" -o \
          -path "./backend/*.lock" -o \
          -path "./backend/package-lock.json" -o \
          -path "./backend/.next/*" -o \
          -path "./backend/yarn.lock" \
        \) -prune -o -type f -print | while read file; do
        filename=$(basename "$file")
        if is_relevant "$filename"; then
            echo "  $file" >> $OUTPUT_FILE
        fi
    done
done

echo "File tree saved to $OUTPUT_FILE"