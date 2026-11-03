param(
  [string]$OutputPath = "migration/sqlserver-export.json",
  [string]$ConnectionString = "Server=localhost;Database=RepairDB;Integrated Security=True;TrustServerCertificate=True;"
)

$ErrorActionPreference = "Stop"
$outputFile = [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$outputDirectory = [IO.Path]::GetDirectoryName($outputFile)
[IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

function Get-SqlRows([System.Data.SqlClient.SqlConnection]$Connection, [string]$Query) {
  $command = $Connection.CreateCommand()
  $command.CommandText = $Query
  $command.CommandTimeout = 120
  $adapter = New-Object System.Data.SqlClient.SqlDataAdapter $command
  $table = New-Object System.Data.DataTable
  [void]$adapter.Fill($table)

  $rows = @()
  foreach ($row in $table.Rows) {
    $item = [ordered]@{}
    foreach ($column in $table.Columns) {
      $value = $row[$column.ColumnName]
      if ($value -is [System.DBNull]) {
        $item[$column.ColumnName] = $null
      } elseif ($value -is [DateTime]) {
        $item[$column.ColumnName] = $value.ToString("o")
      } else {
        $item[$column.ColumnName] = $value
      }
    }
    $rows += [pscustomobject]$item
  }
  return $rows
}

$connection = New-Object System.Data.SqlClient.SqlConnection $ConnectionString
$connection.Open()
try {
  $export = [ordered]@{
    sourceDatabase = "RepairDB"
    sourceServer = "localhost"
    exportedAt = [DateTime]::UtcNow.ToString("o")
    repairs = @(Get-SqlRows $connection "SELECT * FROM dbo.Repairs ORDER BY ID")
    users = @(Get-SqlRows $connection "SELECT * FROM dbo.Users ORDER BY ID")
    auditLog = @(Get-SqlRows $connection "SELECT * FROM dbo.AuditLog ORDER BY Id")
  }
} finally {
  $connection.Close()
  $connection.Dispose()
}

$json = $export | ConvertTo-Json -Depth 12
[IO.File]::WriteAllText($outputFile, $json, [Text.UTF8Encoding]::new($false))
Write-Output ("Exported SQL Server data to {0}: repairs={1}, users={2}, auditLog={3}" -f $outputFile, $export.repairs.Count, $export.users.Count, $export.auditLog.Count)
