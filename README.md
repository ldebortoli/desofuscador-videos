# Clip Cache Inspector

Aplicacion Windows independiente para localizar el MP4 interno mas reciente generado por CapCut, analizar su codificacion, recuperar una copia reproducible de recursos BDVE compatibles y administrar el contenido de su carpeta.

No forma parte de Lic Dengue HQ, no esta afiliada a CapCut o ByteDance y no modifica mecanismos de licencia.

## Recorrido principal

1. La app revisa automaticamente tres ubicaciones conocidas bajo `%LOCALAPPDATA%\CapCut\User Data`.
2. Ignora archivos auxiliares `*.alpha.mp4`.
3. Analiza localmente el MP4 con el `ffprobe` incluido y muestra codec, perfil, resolucion, FPS, duracion, bitrate, formato de pixel, contenedor y audio.
4. Si FFprobe no puede abrir un recurso interno, consulta su indice local `importcache3/mediainfo`; los recursos protegidos se identifican como `Interno CapCut` y conservan la metadata tecnica visible.
5. Si tampoco existe metadata confiable en el indice, informa el estado incompleto y el motivo sin inventar datos.
6. `Desofuscar` vuelve a validar el archivo y ejecuta oculto el detector BDVE automatico incluido. Guarda en `%USERPROFILE%\Videos\Cortos`; el nombre es opcional, completa `.mp4` y agrega `(2)`, `(3)`, etc. si ya existe otro archivo.
7. `Eliminar todo` muestra la carpeta exacta y la cantidad de elementos en una confirmacion nativa. Al confirmar, envia cada hijo a la Papelera: vacia el contenido, pero conserva la carpeta contenedora.
8. `Abrir carpeta` revalida el archivo en el proceso principal y lo selecciona en Explorer.
9. `Copiar ruta` envia la ruta al portapapeles local.
10. `Abrir Cortos` crea la carpeta de salida si hace falta y la abre directamente en Explorer.

La interfaz incluye estados de carga, resultado, vacio y error recuperable. Las ventanas usan controles nativos de minimizar, maximizar/restaurar y cerrar.

## Arquitectura y seguridad

- Electron + React + TypeScript, construido con electron-vite.
- Renderer aislado: `sandbox`, `contextIsolation` y `nodeIntegration: false`.
- El preload expone solo `scan`, `reveal`, `copyPath`, `getOutputFolder`, `openOutputFolder`, `deobfuscate` y `emptyFolder`.
- `ffprobe` se ejecuta como proceso local oculto, con argumentos fijos, ruta de archivo separada, timeout y buffer acotado.
- El fallback de analisis lee unicamente el JSON de metadata que CapCut ya genero para el mismo nombre hash.
- El revelado resuelve rutas reales, exige un `.mp4` existente, rechaza `*.alpha.mp4` y limita el archivo a una raiz interna conocida.
- La desofuscacion usa el `ffprobe` empaquetado y el `ffmpeg`/`libvecrptor.dll` de la instalacion local de CapCut. El nombre opcional se valida contra las reglas de Windows y la app busca una ruta libre antes de empezar; nunca sobrescribe una salida anterior. Escribe primero archivos temporales junto a la salida y solo publica el destino despues de validar toda la decodificacion.
- El vaciado deriva la carpeta desde el MP4 real ya validado; el renderer no puede solicitar una carpeta arbitraria. Vuelve a validar el archivo despues de la confirmacion, envia cada hijo a la Papelera y nunca envia la carpeta contenedora.
- Las dos mutaciones son mutuamente excluyentes. Si la ventana se cierra durante la desofuscacion, se detiene el arbol de procesos que pertenece a la app.
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

`test:coverage` exige 100% de lineas, ramas, funciones y sentencias sobre el nucleo de deteccion, analisis, desofuscacion, nombres de salida, vaciado y formateo. La suite de componentes cubre los estados visibles y el smoke E2E recorre la aplicacion Electron real con un arbol CapCut sintetico, incluido el nombre opcional, `Abrir Cortos` y la cancelacion segura del vaciado.

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
- El detector automatico admite archivos BDVE version 1 con ofuscacion XOR tipo 3 y suficientes alternancias H.264/H.265/AAC. Otras variantes se rechazan sin modificar el original.
- La recuperacion necesita una instalacion local de CapCut que incluya `ffmpeg.exe` junto a `libvecrptor.dll`.
- `Eliminar todo` afecta cualquier archivo o subcarpeta que exista dentro de la carpeta confirmada. La recuperacion depende de la disponibilidad de la Papelera de Windows.
