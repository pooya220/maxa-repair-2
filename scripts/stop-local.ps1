$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pgBin = Join-Path $root ".runtime\pgsql\bin"
$pgData = Join-Path $root ".runtime\pgdata"
if (Test-Path (Join-Path $pgData "PG_VERSION")) {
  & (Join-Path $pgBin "pg_ctl.exe") -D $pgData stop -m fast
}
