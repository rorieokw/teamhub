$ErrorActionPreference = 'SilentlyContinue'

Write-Host "=== AppData Breakdown ===" -ForegroundColor Cyan
Write-Host ""

$appdataFolders = @('Local', 'LocalLow', 'Roaming')

foreach ($sub in $appdataFolders) {
    $path = "C:\Users\rorie\AppData\$sub"
    Write-Host "$sub folder contents:" -ForegroundColor Yellow

    $folders = Get-ChildItem $path -Directory -Force -ErrorAction SilentlyContinue
    $results = @()
    foreach ($folder in $folders) {
        $size = (Get-ChildItem $folder.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
        $sizeGB = [math]::Round($size / 1GB, 2)
        if ($sizeGB -ge 0.1) {
            $results += [PSCustomObject]@{Size=$sizeGB; Path=$folder.Name}
        }
    }
    $results | Sort-Object Size -Descending | Select-Object -First 15 | ForEach-Object {
        Write-Host ("{0,10} GB  {1}" -f $_.Size, $_.Path)
    }
    Write-Host ""
}
