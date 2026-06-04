# Salin logo dari folder Logo/ ke frontend (jalankan selepas tukar logo)
$src = Join-Path $PSScriptRoot "..\Logo\logo ppd.png"
$dst = Join-Path $PSScriptRoot "..\frontend\public\ppd-logo.png"
if (-not (Test-Path -LiteralPath $src)) {
    Write-Warning "Logo tidak dijumpai: $src (abaikan jika sudah ada di frontend/public)"
    exit 0
}
Copy-Item -LiteralPath $src -Destination $dst -Force
Write-Host "OK: logo disalin ke frontend/public/ppd-logo.png"
Write-Host "Jalankan: cd frontend; npm run build"
