# Cari port kosong untuk hari acara (susunan: kurang konflik dulu)
$candidates = @(8088, 8090, 8765, 8888, 9000, 9080, 18080)
$root = Split-Path $PSScriptRoot -Parent

foreach ($port in $candidates) {
    $busy = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $busy) {
        Set-Content -Path (Join-Path $root "server_port.txt") -Value $port -Encoding ASCII -NoNewline
        Write-Output $port
        exit 0
    }
    $pid = $busy[0].OwningProcess
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    $name = if ($proc) { $proc.ProcessName } else { "?" }
    Write-Host "  Port $port sibuk: $name" -ForegroundColor DarkYellow
}

Write-Host "[RALAT] Semua port cadangan sibuk. Tutup program lain atau restart komputer." -ForegroundColor Red
exit 1
