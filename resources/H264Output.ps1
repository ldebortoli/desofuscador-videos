function Get-H264OutputArguments {
    # CapCut's FFmpeg includes Media Foundation, but not necessarily libx264.
    # Software mode does not depend on a particular GPU or its driver.
    # FF_PROFILE_H264_HIGH = 100 (h264_mf expects the numeric profile).
    return @(
        '-map', '0', '-c', 'copy',
        '-c:v', 'h264_mf', '-hw_encoding', '0',
        '-rate_control', 'quality', '-quality', '90', '-profile:v', '100',
        '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p',
        '-pix_fmt', 'yuv420p', '-tag:v', 'avc1', '-vsync', '0',
        '-movflags', '+faststart'
    )
}

function Assert-H264Output {
    param([Parameter(Mandatory)][string]$ProbeJson)

    $probe = $ProbeJson | ConvertFrom-Json
    if ($null -eq $probe -or -not $probe.PSObject.Properties['streams']) {
        throw 'No se pudo verificar el formato del video convertido.'
    }
    $videos = @($probe.streams | Where-Object {
        $_.PSObject.Properties['codec_type'] -and $_.codec_type -eq 'video'
    })
    if ($videos.Count -eq 0) {
        throw 'La salida no contiene una pista de video H.264.'
    }
    foreach ($video in $videos) {
        foreach ($field in @('codec_name', 'codec_tag_string', 'pix_fmt', 'width', 'height')) {
            if (-not $video.PSObject.Properties[$field]) {
                throw 'La salida no contiene toda la informacion necesaria para verificar H.264.'
            }
        }
        if ($video.codec_name -ne 'h264' -or $video.codec_tag_string -ne 'avc1' -or
            $video.pix_fmt -ne 'yuv420p' -or $video.width -le 0 -or $video.height -le 0 -or
            $video.width % 2 -ne 0 -or $video.height % 2 -ne 0) {
            throw 'La salida no cumple el formato compatible H.264 de 8 bits. No se guardo el resultado.'
        }
    }
}
