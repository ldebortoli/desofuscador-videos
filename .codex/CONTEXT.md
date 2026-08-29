# CapCut MP4 Inspector - Contexto del proyecto

## Descripcion general

Aplicacion Windows independiente y de solo lectura para localizar el MP4 interno mas reciente generado por CapCut, mostrar claramente su nombre y metadata basica, copiar su ruta y abrir la carpeta exacta que lo contiene. No pertenece a Lic Dengue HQ ni automatiza exportaciones o funciones de pago.

## Estado detectado

- Ruta: `C:\Users\calei\Documents\CapCut MP4 Inspector`
- Stack: Electron 43, React 19, TypeScript 5.9, electron-vite 5, Vitest y Playwright.
- Git: repositorio independiente en rama `main`.
- Remoto origin: `https://github.com/ldebortoli/capcut-mp4-inspector.git` (privado).

## Estructura inicial

- `src/main/`: deteccion segura, IPC y ciclo de vida Electron.
- `src/preload/`: API minima aislada.
- `src/renderer/`: UI React oscura y responsive.
- `tests/`: dominio, estados UI y smoke Electron.
- `build/`: fuente SVG e icono ICO propios.
- `scripts/`: version gate, secret scan e instalacion del acceso Windows.

## Ejecucion y tests

- `npm run quality`: lint, formato, tipos, version gate y escaneo local de secretos.
- `npm run test:coverage`: 13/13 pruebas; 100% lineas, ramas, funciones y sentencias en el nucleo medido.
- `npm run test:e2e`: Electron real con deteccion, revelado, portapapeles, vacio y captura.
- `npm run package`: portable Windows x64.
- `npm run install:shortcut`: instala/verifica `Clip Cache Inspector.lnk` en Codex Apps.

## Convenciones

- Preservar cambios ajenos y secretos locales.
- Actualizar este archivo solo cuando cambie informacion estable.
- La memoria persistente vive en `.codex/` y se carga siguiendo `AGENTS.md`.
- Codigo e identificadores tecnicos en ingles; interfaz y documentacion operativa en espanol.
- Version canonica SemVer en `package.json`; todo cambio ejecutable debe incrementarla.
- Apps Dashboard no admite este proyecto: su registro exige layouts moviles Expo o Android nativo bajo `apps/mobile`.
- El portable 0.1.0 vive en `release/Clip-Cache-Inspector-0.1.0-x64.exe`; la carpeta `release/` no se versiona.
- Si el proyecto tiene una UI para controlar un bot, servidor o proceso en segundo plano, cerrar esa UI debe detener el proceso administrado cuando sea tecnicamente posible.
