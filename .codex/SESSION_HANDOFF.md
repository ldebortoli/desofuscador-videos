# Session handoff

## Objetivo general

Entregar una aplicacion Windows independiente para detectar el MP4 interno mas reciente de CapCut, analizarlo, recuperar recursos BDVE compatibles y administrar de forma segura el contenido de su carpeta.

## Tarea actual

Entrega 0.6.2 completada: salida H.264 predeterminada, validacion real de miniatura/codec/audio, tests, portable y acceso actualizados. Codigo y memoria se publican en origin/main; no esperar ni monitorear CI. La verificacion manual del acceso permanece bloqueada por el mecanismo Computer Use, no por un fallo del paquete (E2E aprobado).

## Validacion 0.6.2

- Perfil centralizado en resources/H264Output.ps1: h264_mf software, calidad 90, perfil High (100), avc1/yuv420p; audio copiado, timestamps conservados y padding minimo para dimensiones pares. Verifica todas las pistas de video y decodifica todo el video/audio antes de guardar.
- CapCut 9.4.0.4006 incluye h264_mf pero no libx264. Se uso el encoder de Windows para no agregar dependencias ni exigir una GPU particular. Conversion con perdida documentada; no prometer identica calidad o tamano.
- Clip entregado: `%USERPROFILE%/Videos/Cortos/9dd88057da9b3602a15d89b0abd06e65_h264.mp4`, 47930845 bytes, SHA-256 56332EA1372369397711FB11C6A742ABC530A4319A74A0B1F75E80B010AE6ACD.
- ffprobe confirma H.264 High, avc1, yuv420p, 1080x1920/30fps, 817 fotogramas y 27.237007 s con AAC. Hash de paquetes de audio identico a la copia HEVC: 759e232cd7b24af7f951443a9a1ddb011747476f9b466e8ef9d1b03f0770cd27. SHA-256 original sin cambios.
- IShellItemImageFactory con THUMBNAILONLY genero miniatura real 144x256. Captura `.codex/qa-h264-thumbnail.png` revisada; no publicar ese contenido personal.
- Script empaquetado probado tambien con recurso H.264 anterior: salida H.264/yuv420p de 351 cuadros y decodificacion completa. Copia temporal retirada tras comprobar su hash; salidas previas de Cortos intactas.
- Quality, audit runtime (0 vulnerabilidades), 55/55 pruebas, 100% cobertura V8 del nucleo TypeScript (mismas 270 sentencias/239 ramas/68 funciones/228 lineas), 126 comprobaciones C# y 34 PowerShell del nuevo perfil.
- E2E desarrollo y win-unpacked aprobados, incluyendo texto de salida H.264, error/reintento, acciones en una fila, destino configurable y limpieza cancelada. Captura qa-actions revisada.
- Portable 0.6.2: 111086247 bytes, SHA-256 716E7879FE60A534A872EBCBF4A9AC63E6FCFB8F835C3E12107DDB1FA35C3563. Acceso e icono apuntan a ese artefacto; ProductVersion 0.6.2 verificada.
- Computer Use leyo el acceso en Explorer, pero el clic por elemento devolvio coordinate input geometry is unavailable; Ctrl+L/Alt+D no mostraron cambio de foco verificable. No insistir. Ultimo intento septiembre 2026; usar E2E/API como fallback. La captura nativa sigue incompatible y no se volvio a intentar.
- Secret Scanning/Push Protection habilitados; autor noreply conservado. No se ejecutaron workflows remotos costosos ni se monitoreo CI.

Consulta posterior sobre miniaturas diagnosticada (2026-09-02), sin cambios de aplicacion ni Windows: los dos MP4 recuperados en Cortos son HEVC Main 10/hvc1 de 10 bits. La API de miniaturas de Windows devuelve bitmap para H.264 y 0x8004B200 para ambos HEVC. IconsOnly=0; Get-AppxPackage ejecutado explicitamente en Windows PowerShell 5.1 no encuentra paquetes HEVC del usuario. No afirmar que falta una imagen embebida: Windows extrae fotogramas y requiere soporte del codec. La app conserva el codec con -c copy. No instalar codecs ni convertir videos sin pedido. Get-AppxPackage no funciona en este host PowerShell 7; usar el ejecutable completo WindowsPowerShell/v1.0/powershell.exe para esa consulta.

