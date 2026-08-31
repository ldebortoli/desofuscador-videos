# Clip Cache Inspector

Aplicacion Windows independiente y de solo lectura para localizar el MP4 interno mas reciente generado por CapCut, analizar su codificacion y abrir en Explorer la carpeta exacta que lo contiene.

No forma parte de Lic Dengue HQ, no esta afiliada a CapCut o ByteDance y no automatiza exportaciones, funciones Pro ni mecanismos de licencia.

## Recorrido principal

1. La app revisa automaticamente tres ubicaciones conocidas bajo `%LOCALAPPDATA%\CapCut\User Data`.
2. Ignora archivos auxiliares `*.alpha.mp4`.
3. Analiza localmente el MP4 con el `ffprobe` incluido y muestra codec, perfil, resolucion, FPS, duracion, bitrate, formato de pixel, contenedor y audio.
4. Si FFprobe no puede abrir un recurso interno, consulta su indice local `importcache3/mediainfo`; los recursos protegidos se identifican como `Interno CapCut` y conservan la metadata tecnica visible.
5. Si tampoco existe metadata confiable en el indice, informa el estado incompleto y el motivo sin inventar datos.
6. `Abrir carpeta` revalida el archivo en el proceso principal y lo selecciona en Explorer.
7. `Copiar ruta` envia la ruta al portapapeles local.

La interfaz incluye estados de carga, resultado, vacio y error recuperable. Las ventanas usan controles nativos de minimizar, maximizar/restaurar y cerrar.

## Arquitectura y seguridad

- Electron + React + TypeScript, construido con electron-vite.
- Renderer aislado: `sandbox`, `contextIsolation` y `nodeIntegration: false`.
- El preload expone solo `scan`, `reveal` y `copyPath`.
- `ffprobe` se ejecuta como proceso local oculto, con argumentos fijos, ruta de archivo separada, timeout y buffer acotado.
- El fallback lee unicamente el JSON de metadata que CapCut ya genero para el mismo nombre hash; no descifra, convierte ni modifica el recurso.
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

`test:coverage` exige 100% de lineas, ramas, funciones y sentencias sobre el nucleo de deteccion, analisis y formateo. La suite de componentes cubre los estados visibles y el smoke E2E recorre la aplicacion Electron real con un arbol CapCut sintetico.

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
- Algunos caches de CapCut no incluyen el bloque `moov` o aun no estan finalizados; si tampoco existe un indice local valido, no hay metadata de codec confiable para mostrar.
- Un estado `Interno CapCut` confirma la codificacion informada por el indice, pero no convierte el recurso protegido en un MP4 autonomo. Para obtener el montaje final se debe reabrir el borrador existente y exportarlo legitimamente desde CapCut.
