# Session handoff

## Objetivo general

Entregar una aplicacion Windows independiente para detectar el MP4 interno mas reciente de CapCut, analizarlo, recuperar recursos BDVE compatibles y administrar de forma segura el contenido de su carpeta.

## Tarea actual

No hay una implementacion activa. Clip Cache Inspector 0.4.0 quedo completado, empaquetado e instalado.

## Estado actual

- Memoria persistente inicializada y reconciliada el 2026-08-29.
- Lic Dengue HQ quedo limpio; la integracion empezada alli fue retirada antes de crear este proyecto.
- Apps Dashboard fue inspeccionado y su contrato actual solo admite proyectos moviles; no se modificara para esta utilidad de escritorio.
- Remoto privado: `https://github.com/ldebortoli/capcut-mp4-inspector.git`, rama `main`.
- La interfaz, el fondo de arranque y el icono usan carbon calido, cobre apagado y crema; una prueba estatica impide reintroducir el turquesa anterior.
- Los seis frames ICO tienen alfa cero en sus cuatro esquinas; el acceso usa como fuente el portable versionado y solicita a Windows refrescar su cache de iconos.
- La UI muestra cuatro pasos de exportacion MP4/H.264, apertura de la carpeta final, aviso sobre recursos Pro y enlace a la ayuda oficial; la franja adapta cuatro, dos o una columna segun el ancho.
- El archivo elegido se analiza con ffprobe incluido; si falla, se consulta su JSON local `importcache3/mediainfo` antes de declarar el archivo incompleto.
- El archivo real `51fd486ce06f4055b949f4b19f65f3f4.mp4` tiene `isCryptorFile: 2`; el indice informa H.264, AAC, 1080x1920, 30 FPS y 11,7 s. El recurso pertenece al borrador `0828` y a `Clip combinado1`.
- El archivo auxiliar `51fd486ce06f4055b949f4b19f65f3f4.mp4.alpha.mp4` es un MP4 H.264 estandar de 1080x1920, 30 FPS y 11,7 s; funciona como pista/máscara auxiliar, no como el video final.
- Las rutas originales de `IMG_6854.MOV`, `IMG_6855.MOV` y los dos OGG ya no existen. El preset conserva copias hash de ambos MOV: `f67d...MOV` (17,8 s) y `e2d...MOV` (10,4 s), H.264/AAC 720x1280; el recurso combinado ya contiene una pista AAC. La reapertura puede funcionar, pero los OGG ausentes siguen siendo un riesgo.
- Desde 0.4.0, `Desofuscar` revalida el MP4, pide la salida, ejecuta oculto `resources/Desofuscar-Video.ps1` con el ffprobe incluido, conserva el original y revela la copia solo despues de una decodificacion completa.
- `Eliminar todo` deriva la carpeta del archivo real revalidado, muestra ruta exacta y cantidad, usa Cancelar como opcion predeterminada, envia individualmente cada hijo a la Papelera y conserva la carpeta contenedora. Las acciones son mutuamente excluyentes.
- El detector empaquetado se probo contra el recurso real: clave `0x96`, periodo 613.289, longitud XOR 141.443, H.264 1080x1920 de 351 cuadros + AAC, 11,702993 s, decodificacion completa y salida temporal eliminada.
- Validacion: quality completo, audit runtime con 0 vulnerabilidades, 41/41 pruebas y cobertura 100% en todas las metricas medidas.
- E2E Electron paso en desarrollo, contra `release/win-unpacked` y con cancelacion de ambas acciones; ffprobe quedo firmado/desempaquetado, el script quedo en `resources/tools` y la vista compacta no desborda horizontalmente.
- El paquete real valido el hash observado con estado `Interno CapCut` y metadata H.264/AAC; captura revisada en `.codex/qa-actual-media.png`.
- Portable: `release/Clip-Cache-Inspector-0.4.0-x64.exe`, 111.050.173 bytes, SHA-256 `BF3FF290D98CA5D442AC7EB40DAE1C7220DC695156D71AA02FB66E1E6A0F8D33`.
- Acceso real: `%USERPROFILE%\Documents\Codex\CODEX APPS\Clip Cache Inspector.lnk`; target e icono apuntan al portable 0.4.0. El lanzamiento real mostro solo la ventana esperada, expuso icono nativo (`WM_GETICON`) y cerro normalmente con 0 procesos residuales.
- GitHub Secret Scanning/Push Protection no se pudo habilitar: API HTTP 422 `Secret scanning is not available for this repository`; `npm run scan:secrets` funciona como control local.

## Proximos pasos

1. Mantener 0.4.0 sin cambios hasta una proxima modificacion ejecutable; entonces incrementar SemVer.
2. Si CapCut cambia rutas internas, actualizar las definiciones centralizadas y sus pruebas.
3. No reintentar Secret Protection mientras GitHub conserve el bloqueo por repositorio/plan.

## Riesgos

- CapCut puede cambiar sus rutas internas; mantener las tres raices centralizadas y cubiertas por pruebas.
- BDVE puede cambiar de version o tipo; las variantes distintas de version 1 / XOR tipo 3 se rechazan sin tocar el original.
- `Eliminar todo` vacia todos los hijos de la carpeta confirmada; mantener siempre la ruta exacta, Cancelar predeterminado, Papelera y la prueba que demuestra que la carpeta contenedora persiste.
- La utilidad no debe evolucionar hacia automatizacion de licencias.
