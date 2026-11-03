$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pgBin = Join-Path $root ".runtime\pgsql\bin"
$pgData = Join-Path $root ".runtime\pgdata"
$node = Join-Path $root ".runtime\node\node.exe"

if (!(Test-Path (Join-Path $pgData "PG_VERSION"))) {
  throw "PostgreSQL data directory is not initialized: $pgData"
}
if (!(Test-Path $node)) {
  throw "Portable Node.js was not found: $node"
}

$ready = & (Join-Path $pgBin "pg_isready.exe") -h 127.0.0.1 -p 5432 -U postgres 2>$null
if ($LASTEXITCODE -ne 0) {
  & (Join-Path $pgBin "pg_ctl.exe") -D $pgData -o "-p 5432 -h 127.0.0.1" -l (Join-Path $root ".runtime\postgres.log") start
  Start-Sleep -Seconds 2
}

if (!(Test-Path (Join-Path $root "dist\server.cjs"))) {
  throw "Production build is missing. Run the build command first."
}

$env:NODE_ENV = "production"
Set-Location $root
& $node (Join-Path $root "dist\server.cjs")
