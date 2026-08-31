# Session handoff

## Objetivo general

Entregar una aplicacion Windows independiente para detectar el MP4 interno mas reciente de CapCut, analizarlo, recuperar recursos BDVE compatibles y administrar de forma segura el contenido de su carpeta.

## Tarea actual

No hay implementacion activa. El run fallido `33401317136` no fue cuota ni timeout: el checkout Windows con CRLF hizo que Prettier marcara 42 archivos. `.gitattributes` fijo LF, el checkout representativo local paso y el run de reemplazo `33404655940` termino completo en verde. Las acciones oficiales quedaron actualizadas a v7 para eliminar la advertencia del runtime Node.js antiguo.

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
- Validacion 0.6.0: quality completo, escaneo de 58 archivos, audit runtime con 0 vulnerabilidades, 51/51 pruebas y cobertura 100% en lineas, ramas, funciones y sentencias.
- E2E Electron paso en desarrollo y contra `release/win-unpacked`: verifico selector/persistencia de salida, fila unica, nombre opcional, revelado, copia y cancelacion del vaciado; la vista compacta no desborda horizontalmente.
- El paquete real valido el hash observado con estado `Interno CapCut` y metadata H.264/AAC; captura revisada en `.codex/qa-actual-media.png`.
- Portable: `release/Desofuscador-Videos-0.6.0-x64.exe`, 111.093.278 bytes, SHA-256 `00F5C58331A11738FA402A248B0386CAA6440796FD2403F6F4688431F820F4A4`.
- Acceso real: `%USERPROFILE%\Documents\Codex\CODEX APPS\Desofuscador Videos.lnk`; target e icono apuntan al portable 0.6.0 y el acceso anterior fue retirado. El lanzamiento real mostro una sola ventana, AppUserModelID `com.local.desofuscadorvideos`, icono nativo de clase y 0 procesos residuales despues del cierre.
- CI: `Calidad` corre en push/PR; `E2E y portable de Windows` es manual, con timeout, cache, concurrencia cancelable y retencion de tres dias. No monitorear CI tras el push salvo pedido explicito.

## Proximos pasos

1. Mantener 0.6.0 sin cambios hasta una proxima modificacion ejecutable; entonces incrementar SemVer.
2. Si CapCut cambia rutas internas, actualizar las definiciones centralizadas y sus pruebas.

## Riesgos

- CapCut puede cambiar sus rutas internas; mantener las tres raices centralizadas y cubiertas por pruebas.
- BDVE puede cambiar de version o tipo; las variantes distintas de version 1 / XOR tipo 3 se rechazan sin tocar el original.
- `Limpiar carpeta` vacia todos los hijos de la carpeta confirmada; mantener siempre la ruta exacta, Cancelar predeterminado, Papelera y la prueba que demuestra que la carpeta contenedora persiste.
- La utilidad no debe evolucionar hacia automatizacion de licencias.
