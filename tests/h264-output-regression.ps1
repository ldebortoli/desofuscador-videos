$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path (Split-Path -Parent $PSScriptRoot) 'resources/H264Output.ps1')

$checks = 0
function Assert-Equal($Actual, $Expected) {
    if ($Actual -ne $Expected) { throw "Expected '$Expected', received '$Actual'" }
    $script:checks++
}
function Assert-Rejected([string]$Json) {
    $rejected = $false
    try { Assert-H264Output -ProbeJson $Json } catch { $rejected = $true }
    if (-not $rejected) { throw "Accepted invalid output: $Json" }
    $script:checks++
}

$arguments = @(Get-H264OutputArguments)
foreach ($pair in @(
    @('-map', '0'), @('-c', 'copy'), @('-c:v', 'h264_mf'),
    @('-hw_encoding', '0'), @('-rate_control', 'quality'), @('-quality', '90'),
    @('-profile:v', '100'), @('-pix_fmt', 'yuv420p'), @('-tag:v', 'avc1'),
    @('-movflags', '+faststart'), @('-vsync', '0'),
    @('-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p')
)) {
    $index = [Array]::IndexOf($arguments, $pair[0])
    if ($index -lt 0) { throw "Missing output option $($pair[0])" }
    Assert-Equal $arguments[$index + 1] $pair[1]
}
Assert-Equal ($arguments -contains '-r') $false
Assert-Equal ($arguments -contains '-c:a') $false

$video = [ordered]@{
    codec_type = 'video'; codec_name = 'h264'; codec_tag_string = 'avc1'
    pix_fmt = 'yuv420p'; width = 1080; height = 1920
}
foreach ($streams in @(@($video), @($video, @{codec_type='audio';codec_name='aac'}), @($video, $video))) {
    Assert-H264Output -ProbeJson (@{streams=$streams} | ConvertTo-Json -Depth 4)
    $checks++
}
foreach ($json in @('null', '{}', '{"streams":[]}', '{"streams":[{"codec_type":"audio"}]}', 'not json')) {
    Assert-Rejected $json
}
foreach ($pair in @(
    @('codec_name', 'hevc'), @('codec_tag_string', 'hev1'), @('pix_fmt', 'yuv420p10le'),
    @('width', 0), @('height', 0), @('width', 1081), @('height', 1921)
)) {
    $invalid = [ordered]@{}
    foreach ($key in $video.Keys) { $invalid[$key] = $video[$key] }
    $invalid[$pair[0]] = $pair[1]
    Assert-Rejected (@{streams=@($video, $invalid)} | ConvertTo-Json -Depth 4)
}
foreach ($field in @('codec_name', 'codec_tag_string', 'pix_fmt', 'width', 'height')) {
    $incomplete = [ordered]@{}
    foreach ($key in $video.Keys) { if ($key -ne $field) { $incomplete[$key] = $video[$key] } }
    Assert-Rejected (@{streams=@($incomplete)} | ConvertTo-Json -Depth 4)
}
Write-Output "H264 output regression OK: $checks assertions."
