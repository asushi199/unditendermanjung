param([int]$Port = 8088)
$listen = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $listen) { exit 0 }
$pid = $listen[0].OwningProcess
$proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
$name = if ($proc) { $proc.ProcessName } else { "PID $pid" }
Write-Host "[AMARAN] Port $Port digunakan oleh: $name (PID $pid)" -ForegroundColor Yellow
if ($name -like "*Acer*") {
    Write-Host "        Ini perisian Acer (bukan UndiTender). Guna port 8088 dalam start_server.bat." -ForegroundColor Yellow
}
exit 1
