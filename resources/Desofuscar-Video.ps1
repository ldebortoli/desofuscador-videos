<#
.SYNOPSIS
Recupera MP4 de CapCut con firma BDVE version 1 y ofuscacion XOR tipo 3.

.DESCRIPTION
Detecta la clave comparando la cabecera cifrada con la caja MP4 obligatoria
"ftyp". Restaura temporalmente solo la cabecera, usa ffprobe para localizar
los paquetes H.264/H.265/AAC y observa sus cambios entre claro y XOR. Con esas
transiciones acota el periodo y la longitud cifrada, y acepta los parametros
solo si SHA-256(periodo_be + longitud_be + clave) coincide con la huella crpt
guardada en la caja bdve. Finalmente usa el descifrador local de CapCut, copia
los streams sin recodificarlos y decodifica la salida completa como validacion.

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\Desofuscar-Video.ps1 .\clip.mp4

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\Desofuscar-Video.ps1 .\clip.mp4 .\clip_limpio.mp4 -Force
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$InputPath = (Join-Path $PSScriptRoot 'video.mp4'),

    [Parameter(Position = 1)]
    [string]$OutputPath,

    [string]$FfprobePath,

    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-UInt32BigEndian {
    param(
        [Parameter(Mandatory)][byte[]]$Bytes,
        [int]$Offset = 0
    )

    return [long](
        ([long]$Bytes[$Offset] -shl 24) -bor
        ([long]$Bytes[$Offset + 1] -shl 16) -bor
        ([long]$Bytes[$Offset + 2] -shl 8) -bor
        [long]$Bytes[$Offset + 3]
    )
}

function Read-UInt64BigEndian {
    param(
        [Parameter(Mandatory)][byte[]]$Bytes,
        [int]$Offset = 0
    )

    [uint64]$value = 0
    for ($index = 0; $index -lt 8; $index++) {
        $value = ($value -shl 8) -bor [uint64]$Bytes[$Offset + $index]
    }
    return $value
}

function Convert-XorBytes {
    param(
        [Parameter(Mandatory)][byte[]]$Bytes,
        [Parameter(Mandatory)][byte]$Key
    )

    $result = [byte[]]::new($Bytes.Length)
    for ($index = 0; $index -lt $Bytes.Length; $index++) {
        $result[$index] = $Bytes[$index] -bxor $Key
    }
    return $result
}

function Convert-ToHex {
    param([Parameter(Mandatory)][byte[]]$Bytes)
    return ([BitConverter]::ToString($Bytes)).Replace('-', '')
}

function Get-CapCutFfmpeg {
    $appsPath = Join-Path $env:LOCALAPPDATA 'CapCut\Apps'
    if (-not (Test-Path -LiteralPath $appsPath -PathType Container)) {
        throw 'No se encontro CapCut instalado. El script necesita su descifrador BDVE local.'
    }

    $candidates = Get-ChildItem -LiteralPath $appsPath -Directory -ErrorAction SilentlyContinue |
        ForEach-Object {
            $ffmpegPath = Join-Path $_.FullName 'ffmpeg.exe'
            $decryptorPath = Join-Path $_.FullName 'libvecrptor.dll'
            if ((Test-Path -LiteralPath $ffmpegPath -PathType Leaf) -and
                (Test-Path -LiteralPath $decryptorPath -PathType Leaf)) {
                [pscustomobject]@{
                    Path = $ffmpegPath
                    Version = try { [version]$_.Name } catch { [version]'0.0' }
                }
            }
        } |
        Sort-Object Version -Descending

    $selected = $candidates | Select-Object -First 1
    if (-not $selected) {
        throw 'CapCut esta instalado, pero no se encontro ffmpeg.exe junto a libvecrptor.dll.'
    }
    return $selected.Path
}

function Get-Ffprobe {
    param([string]$ExplicitPath)

    if (-not [string]::IsNullOrWhiteSpace($ExplicitPath)) {
        $resolved = [IO.Path]::GetFullPath($ExplicitPath)
        if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
            throw "No se encontro el ffprobe indicado: $resolved"
        }
        return $resolved
    }

    $command = Get-Command 'ffprobe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $command) {
        throw 'No se encontro ffprobe en PATH. Instala FFmpeg para poder detectar los bloques automaticamente.'
    }
    return $command.Source
}

