$ErrorActionPreference = 'SilentlyContinue'

Write-Host "=== DISK USAGE ANALYSIS ===" -ForegroundColor Cyan
Write-Host ""

# Main system folders
$mainFolders = @(
    'C:\Users',
    'C:\Windows',
    'C:\Program Files',
    'C:\Program Files (x86)',
    'C:\ProgramData'
)

Write-Host "Main System Folders:" -ForegroundColor Yellow
foreach ($path in $mainFolders) {
    if (Test-Path $path) {
        $size = (Get-ChildItem $path -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
        $sizeGB = [math]::Round($size / 1GB, 2)
        Write-Host ("{0,10} GB  {1}" -f $sizeGB, $path)
    }
}

Write-Host ""
Write-Host "User Profile Subfolders (C:\Users\rorie):" -ForegroundColor Yellow

$userFolders = Get-ChildItem 'C:\Users\rorie' -Directory -Force -ErrorAction SilentlyContinue
$results = @()
foreach ($folder in $userFolders) {
    $size = (Get-ChildItem $folder.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
    $sizeGB = [math]::Round($size / 1GB, 2)
    $results += [PSCustomObject]@{Size=$sizeGB; Path=$folder.Name}
}
$results | Sort-Object Size -Descending | ForEach-Object {
    Write-Host ("{0,10} GB  {1}" -f $_.Size, $_.Path)
}