Correccion 0.6.1 implementada, validada, empaquetada y acceso actualizado. La entrega se publica en origin/main; no monitorear CI en este pedido. Verificacion visual final del acceso bloqueada por interrupcion del usuario de Computer Use; no retomar inputs en este turno.

Resuelto el caso de la captura: el audio tenia parte del indice XOR y los paquetes HEVC saltaban varios ciclos. El fallback lee tablas de video intactas; el detector usa residuos de posiciones sin asumir ciclos consecutivos. Solo acepta la configuracion verificada por SHA-256 y conserva todas las pistas en el remux final.

## Validacion 0.6.1

- Quality completo; auditoria runtime sin vulnerabilidades. 54/54 pruebas y 126 comprobaciones nativas sobre MP4 sinteticos, sin contenido personal ni dependencia de CapCut en CI.
- Cobertura V8 TypeScript: 100% sentencias 270/270, ramas 239/239, funciones 68/68, lineas 228/228; umbrales 100%. No atribuir esa cobertura a C#/PowerShell.
- E2E Electron de desarrollo y win-unpacked correctos, incluido error IPC legible y reintento. Captura `.codex/qa-actions.png` revisada.
- Recurso HEVC: `9dd88057da9b3602a15d89b0abd06e65.mp4`; SHA-256 original antes/despues EA8ED4DC2F3653BC803F4D270A7BA38BA9854BDBE2169ABD75D96CEB5E2503DE.
- Parametros: clave 0x6e, periodo 23747 y longitud 8656. Salida `%USERPROFILE%/Videos/Cortos/9dd88057da9b3602a15d89b0abd06e65_desofuscado.mp4`: 28323039 bytes, SHA-256 D5ED68CEA7FA95D8BADCD8CEEAFFD33761EDB94051426C9E4F676A26BC5937E7.
- Verificados 817 cuadros HEVC 1080x1920, 27.233333 s y AAC 27.237007 s. Decodificacion completa sin errores. El script empaquetado repitio la recuperacion completa con todos sus auxiliares.
- Regresion real H.264 anterior correcta: clave 0x96, periodo 613289, longitud 141443 y decodificacion completa.
- `package.json` y lock sincronizados en 0.6.1; version gate incluye resources/ y verifica lock. Secret Scanning y Push Protection habilitados y verificados nuevamente.
- Computer Use: captura nativa fallo en septiembre 2026 con `SetIsBorderRequired / Interfaz no compatible (0x80004002)`. No repetir durante este run; usar capturas Electron. Accesibilidad funciono y Alt+F4 cerro la app anterior sin tocar CapCut.
- El usuario detuvo Computer Use con Escape durante la verificacion final. No emitir mas inputs ni lanzar ventanas en este turno. Lanzamiento final del acceso e identidad visual de la nueva version pendientes por esa interrupcion; E2E del paquete si esta validado.

## Estado actual