function Invoke-NativeTool {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$ArgumentList
    )

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = @(& $FilePath @ArgumentList 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }

    return [pscustomobject]@{
        ExitCode = $exitCode
        Output = $output
    }
}

function Get-HeaderInformation {
    param([Parameter(Mandatory)][string]$Path)

    $stream = [IO.File]::OpenRead($Path)
    try {
        if ($stream.Length -lt 68) {
            throw 'El archivo es demasiado pequeno para ser un MP4 BDVE valido.'
        }

        $signature = [byte[]]::new(8)
        if ($stream.Read($signature, 0, 8) -ne 8) {
            throw 'No se pudo leer la cabecera.'
        }

        $ftyp = [Text.Encoding]::ASCII.GetBytes('ftyp')
        [byte]$key = $signature[4] -bxor $ftyp[0]
        for ($index = 0; $index -lt 4; $index++) {
            if (($signature[4 + $index] -bxor $key) -ne $ftyp[$index]) {
                throw 'La cabecera no coincide con una ofuscacion XOR de un MP4 (ftyp).'
            }
        }
        if ($key -eq 0) {
            throw 'El MP4 ya tiene la cabecera en claro; no parece estar ofuscado.'
        }

        [long]$atomOffset = 0
        [long]$mediaDataOffset = 0
        for ($atomIndex = 0; $atomIndex -lt 32; $atomIndex++) {
            $stream.Position = $atomOffset
            $rawHeader = [byte[]]::new(8)
            if ($stream.Read($rawHeader, 0, 8) -ne 8) {
                throw 'La cabecera MP4 termino antes de encontrar el atomo mdat.'
            }
            [byte[]]$decodedHeader = Convert-XorBytes -Bytes $rawHeader -Key $key
            [uint64]$atomSize = Read-UInt32BigEndian -Bytes $decodedHeader
            $atomType = [Text.Encoding]::ASCII.GetString($decodedHeader, 4, 4)
            [long]$headerSize = 8

            if ($atomSize -eq 1) {
                $rawExtendedSize = [byte[]]::new(8)
                if ($stream.Read($rawExtendedSize, 0, 8) -ne 8) {
                    throw 'El tamano extendido del atomo MP4 esta incompleto.'
                }
                [byte[]]$decodedExtendedSize = Convert-XorBytes -Bytes $rawExtendedSize -Key $key
                $atomSize = Read-UInt64BigEndian -Bytes $decodedExtendedSize
                $headerSize = 16
            } elseif ($atomSize -eq 0) {
                $atomSize = [uint64]($stream.Length - $atomOffset)
            }

            if ($atomSize -lt [uint64]$headerSize -or
                $atomSize -gt [uint64]($stream.Length - $atomOffset)) {
                throw "Tamano invalido en el atomo '$atomType' del offset $atomOffset."
            }
            if ($atomType -eq 'mdat') {
                $mediaDataOffset = $atomOffset + $headerSize
                break
            }
            $atomOffset += [long]$atomSize
        }

        if ($mediaDataOffset -le 0) {
            throw 'No se encontro el atomo mdat.'
        }

        return [pscustomobject]@{
            Key = $key
            MediaDataOffset = $mediaDataOffset
        }
    } finally {
        $stream.Dispose()
    }
}

function Get-BdveInformation {
    param([Parameter(Mandatory)][string]$Path)

    $stream = [IO.File]::OpenRead($Path)
    try {
        if ($stream.Length -lt 68) {
            throw 'El archivo no puede contener la firma BDVE esperada.'
        }
        $stream.Position = $stream.Length - 68
        $trailer = [byte[]]::new(68)
        if ($stream.Read($trailer, 0, 68) -ne 68) {
            throw 'No se pudo leer la firma BDVE final.'
        }
    } finally {
        $stream.Dispose()
    }

    $outerSize = Read-UInt32BigEndian -Bytes $trailer -Offset 0
    $outerType = [Text.Encoding]::ASCII.GetString($trailer, 4, 4)
    $cryptSize = Read-UInt32BigEndian -Bytes $trailer -Offset 8
    $cryptTypeName = [Text.Encoding]::ASCII.GetString($trailer, 12, 4)
    $version = Read-UInt32BigEndian -Bytes $trailer -Offset 16
    $cryptorType = Read-UInt32BigEndian -Bytes $trailer -Offset 20

    if ($outerSize -ne 68 -or $outerType -ne 'bdve' -or
        $cryptSize -ne 48 -or $cryptTypeName -ne 'crpt') {
        throw 'No se encontro una firma BDVE/crpt compatible al final del archivo.'
    }
    if ($version -ne 1 -or $cryptorType -ne 3) {
        throw "La variante BDVE no esta soportada (version=$version, tipo=$cryptorType). Solo se admite XOR tipo 3."
    }

    return [pscustomobject]@{
        Version = $version
        CryptorType = $cryptorType
        ConfigHash = [byte[]]$trailer[24..55]
        ConfigHashHex = Convert-ToHex -Bytes ([byte[]]$trailer[24..55])
    }
}

