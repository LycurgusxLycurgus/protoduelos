#!/bin/bash

# Define output file
output_file="context_llm/all_code_one_file.txt"

# List of file extensions to include (expandable)
file_types=("*.py" "*.js" "*.java" "*.cpp" "*.c" "*.h" "*.html" "*.css" "*.php" "*.rb" "*.go" "*.ts" "*.json" "*.yml" "*.sol" "*.local" "*.svg" "*.tsx" "*.mjs" "*.prisma" "*.sql" "*.env")

# Initialize/Empty the output file
> "$output_file"

# Function to append file contents to output
append_files() {
  local extension="$1"
  for file in $(find . -type f -name "$extension" \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./.cache/*" \
    -not -path "./.config/*" \
    -not -path "./.vscode/*" \
    -not -path "./venv/*" \
    -not -path "./.replit" \
    -not -path "./replit.nix" \
    -not -path "./*.lock" \
    -not -path "./package-lock.json" \
    -not -path "./.next/*" \
    -not -path "./yarn.lock" \
    -not -path "./frontend/node_modules/*" \
    -not -path "./frontend/.git/*" \
    -not -path "./frontend/.cache/*" \
    -not -path "./frontend/.config/*" \
    -not -path "./frontend/.vscode/*" \
    -not -path "./frontend/venv/*" \
    -not -path "./frontend/.replit" \
    -not -path "./frontend/replit.nix" \
    -not -path "./frontend/*.lock" \
    -not -path "./frontend/package-lock.json" \
    -not -path "./frontend/.next/*" \
    -not -path "./frontend/yarn.lock" \
    -not -path "./backend/node_modules/*" \
    -not -path "./backend/.git/*" \
    -not -path "./backend/.cache/*" \
    -not -path "./backend/.config/*" \
    -not -path "./backend/.vscode/*" \
    -not -path "./backend/venv/*" \
    -not -path "./backend/.replit" \
    -not -path "./backend/replit.nix" \
    -not -path "./backend/*.lock" \
    -not -path "./backend/package-lock.json" \
    -not -path "./backend/.next/*" \
    -not -path "./backend/yarn.lock" \
    -not -path "./dist/*" 
  ); do
    echo "### Filename: $file" >> "$output_file"
    cat "$file" >> "$output_file"
    echo -e "\n\n" >> "$output_file"
  done
}

# Loop through all specified file types and add to output file
for filetype in "${file_types[@]}"; do
  append_files "$filetype"
done

echo "All relevant code files have been successfully combined into $output_file."