- Memoria persistente inicializada y reconciliada el 2026-08-29.
- Lic Dengue HQ quedo limpio; la integracion empezada alli fue retirada antes de crear este proyecto.
- Apps Dashboard fue inspeccionado y su contrato actual solo admite proyectos moviles; no se modificara para esta utilidad de escritorio.
- Raiz local: `%USERPROFILE%\Documents\Desofuscador Videos`.
- Remoto publico: `https://github.com/ldebortoli/desofuscador-videos.git`, rama `main`.
- Secret Scanning y Push Protection quedaron habilitados y verificados por API despues de hacer publico el repositorio.
- La interfaz, el fondo de arranque y el icono usan carbon calido, cobre apagado y crema; una prueba estatica impide reintroducir el turquesa anterior.
- Los seis frames ICO tienen alfa cero en sus cuatro esquinas; el acceso usa como fuente el portable versionado y solicita a Windows refrescar su cache de iconos.
- La UI muestra cuatro pasos de exportacion MP4/H.264, apertura de la carpeta final, aviso sobre recursos Pro y enlace a la ayuda oficial; la franja adapta cuatro, dos o una columna segun el ancho.
- El archivo elegido se analiza con ffprobe incluido; si falla, se consulta su JSON local `importcache3/mediainfo` antes de declarar el archivo incompleto.
- El archivo real `51fd486ce06f4055b949f4b19f65f3f4.mp4` tiene `isCryptorFile: 2`; el indice informa H.264, AAC, 1080x1920, 30 FPS y 11,7 s. El recurso pertenece al borrador `0828` y a `Clip combinado1`.
- El archivo auxiliar `51fd486ce06f4055b949f4b19f65f3f4.mp4.alpha.mp4` es un MP4 H.264 estandar de 1080x1920, 30 FPS y 11,7 s; funciona como pista/máscara auxiliar, no como el video final.
- Las rutas originales de `IMG_6854.MOV`, `IMG_6855.MOV` y los dos OGG ya no existen. El preset conserva copias hash de ambos MOV: `f67d...MOV` (17,8 s) y `e2d...MOV` (10,4 s), H.264/AAC 720x1280; el recurso combinado ya contiene una pista AAC. La reapertura puede funcionar, pero los OGG ausentes siguen siendo un riesgo.
- Desde 0.4.0, `Desofuscar` revalida el MP4, pide la salida, ejecuta oculto `resources/Desofuscar-Video.ps1` con el ffprobe incluido, conserva el original y revela la copia solo despues de una decodificacion completa.
- Desde 0.6.0, la salida inicial es `%USERPROFILE%\Videos\Cortos`, pero `Cambiar` abre un selector nativo y persiste una ruta absoluta en `output-settings.json` dentro de los datos locales de la app. `Abrir salida` y `Desofuscar` usan siempre la preferencia vigente.
- Las acciones visibles son `Abrir`, `Ruta`, `Abrir salida`, `Desofuscar` y `Limpiar carpeta`; una prueba E2E confirma que ocupan una sola fila a 840 px. `Limpiar carpeta` conserva la confirmacion nativa, la Papelera y la carpeta contenedora.
- El detector empaquetado se probo contra el recurso real: clave `0x96`, periodo 613.289, longitud XOR 141.443, H.264 1080x1920 de 351 cuadros + AAC, 11,702993 s, decodificacion completa y salida temporal eliminada.
- Validacion actual 0.6.1 detallada arriba; quality completo y escaneo de 65 archivos sin hallazgos.
- E2E Electron paso en desarrollo y contra `release/win-unpacked`: verifico selector/persistencia de salida, fila unica, nombre opcional, revelado, copia y cancelacion del vaciado; la vista compacta no desborda horizontalmente.
- El paquete real valido el hash observado con estado `Interno CapCut` y metadata H.264/AAC; captura revisada en `.codex/qa-actual-media.png`.
- Portable actual: `release/Desofuscador-Videos-0.6.2-x64.exe`; detalles de version y hash en Validacion 0.6.2.
- Acceso real: `%USERPROFILE%\Documents\Codex\CODEX APPS\Desofuscador Videos.lnk`; target e icono apuntan al portable 0.6.2 y fueron verificados. AppUserModelID estable `com.local.desofuscadorvideos`. Apertura manual bloqueada por Computer Use; E2E del paquete aprobado.
- CI: `Calidad` corre en push/PR; `E2E y portable de Windows` es manual, con timeout, cache, concurrencia cancelable y retencion de tres dias. No monitorear CI tras el push salvo pedido explicito.

## Proximos pasos

1. Verificar apertura manual del acceso 0.6.2 cuando cambie el mecanismo de control o el usuario pueda comprobarlo. Respetar el presupuesto de reintentos de captura/clic incompatible.
2. Si CapCut cambia rutas internas, actualizar las definiciones centralizadas y sus pruebas.

## Riesgos

- CapCut puede cambiar sus rutas internas; mantener las tres raices centralizadas y cubiertas por pruebas.
- BDVE puede cambiar de version o tipo; las variantes distintas de version 1 / XOR tipo 3 se rechazan sin tocar el original.
- 0.6.1 necesita al menos una pista de video intacta y compatible para su fallback. Limites: 64 MiB de moov, un millon de muestras por pista, 20 millones de bytes de periodo, 200 millones de observaciones y 20 millones de candidatos SHA-256. Otras variantes se rechazan sin tocar el original.
- `Limpiar carpeta` vacia todos los hijos de la carpeta confirmada; mantener siempre la ruta exacta, Cancelar predeterminado, Papelera y la prueba que demuestra que la carpeta contenedora persiste.
- La utilidad no debe evolucionar hacia automatizacion de licencias.
