$ErrorActionPreference = 'SilentlyContinue'

Write-Host "=== FULL DISK ANALYSIS ===" -ForegroundColor Cyan
Write-Host ""

# Check Google folder
Write-Host "Google folder breakdown:" -ForegroundColor Yellow
$googlePath = 'C:\Users\rorie\AppData\Local\Google'
Get-ChildItem $googlePath -Directory -Force | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1GB
    Write-Host ("{0,8} GB - {1}" -f [math]::Round($size,2), $_.Name)
}

Write-Host ""
Write-Host "Other potential space hogs:" -ForegroundColor Yellow

# Windows Temp
$winTemp = (Get-ChildItem 'C:\Windows\Temp' -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1GB
Write-Host ("{0,8} GB - Windows\Temp" -f [math]::Round($winTemp,2))

# User Temp
$userTemp = (Get-ChildItem 'C:\Users\rorie\AppData\Local\Temp' -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1GB
Write-Host ("{0,8} GB - User Temp folder" -f [math]::Round($userTemp,2))

# npm cache
$npmCache = (Get-ChildItem 'C:\Users\rorie\AppData\Local\npm-cache' -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1GB
Write-Host ("{0,8} GB - npm cache" -f [math]::Round($npmCache,2))

# Discord cache
$discord = (Get-ChildItem 'C:\Users\rorie\AppData\Local\Discord' -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1GB
Write-Host ("{0,8} GB - Discord" -f [math]::Round($discord,2))

# Windows Update cache
$wuCache = (Get-ChildItem 'C:\Windows\SoftwareDistribution\Download' -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1GB
Write-Host ("{0,8} GB - Windows Update cache" -f [math]::Round($wuCache,2))

# Recycle Bin
Write-Host ""
Write-Host "Recycle Bin:" -ForegroundColor Yellow
$shell = New-Object -ComObject Shell.Application
$recycleBin = $shell.NameSpace(0x0a)
$rbSize = ($recycleBin.Items() | ForEach-Object { $recycleBin.GetDetailsOf($_, 2) })
Write-Host "Items in Recycle Bin: $($recycleBin.Items().Count)"

Write-Host ""
Write-Host "Large game/app folders in Program Files:" -ForegroundColor Yellow
Get-ChildItem 'C:\Program Files' -Directory -Force | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1GB
    if ($size -ge 1) {
        Write-Host ("{0,8} GB - {1}" -f [math]::Round($size,2), $_.Name)
    }
}

Write-Host ""
Get-ChildItem 'C:\Program Files (x86)' -Directory -Force | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1GB
    if ($size -ge 1) {
        Write-Host ("{0,8} GB - {1}" -f [math]::Round($size,2), $_.Name)
    }
}

# Check for hibernation file
Write-Host ""
Write-Host "System files:" -ForegroundColor Yellow
if (Test-Path 'C:\hiberfil.sys') {
    $hiberSize = (Get-Item 'C:\hiberfil.sys' -Force).Length / 1GB
    Write-Host ("{0,8} GB - hiberfil.sys (hibernation)" -f [math]::Round($hiberSize,2))
}
if (Test-Path 'C:\pagefile.sys') {
    $pageSize = (Get-Item 'C:\pagefile.sys' -Force).Length / 1GB
    Write-Host ("{0,8} GB - pagefile.sys (virtual memory)" -f [math]::Round($pageSize,2))
}
