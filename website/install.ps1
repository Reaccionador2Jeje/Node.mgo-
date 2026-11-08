# Node.mgo installer for Windows PowerShell.
# Usage: irm https://reaccionador2jeje.github.io/Node.mgo-/install.ps1 | iex
$ErrorActionPreference = 'Stop'

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
} catch {
    # PowerShell 7 negotiates TLS automatically.
}

$Repo = if ($env:NODE_MGO_REPO) { $env:NODE_MGO_REPO } else { 'Reaccionador2Jeje/Node.mgo-' }
$Version = if ($env:NODE_MGO_VERSION) { $env:NODE_MGO_VERSION } else { 'latest' }
$Asset = 'node_mgo-win-x64.exe'

if ($Version -eq 'latest') {
    $Url = "https://github.com/$Repo/releases/latest/download/$Asset"
} else {
    $Tag = if ($Version.StartsWith('v')) { $Version } else { "v$Version" }
    $Url = "https://github.com/$Repo/releases/download/$Tag/$Asset"
}

$InstallDir = if ($env:NODE_MGO_BIN_DIR) {
    $env:NODE_MGO_BIN_DIR
} else {
    Join-Path $env:LOCALAPPDATA 'Node.mgo\bin'
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$Target = Join-Path $InstallDir 'node_mgo.exe'

Write-Host "Downloading Node.mgo for Windows x64..."
Invoke-WebRequest -Uri $Url -OutFile $Target -UseBasicParsing

$MemingoShim = Join-Path $InstallDir 'memingo.cmd'
$MgoaShim = Join-Path $InstallDir 'mgoa.cmd'
Set-Content -Path $MemingoShim -Encoding ASCII -Value "@echo off`r`n`"%~dp0node_mgo.exe`" %*"
Set-Content -Path $MgoaShim -Encoding ASCII -Value "@echo off`r`n`"%~dp0node_mgo.exe`" mgoa %*"

$UserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not $UserPath) { $UserPath = '' }
$Parts = @($UserPath -split ';' | Where-Object { $_ })
if ($Parts -notcontains $InstallDir) {
    $NewPath = if ($UserPath.Trim()) { "$UserPath;$InstallDir" } else { $InstallDir }
    [Environment]::SetEnvironmentVariable('Path', $NewPath, 'User')
}
$env:Path = "$env:Path;$InstallDir"

Write-Host ''
Write-Host "Installed node_mgo, memingo and mgoa in $InstallDir"
& $Target --version
Write-Host ''
Write-Host "Open a new terminal if 'node_mgo' is not found in PATH."
Write-Host "Run 'node_mgo --help' to get started."
