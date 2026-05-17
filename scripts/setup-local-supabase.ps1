# Local Supabase bootstrap for Phase 2.2 (Windows PowerShell).
# Prerequisites: Docker Desktop running, Node.js/npm.
# Does NOT deploy or touch production.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "==> Checking Docker..."
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Error "Docker is not running. Install Docker Desktop and start it, then re-run this script."
}

Write-Host "==> Starting Supabase (npx supabase start)..."
npx supabase start

Write-Host "==> Applying migrations + seed (npx supabase db reset)..."
npx supabase db reset

Write-Host "==> Reading local credentials (npx supabase status -o env)..."
$statusEnv = npx supabase status -o env 2>&1 | Out-String
$apiUrl = if ($statusEnv -match 'API_URL="([^"]+)"') { $Matches[1] } else { "http://127.0.0.1:54321" }
$anonKey = if ($statusEnv -match 'ANON_KEY="([^"]+)"') { $Matches[1] } else { $null }
$serviceKey = if ($statusEnv -match 'SERVICE_ROLE_KEY="([^"]+)"') { $Matches[1] } else { $null }

if (-not $anonKey -or -not $serviceKey) {
  Write-Error "Could not parse ANON_KEY / SERVICE_ROLE_KEY from 'npx supabase status -o env'. Run it manually."
}

$envLocalPath = Join-Path $Root ".env.local"
$lines = @(
  "# Generated/updated by scripts/setup-local-supabase.ps1 — local development only",
  "NEXT_PUBLIC_SUPABASE_URL=$apiUrl",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey",
  "SUPABASE_SERVICE_ROLE_KEY=$serviceKey",
  "",
  "NEXT_PUBLIC_REQUIRE_AUTH=",
  "NEXT_PUBLIC_PERSIST_MODE=dual_write",
  "NEXT_PUBLIC_HR_SERVER_HYDRATE=true",
  "NEXT_PUBLIC_TENANT_NAMESPACED_PERSIST=true",
  "",
  "DEV_TENANT_ID=00000000-0000-4000-8000-0000000000aa",
  "DEV_TENANT_NAME=Dev Organization",
  "DEV_USER_ID=00000000-0000-4000-8000-000000000099",
  "NEXT_PUBLIC_DEV_TENANT_ID=00000000-0000-4000-8000-0000000000aa",
  "NEXT_PUBLIC_DEV_TENANT_NAME=Dev Organization"
)

if (-not (Test-Path $envLocalPath)) {
  Set-Content -Path $envLocalPath -Value ($lines -join "`n") -Encoding utf8
} else {
  $existing = Get-Content $envLocalPath -Raw
  $merged = $existing
  foreach ($line in $lines) {
    if ($line -match '^([^#=]+)=(.*)$') {
      $key = $Matches[1].Trim()
      $val = $Matches[2]
      if ($key -match '^NEXT_PUBLIC_SUPABASE_|^SUPABASE_SERVICE_ROLE') {
        $pattern = "(?m)^$([regex]::Escape($key))=.*$"
        if ($merged -match $pattern) {
          $merged = $merged -replace $pattern, "$key=$val"
        } else {
          $merged += "`n$key=$val"
        }
      }
    }
  }
  Set-Content -Path $envLocalPath -Value $merged.TrimEnd() -Encoding utf8
}
Write-Host "==> Updated Supabase keys in $envLocalPath (other vars preserved)"
Write-Host "==> Restart: npm run dev"
Write-Host "==> Optional RLS login: dev@local.test / devpassword123 at /en/login"
Write-Host "==> Studio: http://127.0.0.1:54323"
