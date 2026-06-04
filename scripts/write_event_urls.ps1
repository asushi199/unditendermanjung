param([int]$Port)
$root = Split-Path $PSScriptRoot -Parent
$path = Join-Path $root "ALAMAT_ACARA.txt"

$lines = @(
    "UNDI TENDER - ALAMAT UNTUK HARI ACARA",
    "Dijana: $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
    "Port dipilih: $Port",
    "",
    "Ganti IP dengan alamat WiFi/hotspot komputer pelayan (ipconfig).",
    "Contoh IP: 192.168.1.50",
    "",
    "Utama:       http://IP:$Port/",
    "Kaunter 1:   http://IP:$Port/register/1",
    "Kaunter 2:   http://IP:$Port/register/2",
    "Kaunter 3:   http://IP:$Port/register/3",
    "Kaunter 4:   http://IP:$Port/register/4",
    "Semak data:  http://IP:$Port/semak",
    "Urusetia:    http://IP:$Port/admin",
    "Paparan:     http://IP:$Port/display",
    "Panduan:     http://IP:$Port/panduan",
    "",
    "Pada komputer pelayan (tempatan):",
    "  http://127.0.0.1:$Port/register/1  (kaunter 1-4)"
)

Set-Content -Path $path -Value $lines -Encoding UTF8
Write-Host "URL disimpan: $path" -ForegroundColor Green
