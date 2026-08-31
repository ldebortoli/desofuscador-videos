# CapCut MP4 Inspector - Contexto del proyecto

## Descripcion general

Aplicacion Windows independiente para localizar el MP4 interno mas reciente generado por CapCut, mostrar su metadata tecnica, recuperar una copia reproducible de recursos BDVE compatibles y vaciar de forma recuperable el contenido de su carpeta. No pertenece a Lic Dengue HQ ni cambia funciones de licencia.

## Estado detectado

- Ruta: `%USERPROFILE%\Documents\CapCut MP4 Inspector`
- Stack: Electron 43, React 19, TypeScript 5.9, electron-vite 5, Vitest y Playwright.
- Git: repositorio independiente en rama `main`.
- Remoto origin: `https://github.com/ldebortoli/capcut-mp4-inspector.git` (privado).

## Estructura inicial

- `src/main/`: deteccion segura, analisis local con ffprobe incluido, IPC y ciclo de vida Electron.
- `src/preload/`: API minima aislada.
- `src/renderer/`: UI React oscura y responsive.
- `tests/`: dominio, estados UI y smoke Electron.
- `build/`: fuente SVG e icono ICO propios.
- `scripts/`: version gate, secret scan e instalacion del acceso Windows.

## Ejecucion y tests

- `npm run quality`: lint, formato, tipos, version gate y escaneo local de secretos.
- `npm run test:coverage`: 41/41 pruebas; 100% lineas, ramas, funciones y sentencias en el nucleo medido.
- `npm run test:e2e`: Electron real con deteccion, revelado, portapapeles, cancelacion segura de las acciones, vacio y capturas.
- `npm run package`: portable Windows x64.
- `npm run install:shortcut`: instala/verifica `Clip Cache Inspector.lnk` en Codex Apps.

## Convenciones

- Preservar cambios ajenos y secretos locales.
- Actualizar este archivo solo cuando cambie informacion estable.
- La memoria persistente vive en `.codex/` y se carga siguiendo `AGENTS.md`.
- Codigo e identificadores tecnicos en ingles; interfaz y documentacion operativa en espanol.
- Version canonica SemVer en `package.json`; todo cambio ejecutable debe incrementarla.
- Apps Dashboard no admite este proyecto: su registro exige layouts moviles Expo o Android nativo bajo `apps/mobile`.
- Desde 0.1.1 la identidad visual usa carbon calido, cobre apagado y crema, sin el turquesa de la entrega inicial.
- Desde 0.1.2 los seis frames ICO garantizan esquinas con alfa cero y el acceso directo obtiene el icono del portable versionado para evitar cache visual obsoleta.
- Desde 0.2.0 la UI incluye una guia responsive de exportacion MP4 legitima basada en la ayuda oficial de CapCut; no documenta procedimientos de evasion Pro.
- Desde 0.3.0 se incluye ffprobe Windows x64 para mostrar codec, perfil, resolucion, FPS, duracion, bitrate, pixel, contenedor y audio; caches sin `moov` se marcan como incompletos.
- Desde 0.3.1, si ffprobe no puede abrir un recurso, se consulta el JSON local `Cache/importcache3/mediainfo/<hash>.json`; `isCryptorFile` se muestra como `Interno CapCut`.
- Desde 0.4.0, `Desofuscar` usa el detector BDVE versionado y el ffprobe incluido, conserva el original y valida completamente la salida elegida. `Eliminar todo` muestra ruta/cantidad, requiere confirmacion, envia cada hijo a la Papelera y conserva la carpeta contenedora.
- El portable 0.4.0 vive en `release/Clip-Cache-Inspector-0.4.0-x64.exe`; la carpeta `release/` no se versiona.
- Si el proyecto tiene una UI para controlar un bot, servidor o proceso en segundo plano, cerrar esa UI debe detener el proceso administrado cuando sea tecnicamente posible.
