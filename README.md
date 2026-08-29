# Clip Cache Inspector

Aplicacion Windows independiente y de solo lectura para localizar el MP4 interno mas reciente generado por CapCut, mostrar su nombre y abrir en Explorer la carpeta exacta que lo contiene.

No forma parte de Lic Dengue HQ, no esta afiliada a CapCut o ByteDance y no automatiza exportaciones, funciones Pro ni mecanismos de licencia.

## Recorrido principal

1. La app revisa automaticamente tres ubicaciones conocidas bajo `%LOCALAPPDATA%\CapCut\User Data`.
2. Ignora archivos auxiliares `*.alpha.mp4`.
3. Muestra el MP4 no-alpha mas reciente con nombre, origen, fecha, tamano y ruta.
4. `Abrir carpeta` revalida el archivo en el proceso principal y lo selecciona en Explorer.
5. `Copiar ruta` envia la ruta al portapapeles local.

La interfaz incluye estados de carga, resultado, vacio y error recuperable. Las ventanas usan controles nativos de minimizar, maximizar/restaurar y cerrar.

## Arquitectura y seguridad

- Electron + React + TypeScript, construido con electron-vite.
- Renderer aislado: `sandbox`, `contextIsolation` y `nodeIntegration: false`.
- El preload expone solo `scan`, `reveal` y `copyPath`.
- El revelado resuelve rutas reales, exige un `.mp4` existente, rechaza `*.alpha.mp4` y limita el archivo a una raiz interna conocida.
- Se omiten enlaces simbolicos durante el escaneo y se bloquean permisos del navegador.
- No hay backend, cuentas, telemetria, red, base de datos ni configuracion persistente.

## Desarrollo desde cero

Requiere Windows y Node.js 24.

```powershell
npm ci
npm run dev
```

## Calidad

```powershell
npm run quality
npm test
npm run test:coverage
npm run test:e2e
npm run audit
```

`test:coverage` exige 100% de lineas, ramas, funciones y sentencias sobre el nucleo de deteccion y formateo. La suite de componentes cubre los estados visibles y el smoke E2E recorre la aplicacion Electron real con un arbol CapCut sintetico.

## Build y acceso de Windows

```powershell
npm run package
npm run install:shortcut
```

El artefacto portable queda en `release/`. El acceso `Clip Cache Inspector.lnk` se instala en `%USERPROFILE%\Documents\Codex\CODEX APPS` con el mismo icono que el ejecutable y la ventana. El `AppUserModelID` estable es `com.local.clipcacheinspector`.

Apps Dashboard no se modifica: su contrato actual solo registra proyectos moviles Expo o Android nativo bajo `apps/mobile`.

## Versionado

La version canonica vive en `package.json` y usa SemVer. Todo cambio que afecte `src/`, el build o el icono debe incrementar la version. `npm run check:version` valida esa regla respecto del commit base disponible.

## Limitaciones

- Las rutas internas de CapCut no son una API publica y pueden cambiar con futuras versiones.
- La app identifica archivos por extension, ubicacion y fecha; no interpreta el proyecto ni garantiza que el MP4 corresponda a una exportacion final.
- El analisis profundo de codecs queda fuera de esta UI minima; puede realizarse con `ffprobe` sobre la ruta copiada.