function Test-AvccPacketStart {
    param(
        [Parameter(Mandatory)][byte[]]$Bytes,
        [Parameter(Mandatory)][long]$PacketSize,
        [Parameter(Mandatory)][string]$CodecName
    )

    if ($Bytes.Length -lt 6 -or $PacketSize -lt 6) {
        return $false
    }
    $nalSize = Read-UInt32BigEndian -Bytes $Bytes
    if ($nalSize -le 0 -or $nalSize -gt ($PacketSize - 4)) {
        return $false
    }

    if ($CodecName -eq 'h264') {
        $header = $Bytes[4]
        $nalType = $header -band 0x1F
        return (($header -band 0x80) -eq 0 -and $nalType -ge 1 -and $nalType -le 23)
    }
    if ($CodecName -eq 'hevc' -or $CodecName -eq 'h265') {
        $first = $Bytes[4]
        $second = $Bytes[5]
        return (($first -band 0x80) -eq 0 -and ($second -band 0x07) -ne 0)
    }
    return $false
}

function Get-PacketState {
    param(
        [Parameter(Mandatory)][byte[]]$RawBytes,
        [Parameter(Mandatory)][byte]$Key,
        [Parameter(Mandatory)][long]$PacketSize,
        [Parameter(Mandatory)]$StreamInformation
    )

    [byte[]]$decodedBytes = Convert-XorBytes -Bytes $RawBytes -Key $Key
    $rawValid = $false
    $decodedValid = $false

    if ($StreamInformation.codec_type -eq 'video' -and
        $StreamInformation.codec_name -in @('h264', 'hevc', 'h265')) {
        $rawValid = Test-AvccPacketStart -Bytes $RawBytes -PacketSize $PacketSize -CodecName $StreamInformation.codec_name
        $decodedValid = Test-AvccPacketStart -Bytes $decodedBytes -PacketSize $PacketSize -CodecName $StreamInformation.codec_name
    } elseif ($StreamInformation.codec_type -eq 'audio' -and
        $StreamInformation.codec_name -eq 'aac') {
        $channels = if ($null -ne $StreamInformation.channels) { [int]$StreamInformation.channels } else { 2 }
        $expectedElement = if ($channels -le 1) { 0 } else { 1 }
        $rawValid = (($RawBytes[0] -shr 5) -eq $expectedElement)
        $decodedValid = (($decodedBytes[0] -shr 5) -eq $expectedElement)
    }

    if ($rawValid -and -not $decodedValid) {
        return 'P'
    }
    if ($decodedValid -and -not $rawValid) {
        return 'E'
    }
    return '?'
}

