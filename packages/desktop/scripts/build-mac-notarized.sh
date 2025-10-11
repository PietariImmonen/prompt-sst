#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

read_env_var() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 0
  local line value
  line=$(grep -E "^${key}=" "$file" | tail -n 1 || true)
  if [[ -z "$line" ]]; then
    return 0
  fi
  value="${line#${key}=}"
  # Trim surrounding quotes if present
  value="${value%\"}"
  value="${value#\"}"
  # Strip possible carriage return
  value="${value%$'\r'}"
  printf '%s' "$value"
}

ensure_var() {
  local key="$1"
  if [[ -n "${!key-}" ]]; then
    return 0
  fi
  local value
  value=$(read_env_var "$PROJECT_ROOT/.env" "$key")
  if [[ -z "$value" ]]; then
    value=$(read_env_var "$PROJECT_ROOT/.env.production" "$key")
  fi
  if [[ "$key" == "CSC_NAME" && "$value" == Developer\ ID\ Application:* ]]; then
    value="${value#Developer ID Application: }"
  fi
  if [[ -n "$value" ]]; then
    export "$key=$value"
  fi
}

required_vars=(
  APPLE_ID
  APPLE_APP_SPECIFIC_PASSWORD
  APPLE_TEAM_ID
  CSC_NAME
)

for var in "${required_vars[@]}"; do
  ensure_var "$var"
done

missing=()
for var in "${required_vars[@]}"; do
  if [[ -z "${!var-}" ]]; then
    missing+=("$var")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "Error: Missing required Apple notarization secrets: ${missing[*]}" >&2
  echo "Set them in the environment or in .env/.env.production before running this script." >&2
  exit 1
fi

cd "$PROJECT_ROOT"

bun run build

temp_config="$(mktemp)"
trap 'rm -f "$temp_config"' EXIT

node - "$PROJECT_ROOT" "$temp_config" <<'NODE'
const fs = require('fs');
const path = require('path');

const [, , projectRoot, outputPath] = process.argv;
const inputPath = path.join(projectRoot, 'electron-builder.yml');
const teamId = process.env.APPLE_TEAM_ID;

if (!teamId) {
  throw new Error('APPLE_TEAM_ID must be set');
}

const template = fs.readFileSync(inputPath, 'utf8');
const rendered = template.replace(/\$\{APPLE_TEAM_ID\}/g, teamId);
fs.writeFileSync(outputPath, rendered);
NODE

DEBUG=${DEBUG:-electron-notarize:*} exec bunx electron-builder --mac --config "$temp_config"
