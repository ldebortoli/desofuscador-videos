[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$package = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'package.json') | ConvertFrom-Json
$artifact = Join-Path $projectRoot "release\Clip-Cache-Inspector-$($package.version)-x64.exe"
$icon = Join-Path $projectRoot 'build\icon.ico'
$shortcutDirectory = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Codex\CODEX APPS'
$shortcutPath = Join-Path $shortcutDirectory 'Clip Cache Inspector.lnk'

foreach ($required in @($artifact, $icon)) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
    throw "No se encontro el archivo requerido: $required"
  }
}

New-Item -ItemType Directory -Path $shortcutDirectory -Force | Out-Null
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $artifact
$shortcut.WorkingDirectory = Split-Path -Parent $artifact
$shortcut.IconLocation = "$icon,0"
$shortcut.Description = 'Localiza el MP4 interno mas reciente de CapCut'
$shortcut.WindowStyle = 1
$shortcut.Save()

$verified = $shell.CreateShortcut($shortcutPath)
if ($verified.TargetPath -ne $artifact -or ($verified.IconLocation -split ',')[0] -ne $icon) {
  throw 'El acceso directo no conservo el ejecutable o icono esperado'
}

Write-Output "Acceso instalado y verificado: $shortcutPath"