function Initialize-RecoveryType {
    if ('BdveParameterRecovery' -as [type]) {
        return
    }

    Add-Type -TypeDefinition @'
using System;
using System.Security.Cryptography;

public static class BdveParameterRecovery
{
    public static int[] Recover(
        byte[] targetHash,
        byte key,
        int stepMinimum,
        int stepMaximum,
        long[] encryptedEndLowerBounds,
        long[] encryptedEndUpperBounds,
        long maximumCandidates)
    {
        if (targetHash == null || targetHash.Length != 32)
            throw new ArgumentException("The BDVE hash must contain 32 bytes.");
        if (encryptedEndLowerBounds == null || encryptedEndUpperBounds == null ||
            encryptedEndLowerBounds.Length != encryptedEndUpperBounds.Length)
            throw new ArgumentException("Invalid encrypted-end bounds.");

        byte[] configuration = new byte[9];
        configuration[8] = key;
        long tested = 0;

        using (SHA256 sha = SHA256.Create())
        {
            for (int step = stepMinimum; step <= stepMaximum; step++)
            {
                long lengthMinimum = 1;
                long lengthMaximum = step - 1L;

                for (int interval = 0; interval < encryptedEndLowerBounds.Length; interval++)
                {
                    long lower = (long)encryptedEndLowerBounds[interval] - ((long)interval * step) + 1L;
                    long upper = (long)encryptedEndUpperBounds[interval] - ((long)interval * step);
                    if (lower > lengthMinimum) lengthMinimum = lower;
                    if (upper < lengthMaximum) lengthMaximum = upper;
                }
                if (lengthMinimum > lengthMaximum || lengthMaximum > Int32.MaxValue)
                    continue;

                configuration[0] = (byte)(step >> 24);
                configuration[1] = (byte)(step >> 16);
                configuration[2] = (byte)(step >> 8);
                configuration[3] = (byte)step;

                for (int length = (int)Math.Max(1L, lengthMinimum);
                     length <= (int)lengthMaximum;
                     length++)
                {
                    tested++;
                    if (tested > maximumCandidates)
                        throw new InvalidOperationException("The automatic parameter search is too broad.");

                    configuration[4] = (byte)(length >> 24);
                    configuration[5] = (byte)(length >> 16);
                    configuration[6] = (byte)(length >> 8);
                    configuration[7] = (byte)length;

                    byte[] digest = sha.ComputeHash(configuration);
                    bool equal = true;
                    for (int index = 0; index < digest.Length; index++)
                    {
                        if (digest[index] != targetHash[index])
                        {
                            equal = false;
                            break;
                        }
                    }
                    if (equal)
                        return new int[] { step, length, (int)tested };
                }
            }
        }
        return new int[0];
    }
}
'@
}

