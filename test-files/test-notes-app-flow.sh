#!/bin/bash
# ==============================================================================
# Complete API Test Flow for KairoNotes App
# ==============================================================================

BASE_URL="http://localhost:3000"
COOKIE_FILE="/tmp/kairo-cookies.txt"

echo "=== 1. Registering Test User ==="
curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notes App Developer",
    "email": "notesdev@kairo.local",
    "password": "Password123!"
  }' | jq .

echo -e "\n=== 2. Authenticating (Session Cookie) ==="
# Get CSRF token
CSRF_TOKEN=$(curl -s -c "$COOKIE_FILE" "$BASE_URL/api/auth/csrf" | jq -r .csrfToken)

# Perform Login
curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" \
  -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=notesdev@kairo.local&password=Password123!&csrfToken=$CSRF_TOKEN&json=true" | jq .

echo -e "\n=== 3. Creating Notes App Project ==="
PROJECT_RES=$(curl -s -b "$COOKIE_FILE" \
  -X POST "$BASE_URL/api/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "KairoNotes App",
    "description": "A modern markdown-based notes and knowledge management web application with tags, search, and folders.",
    "templateId": "nextjs-shadcn"
  }')

echo "$PROJECT_RES" | jq .
PROJECT_ID=$(echo "$PROJECT_RES" | jq -r .id)

if [ "$PROJECT_ID" == "null" ] || [ -z "$PROJECT_ID" ]; then
  echo "Error: Failed to create project"
  exit 1
fi

echo -e "\n=== 4. Uploading Input Text / Requirements ==="
curl -s -b "$COOKIE_FILE" \
  -X POST "$BASE_URL/api/projects/$PROJECT_ID/inputs" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Build KairoNotes: A modern markdown notes web app using Next.js 14, Tailwind CSS, Prisma, and PostgreSQL. Key features: rich markdown editing, tags, folders, pinned notes, full-text search, archive/trash, and session auth."
  }' | jq .

echo -e "\n=== 5. Uploading Test File Documents ==="
curl -s -b "$COOKIE_FILE" \
  -X POST "$BASE_URL/api/projects/$PROJECT_ID/inputs" \
  -F "files=@/home/saswatbarai/Videos/kairopro/test-files/notes-app-prd.md" \
  -F "files=@/home/saswatbarai/Videos/kairopro/test-files/notes-app-system-design.md" \
  -F "files=@/home/saswatbarai/Videos/kairopro/test-files/notes-app-api-specs.txt" | jq .

echo -e "\n=== 6. Generating Specs (PRD, Design, Data Model, App Structure) ==="
echo "Generating spec... (this takes ~30-90s)"
curl -s -b "$COOKIE_FILE" \
  -X POST "$BASE_URL/api/projects/$PROJECT_ID/specs/generate" \
  --max-time 150 | jq .

echo -e "\n=== 7. Fetching Generated Specs ==="
curl -s -b "$COOKIE_FILE" \
  -X GET "$BASE_URL/api/projects/$PROJECT_ID/specs" | jq .

echo -e "\n=== Done! Project ID: $PROJECT_ID ==="
