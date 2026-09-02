$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Add-Type -Path @(
    (Join-Path $projectRoot 'resources/BdveMp4Index.cs'),
    (Join-Path $projectRoot 'resources/BdvePattern.cs'),
    (Join-Path $PSScriptRoot 'BdveRegression.cs')
)
[BdveRegression]::Run()
