[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $projectRoot 'build\icon.svg'
$output = Join-Path $projectRoot 'build\icon.ico'
$magick = (Get-Command magick -ErrorAction Stop).Source
$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "clip-cache-icon-$([Guid]::NewGuid().ToString('N'))"
$frames = @()

New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null

try {
  foreach ($size in @(256, 128, 64, 48, 32, 16)) {
    $frame = Join-Path $temporaryDirectory "icon-$size.png"
    & $magick -background none $source -resize "${size}x${size}" -alpha on -channel A -level '6%,100%' +channel $frame
    if ($LASTEXITCODE -ne 0) {
      throw "ImageMagick no pudo generar el frame de ${size}px."
    }
    $frames += $frame
  }

  & $magick @frames $output
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $output -PathType Leaf)) {
    throw 'ImageMagick no pudo generar build/icon.ico.'
  }
}
finally {
  foreach ($frame in $frames) {
    if (Test-Path -LiteralPath $frame -PathType Leaf) {
      Remove-Item -LiteralPath $frame -Force
    }
  }
  if (Test-Path -LiteralPath $temporaryDirectory -PathType Container) {
    Remove-Item -LiteralPath $temporaryDirectory -Force
  }
}

Write-Output "Icono generado con esquinas transparentes: $output"