function Find-BdveParameters {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$FfprobePath,
        [Parameter(Mandatory)][byte]$Key,
        [Parameter(Mandatory)][long]$MediaDataOffset,
        [Parameter(Mandatory)][byte[]]$ConfigHash,
        [Parameter(Mandatory)][string]$TemporaryProbePath
    )

    Copy-Item -LiteralPath $Path -Destination $TemporaryProbePath
    $temporaryStream = [IO.File]::Open(
        $TemporaryProbePath,
        [IO.FileMode]::Open,
        [IO.FileAccess]::ReadWrite,
        [IO.FileShare]::Read
    )
    try {
        if ($MediaDataOffset -gt [int]::MaxValue) {
            throw 'La cabecera MP4 es demasiado grande para analizarla.'
        }
        $prefix = [byte[]]::new([int]$MediaDataOffset)
        if ($temporaryStream.Read($prefix, 0, $prefix.Length) -ne $prefix.Length) {
            throw 'No se pudo leer la cabecera MP4 completa.'
        }
        for ($index = 0; $index -lt $prefix.Length; $index++) {
            $prefix[$index] = $prefix[$index] -bxor $Key
        }
        $temporaryStream.Position = 0
        $temporaryStream.Write($prefix, 0, $prefix.Length)
    } finally {
        $temporaryStream.Dispose()
    }

    $probeResult = Invoke-NativeTool -FilePath $FfprobePath -ArgumentList @(
        '-v', 'quiet',
        '-show_streams', '-show_packets',
        '-show_entries', 'stream=index,codec_type,codec_name,channels:packet=stream_index,pos,size',
        '-of', 'json',
        $TemporaryProbePath
    )
    if ($probeResult.ExitCode -ne 0) {
        throw "ffprobe no pudo leer la tabla de muestras:`n$($probeResult.Output -join [Environment]::NewLine)"
    }
    $probe = ($probeResult.Output -join [Environment]::NewLine) | ConvertFrom-Json
    if (-not $probe.streams -or -not $probe.packets) {
        throw 'ffprobe no encontro streams o paquetes en el MP4.'
    }

    $streamMap = @{}
    foreach ($streamInformation in $probe.streams) {
        $streamMap[[int]$streamInformation.index] = $streamInformation
    }

    $states = [Collections.Generic.List[object]]::new()
    $sourceStream = [IO.File]::OpenRead($Path)
    try {
        foreach ($packet in $probe.packets) {
            $streamIndex = [int]$packet.stream_index
            if (-not $streamMap.ContainsKey($streamIndex) -or
                $null -eq $packet.pos -or $null -eq $packet.size) {
                continue
            }
            $streamInformation = $streamMap[$streamIndex]
            if ($streamInformation.codec_name -notin @('h264', 'hevc', 'h265', 'aac')) {
                continue
            }

            [long]$position = $packet.pos
            [long]$packetSize = $packet.size
            if ($position -lt 0 -or $packetSize -le 0 -or $position -ge $sourceStream.Length) {
                continue
            }
            $readSize = [int][Math]::Min(8, $packetSize)
            $rawBytes = [byte[]]::new($readSize)
            $sourceStream.Position = $position
            if ($sourceStream.Read($rawBytes, 0, $readSize) -ne $readSize) {
                continue
            }
            $state = Get-PacketState `
                -RawBytes $rawBytes `
                -Key $Key `
                -PacketSize $packetSize `
                -StreamInformation $streamInformation
            if ($state -ne '?') {
                $states.Add([pscustomobject]@{
                    Position = $position
                    State = $state
                })
            }
        }
    } finally {
        $sourceStream.Dispose()
    }

    $orderedStates = @($states | Sort-Object Position)
    if ($orderedStates.Count -lt 20) {
        throw 'No hubo suficientes paquetes H.264/H.265/AAC clasificables para detectar el patron.'
    }
    if ($orderedStates[0].State -ne 'E') {
        throw 'El primer bloque multimedia clasificable no aparece cifrado como espera BDVE tipo 3.'
    }

    $plainToEncrypted = [Collections.Generic.List[object]]::new()
    $encryptedToPlain = [Collections.Generic.List[object]]::new()
    for ($index = 1; $index -lt $orderedStates.Count; $index++) {
        $previous = $orderedStates[$index - 1]
        $current = $orderedStates[$index]
        if ($previous.State -eq 'P' -and $current.State -eq 'E') {
            $plainToEncrypted.Add([pscustomobject]@{
                Lower = [long]$previous.Position
                Upper = [long]$current.Position
            })
        } elseif ($previous.State -eq 'E' -and $current.State -eq 'P') {
            $encryptedToPlain.Add([pscustomobject]@{
                Lower = [long]$previous.Position
                Upper = [long]$current.Position
            })
        }
    }

    if ($plainToEncrypted.Count -lt 2 -or $encryptedToPlain.Count -lt 3) {
        throw 'El video es demasiado corto o no contiene suficientes alternancias para recuperar los parametros.'
    }
    if ($encryptedToPlain.Count -lt $plainToEncrypted.Count -or
        $encryptedToPlain.Count -gt ($plainToEncrypted.Count + 1)) {
        throw 'Las transiciones detectadas no forman un patron periodico BDVE confiable.'
    }

    [long]$stepMinimum = 1
    [long]$stepMaximum = [int]::MaxValue
    for ($index = 0; $index -lt $plainToEncrypted.Count; $index++) {
        [long]$intervalNumber = $index + 1
        [long]$minimumForTransition = [Math]::Floor($plainToEncrypted[$index].Lower / $intervalNumber) + 1
        [long]$maximumForTransition = [Math]::Floor($plainToEncrypted[$index].Upper / $intervalNumber)
        $stepMinimum = [Math]::Max($stepMinimum, $minimumForTransition)
        $stepMaximum = [Math]::Min($stepMaximum, $maximumForTransition)
    }

    if ($stepMinimum -gt $stepMaximum -or $stepMaximum -gt [int]::MaxValue) {
        throw 'No se pudo acotar un periodo BDVE coherente.'
    }

    $endLowerBounds = [long[]]::new($encryptedToPlain.Count)
    $endUpperBounds = [long[]]::new($encryptedToPlain.Count)
    for ($index = 0; $index -lt $encryptedToPlain.Count; $index++) {
        $endLowerBounds[$index] = [long]$encryptedToPlain[$index].Lower
        $endUpperBounds[$index] = [long]$encryptedToPlain[$index].Upper
    }

    Initialize-RecoveryType
    $recovered = [BdveParameterRecovery]::Recover(
        $ConfigHash,
        $Key,
        [int]$stepMinimum,
        [int]$stepMaximum,
        $endLowerBounds,
        $endUpperBounds,
        20000000
    )
    if ($recovered.Length -ne 3) {
        throw 'Las transiciones no produjeron parametros que coincidan con la huella SHA-256 de BDVE.'
    }

    return [pscustomobject]@{
        Step = $recovered[0]
        Length = $recovered[1]
        Key = [int]$Key
        CandidatesTested = $recovered[2]
        DefinitePackets = $orderedStates.Count
        Cycles = $plainToEncrypted.Count
    }
}

