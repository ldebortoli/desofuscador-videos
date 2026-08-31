[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$package = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'package.json') | ConvertFrom-Json
$artifact = Join-Path $projectRoot "release\Clip-Cache-Inspector-$($package.version)-x64.exe"
$shortcutDirectory = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Codex\CODEX APPS'
$shortcutPath = Join-Path $shortcutDirectory 'Clip Cache Inspector.lnk'

if (-not (Test-Path -LiteralPath $artifact -PathType Leaf)) {
  throw "No se encontro el ejecutable requerido: $artifact"
}

New-Item -ItemType Directory -Path $shortcutDirectory -Force | Out-Null
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $artifact
$shortcut.WorkingDirectory = Split-Path -Parent $artifact
$shortcut.IconLocation = "$artifact,0"
$shortcut.Description = 'Localiza, analiza y recupera MP4 internos de CapCut'
$shortcut.WindowStyle = 1
$shortcut.Save()

$verified = $shell.CreateShortcut($shortcutPath)
if ($verified.TargetPath -ne $artifact -or ($verified.IconLocation -split ',')[0] -ne $artifact) {
  throw 'El acceso directo no conservo el ejecutable o icono esperado'
}

$iconRefresh = Join-Path $env:WINDIR 'System32\ie4uinit.exe'
if (Test-Path -LiteralPath $iconRefresh -PathType Leaf) {
  Start-Process -FilePath $iconRefresh -ArgumentList '-show' -WindowStyle Hidden -Wait
}

Write-Output "Acceso instalado y verificado: $shortcutPath"
