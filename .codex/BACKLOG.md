# TODO

No hay tareas pendientes.

# IN PROGRESS

No hay tareas en curso.

# DONE

- [2026-08-31] Entregar Clip Cache Inspector 0.5.0 con salida fija en `%USERPROFILE%\Videos\Cortos`, nombre de archivo opcional validado, sufijo anticolision y boton para abrir esa carpeta.
- [2026-08-31] Entregar Clip Cache Inspector 0.4.0 con `Desofuscar` mediante el detector BDVE automatico y `Eliminar todo` para enviar a la Papelera solo el contenido de la carpeta CapCut detectada, conservando la carpeta y agregando validacion estricta, confirmacion y pruebas.
- [2026-08-31] Corregir en 0.3.1 el diagnostico de recursos `isCryptorFile`: leer el indice local de CapCut, mostrar H.264/AAC y distinguirlos de un MP4 realmente incompleto.
- [2026-08-30] Agregar en 0.3.0 analisis tecnico automatico con ffprobe incluido: codec, perfil, resolucion, FPS, duracion, bitrate, pixel, contenedor y audio, con estado explicito para caches incompletos.
- [2026-08-29] Agregar en 0.2.0 una guia breve y responsive dentro de la UI para revisar, exportar MP4/H.264 y abrir la carpeta final desde CapCut, con limite explicito sobre recursos Pro.
- [2026-08-29] Corregir en 0.1.2 la transparencia de los seis frames ICO, usar el portable versionado como fuente del acceso y refrescar la cache visual de Windows.
- [2026-08-29] Recolorear Clip Cache Inspector 0.1.1 con una identidad calida propia, prueba antirregresion cromatica, icono/portable/acceso directo actualizados y validacion Windows completa.
- [2026-08-29] Entregar Clip Cache Inspector 0.1.0 como aplicacion Windows independiente: deteccion/revelado seguros, UI responsive, 13/13 pruebas con cobertura 100%, smoke en desarrollo y paquete, portable x64, icono/AUMID/acceso Codex Apps propios, documentacion y repositorio privado.
- [2026-08-29] Inicializar la memoria persistente del proyecto.

# BLOCKED

- [2026-08-29] [BLOCKED: GitHub API HTTP 422 `Secret scanning is not available for this repository`; el repositorio personal privado no admite Secret Scanning ni Push Protection con el plan/tipo actual.] Habilitar GitHub Secret Scanning y Push Protection. El escaneo local `npm run scan:secrets` queda activo.