$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
$inputItem = Get-Item -LiteralPath $resolvedInput
if ($inputItem.PSIsContainer) {
    throw "La entrada no es un archivo: $resolvedInput"
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $inputItem.DirectoryName ($inputItem.BaseName + '_desofuscado.mp4')
}
$resolvedOutput = [IO.Path]::GetFullPath($OutputPath)
if ([StringComparer]::OrdinalIgnoreCase.Equals($resolvedInput, $resolvedOutput)) {
    throw 'La salida debe ser distinta del archivo original.'
}
if ((Test-Path -LiteralPath $resolvedOutput) -and -not $Force) {
    throw "La salida ya existe. Usa -Force para reemplazarla: $resolvedOutput"
}

$outputDirectory = [IO.Path]::GetDirectoryName($resolvedOutput)
if (-not (Test-Path -LiteralPath $outputDirectory -PathType Container)) {
    throw "No existe la carpeta de salida: $outputDirectory"
}

$ffmpeg = Get-CapCutFfmpeg
$ffprobe = Get-Ffprobe -ExplicitPath $FfprobePath
$headerInformation = Get-HeaderInformation -Path $resolvedInput
$bdveInformation = Get-BdveInformation -Path $resolvedInput

$temporaryBase = '.' + [IO.Path]::GetFileNameWithoutExtension($resolvedOutput) + '.' + [guid]::NewGuid().ToString('N')
$temporaryProbe = Join-Path $outputDirectory ($temporaryBase + '.probe.mp4')
$temporaryOutput = Join-Path $outputDirectory ($temporaryBase + '.output.mp4')
$completed = $false

try {
    Write-Host "Clave XOR detectada: 0x$('{0:X2}' -f $headerInformation.Key)"
    Write-Host "Huella BDVE: $($bdveInformation.ConfigHashHex)"
    Write-Host 'Detectando el patron de bloques...'
    $parameters = Find-BdveParameters `
        -Path $resolvedInput `
        -FfprobePath $ffprobe `
        -Key $headerInformation.Key `
        -MediaDataOffset $headerInformation.MediaDataOffset `
        -ConfigHash $bdveInformation.ConfigHash `
        -TemporaryProbePath $temporaryProbe

    Write-Host "Periodo detectado: $($parameters.Step) bytes"
    Write-Host "Longitud XOR: $($parameters.Length) bytes por periodo"
    Write-Host "Paquetes usados: $($parameters.DefinitePackets); ciclos: $($parameters.Cycles)"
    Write-Host 'Desofuscando sin recodificar audio ni video...'

    $conversionResult = Invoke-NativeTool -FilePath $ffmpeg -ArgumentList @(
        '-hide_banner', '-loglevel', 'warning',
        '-decryptor_step', [string]$parameters.Step,
        '-decryptor_length', [string]$parameters.Length,
        '-decryptor_key', [string]$parameters.Key,
        '-i', $resolvedInput,
        '-map', '0', '-c', 'copy', '-movflags', '+faststart', '-y', $temporaryOutput
    )
    if ($conversionResult.ExitCode -ne 0) {
        throw "CapCut/FFmpeg no pudo desofuscar el video:`n$($conversionResult.Output -join [Environment]::NewLine)"
    }

    Write-Host 'Validando la decodificacion completa...'
    $validationResult = Invoke-NativeTool -FilePath $ffmpeg -ArgumentList @(
        '-hide_banner', '-loglevel', 'error', '-xerror',
        '-i', $temporaryOutput,
        '-map', '0:v:0', '-map', '0:a:0?', '-f', 'null', 'NUL'
    )
    if ($validationResult.ExitCode -ne 0) {
        throw "La validacion detecto datos multimedia danados:`n$($validationResult.Output -join [Environment]::NewLine)"
    }

    Move-Item -LiteralPath $temporaryOutput -Destination $resolvedOutput -Force:$Force
    $completed = $true
    $result = Get-Item -LiteralPath $resolvedOutput
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedOutput).Hash
    Write-Host "Listo: $($result.FullName)"
    Write-Host "Tamano: $($result.Length) bytes"
    Write-Host "SHA-256: $hash"
} finally {
    foreach ($temporaryPath in @($temporaryProbe, $temporaryOutput)) {
        if (Test-Path -LiteralPath $temporaryPath -PathType Leaf) {
            Remove-Item -LiteralPath $temporaryPath -Force
        }
    }
}
