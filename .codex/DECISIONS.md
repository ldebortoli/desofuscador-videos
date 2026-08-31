# Decisiones tecnicas

No borrar decisiones anteriores. Si una decision cambia, agregar una nueva entrada que indique cual reemplaza.

## D-001 - Memoria persistente del proyecto

- Estado: vigente.
- Fecha: 2026-08-29.
- Decision: usar `.codex/` como fuente de verdad entre sesiones, modelos y agentes.
- Motivo: continuidad independiente del historial del chat.

## D-002 - Aplicacion independiente de Lic Dengue HQ

- Estado: vigente.
- Fecha: 2026-08-29.
- Decision: mantener todo el codigo, el repositorio, el ejecutable y el acceso directo de esta utilidad fuera de Lic Dengue HQ.
- Motivo: el usuario desea conservar Headquarters para consulta legal, pero no usarlo como contenedor de esta herramienta.

## D-003 - Electron modular y operacion de solo lectura

- Estado: vigente.
- Fecha: 2026-08-29.
- Decision: usar Electron + React + TypeScript con deteccion en el proceso principal, preload aislado y renderer sin acceso a Node. Solo se escanean tres raices internas conocidas de CapCut; el revelado revalida el archivo real antes de abrir Explorer.
- Motivo: ofrecer una UI Windows empaquetable y evitar que una ruta manipulada desde la interfaz pueda revelar archivos arbitrarios.

## D-004 - Alcance funcional y limites

- Estado: vigente.
- Fecha: 2026-08-29.
- Decision: detectar el MP4 no-alpha mas reciente, mostrar nombre, origen, fecha, tamano y ruta, permitir actualizar, copiar y abrir carpeta. No ejecutar CapCut, exportar, modificar proyectos, eludir licencias ni automatizar funciones Pro.
- Motivo: cubrir el diagnostico solicitado sin incorporar mecanismos de bypass.

## D-005 - Version y ecosistema local

- Estado: vigente.
- Fecha: 2026-08-29.
- Decision: comenzar en 0.1.0 con SemVer canonico en `package.json`, crear icono/AppUserModelID/acceso `Codex Apps` propios y no registrar el proyecto en Apps Dashboard mientras este solo admita proyectos moviles.
- Motivo: identidad Windows consistente y separacion real sin ampliar otro producto fuera de alcance.

## D-006 - Identidad cromatica calida

- Estado: vigente.
- Fecha: 2026-08-29.
- Decision: desde 0.1.1 usar carbon calido, cobre apagado y crema en la interfaz, el arranque y el icono de Windows; eliminar el turquesa anterior.
- Motivo: diferenciar Clip Cache Inspector del lenguaje visual de Apps Dashboard sin alterar su estructura ni su comportamiento.

## D-007 - Alfa del icono y cache de Windows

- Estado: vigente.
- Fecha: 2026-08-29.
- Decision: desde 0.1.2 generar todos los frames ICO con alfa explicito y esquinas transparentes; el acceso directo toma su icono del portable versionado y solicita a Windows refrescar la cache visual.
- Motivo: evitar esquinas blancas y la reutilizacion del icono turquesa anterior en Explorer.

## D-008 - Guia de exportacion dentro de la UI

- Estado: vigente.
- Fecha: 2026-08-29.
- Decision: desde 0.2.0 mostrar una guia breve basada en la ayuda oficial de CapCut para revisar, exportar como MP4/H.264 y abrir la carpeta final. Si hay recursos Pro, indicar alternativas gratuitas o licencia activa; no documentar el procedimiento de cache usado para evitar restricciones.
- Motivo: resolver el olvido operativo del usuario sin convertir el inspector en una guia de evasion de licencia.

## D-009 - Analisis multimedia local incluido

- Estado: vigente.
- Fecha: 2026-08-30.
- Decision: desde 0.3.0 ejecutar un ffprobe Windows x64 incluido, oculto y con timeout para analizar solo el MP4 elegido. Mostrar metadata normalizada cuando exista y estados `incomplete` o `unavailable` sin exponer stderr ni inventar datos.
- Motivo: permitir conocer como esta codificado cada archivo sin depender de instalaciones externas y diagnosticar correctamente caches sin bloque `moov`.

## D-010 - Fallback al indice multimedia de CapCut

- Estado: vigente; complementa D-009.
- Fecha: 2026-08-31.
- Decision: desde 0.3.1, cuando ffprobe no pueda abrir el recurso elegido, leer en modo solo lectura `Cache/importcache3/mediainfo/<hash>.json`. Si el indice marca `isCryptorFile`, mostrar la metadata normalizada con estado `protected`/`Interno CapCut`; no leer almacenes de claves, descifrar, convertir ni modificar el recurso.
- Motivo: el archivo real observado conserva un `moov` pero usa la capa interna Cryptor de CapCut; clasificarlo como simplemente incompleto era engañoso, mientras que el indice local ya informa H.264, AAC, dimensiones, FPS y duracion.
