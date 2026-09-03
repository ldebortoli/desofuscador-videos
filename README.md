# Desofuscador Videos

Aplicacion Windows independiente para localizar el MP4 interno mas reciente generado por CapCut, analizar su codificacion, recuperar una copia reproducible de recursos BDVE compatibles y administrar el contenido de su carpeta.

No forma parte de Lic Dengue HQ, no esta afiliada a CapCut o ByteDance y no modifica mecanismos de licencia.

Repositorio publico: [ldebortoli/desofuscador-videos](https://github.com/ldebortoli/desofuscador-videos)

## Recorrido principal

1. La app revisa automaticamente tres ubicaciones conocidas bajo `%LOCALAPPDATA%\CapCut\User Data`.
2. Ignora archivos auxiliares `*.alpha.mp4`.
3. Analiza localmente el MP4 con el `ffprobe` incluido y muestra codec, perfil, resolucion, FPS, duracion, bitrate, formato de pixel, contenedor y audio.
4. Si FFprobe no puede abrir un recurso interno, consulta su indice local `importcache3/mediainfo`; los recursos protegidos se identifican como `Interno CapCut` y conservan la metadata tecnica visible.
5. Si tampoco existe metadata confiable en el indice, informa el estado incompleto y el motivo sin inventar datos.
6. `Desofuscar` vuelve a validar el archivo, recupera el recurso y convierte el video a MP4/H.264 de 8 bits. El destino inicial es `%USERPROFILE%\Videos\Cortos`, pero puede cambiarse con el selector nativo y queda guardado para las proximas aperturas. El nombre es opcional, completa `.mp4` y agrega `(2)`, `(3)`, etc. si ya existe otro archivo.
7. `Limpiar carpeta` muestra la carpeta exacta y la cantidad de elementos en una confirmacion nativa. Al confirmar, envia cada hijo a la Papelera: vacia el contenido, pero conserva la carpeta contenedora.
8. `Abrir` revalida el archivo en el proceso principal y lo selecciona en Explorer.
9. `Ruta` envia la ruta al portapapeles local.
10. `Abrir salida` crea la carpeta configurada si hace falta y la abre directamente en Explorer.

La interfaz incluye estados de carga, resultado, vacio y error recuperable. Las ventanas usan controles nativos de minimizar, maximizar/restaurar y cerrar.

## Arquitectura y seguridad

- Electron + React + TypeScript, construido con electron-vite.
- Renderer aislado: `sandbox`, `contextIsolation` y `nodeIntegration: false`.
- El preload expone solo `scan`, `reveal`, `copyPath`, `getOutputFolder`, `chooseOutputFolder`, `openOutputFolder`, `deobfuscate` y `emptyFolder`.
- `ffprobe` se ejecuta como proceso local oculto, con argumentos fijos, ruta de archivo separada, timeout y buffer acotado.
- El fallback de analisis lee unicamente el JSON de metadata que CapCut ya genero para el mismo nombre hash.
- El revelado resuelve rutas reales, exige un `.mp4` existente, rechaza `*.alpha.mp4` y limita el archivo a una raiz interna conocida.
- La desofuscacion usa el `ffprobe` empaquetado y el `ffmpeg`/`libvecrptor.dll` de la instalacion local de CapCut. El nombre opcional se valida contra las reglas de Windows y la app busca una ruta libre antes de empezar; nunca sobrescribe una salida anterior. Escribe primero archivos temporales junto a la salida y solo publica el destino despues de validar toda la decodificacion.
- Desde 0.6.1, si una parte del indice `moov` sigue ofuscada, el detector obtiene posiciones desde las tablas de una pista de video intacta. Valida tamanos, limites, offsets y conteos, admite `stco`/`co64` y no elimina pistas de la salida. El patron tolera que una muestra salte varios bloques y solo se acepta si coincide exactamente con la huella SHA-256 BDVE.
- Desde 0.6.2, toda salida usa H.264 High de 8 bits (`avc1`/`yuv420p`) mediante `h264_mf` de CapCut y Media Foundation de Windows en modo software, calidad 90/100. No necesita una GPU especifica ni instalar extensiones HEVC. Se conservan las pistas de audio sin recomprimir, los tiempos de los fotogramas y las dimensiones (solo se agrega hasta un pixel de relleno si son impares). Se comprueba el codec final y se decodifican todas las pistas de video/audio antes de publicar el resultado. La conversion tiene perdida, puede tardar mas y cambiar el tamano del archivo; los originales y las salidas anteriores no se alteran.
- El vaciado deriva la carpeta desde el MP4 real ya validado; el renderer no puede solicitar una carpeta arbitraria. Vuelve a validar el archivo despues de la confirmacion, envia cada hijo a la Papelera y nunca envia la carpeta contenedora.
- Las dos mutaciones son mutuamente excluyentes. Si la ventana se cierra durante la desofuscacion, se detiene el arbol de procesos que pertenece a la app.
- Se omiten enlaces simbolicos durante el escaneo y se bloquean permisos del navegador.
- No hay backend, cuentas, telemetria, red ni base de datos. La unica preferencia persistente es la carpeta de salida, almacenada localmente en los datos de la aplicacion.

## Desarrollo desde cero

Requiere Windows y Node.js 24.

```powershell
npm ci
npm run dev
```

## Calidad

Validacion rapida local:

```powershell
npm run quality
npm test
```

Cobertura local, con umbral obligatorio del 100%:

```powershell
npm run test:coverage
```

Validacion completa local antes de publicar o empaquetar:

```powershell
npm run quality
npm run test:coverage
npm run test:e2e
npm run audit
```

`test:coverage` exige 100% de lineas, ramas, funciones y sentencias sobre el nucleo de deteccion, analisis, desofuscacion, configuracion de salida, nombres, vaciado y formateo. La suite de componentes cubre los estados visibles y el smoke E2E recorre la aplicacion Electron real con un arbol CapCut sintetico, incluido el selector de salida, la fila unica de acciones y la cancelacion segura del vaciado.

La cobertura V8 mide el codigo TypeScript indicado en `vitest.config.ts`, no PowerShell, C#, los binarios externos ni el cableado Electron. La suite rapida tambien compila y ejecuta los auxiliares C# reales mediante Windows PowerShell, con 126 comprobaciones sobre MP4 sinteticos: indice parcialmente ofuscado, offsets de 32/64 bits, tamanos fijos/variables, tablas invalidas, limites, ciclos omitidos y huella incorrecta. No requiere instalar CapCut ni incluye videos personales. La recuperacion real y la decodificacion multimedia completa se validan localmente con CapCut; no forman parte del CI automatico.

La regresion PowerShell `h264-output-regression.ps1` ejecuta el perfil de conversion y la validacion reales: exige H.264/avc1/yuv420p, comprueba todas las pistas de video, rechaza resultados incompletos o con dimensiones invalidas y verifica que el audio no se recodifique. La generacion real de miniaturas del Explorador se verifica localmente, no en CI.

El flujo `Calidad` ejecuta el conjunto rapido en cada push y pull request con cache, timeout y cancelacion de ejecuciones superadas. El flujo costoso `E2E y portable de Windows` se inicia manualmente desde GitHub Actions; conserva el portable solo tres dias.

## Build y acceso de Windows

```powershell
npm run package
npm run install:shortcut
```

El artefacto portable queda en `release/`. El acceso `Desofuscador Videos.lnk` se instala en `%USERPROFILE%\Documents\Codex\CODEX APPS` con el mismo icono que el ejecutable y la ventana. El `AppUserModelID` estable es `com.local.desofuscadorvideos`.

Apps Dashboard no se modifica: su contrato actual solo registra proyectos moviles Expo o Android nativo bajo `apps/mobile`.

## Versionado

La version canonica vive en `package.json` y usa SemVer. Todo cambio que afecte `src/`, `resources/`, el build o el icono debe incrementar la version. `npm run check:version` valida esa regla respecto del commit base disponible y exige que el lockfile tenga la misma version.

## Limitaciones

- Las rutas internas de CapCut no son una API publica y pueden cambiar con futuras versiones.
- La app identifica archivos por extension, ubicacion y fecha; no interpreta el proyecto ni garantiza que el MP4 corresponda a una exportacion final.
- Algunos caches de CapCut no incluyen el bloque `moov` o aun no estan finalizados; si tampoco existe un indice local valido, no hay metadata de codec confiable para mostrar.
- El detector automatico admite archivos BDVE version 1 con ofuscacion XOR tipo 3 y suficientes alternancias H.264/H.265/AAC. Otras variantes se rechazan sin modificar el original.
- El fallback necesita al menos una tabla de video intacta, no fragmentada y compatible (H.264/HEVC). Limita el indice a 64 MiB y un millon de muestras por pista. No intenta adivinar tablas danadas. La busqueda limita el periodo a 20 millones de bytes, las comprobaciones a 200 millones y los candidatos SHA-256 a 20 millones; si no hay evidencia suficiente, informa el limite y conserva el original.
- La recuperacion necesita una instalacion local de CapCut que incluya `ffmpeg.exe` junto a `libvecrptor.dll`, el encoder `h264_mf` y las funciones multimedia H.264 de Windows. Si el encoder no puede convertir el clip, se informa el error sin entregar una salida HEVC como sustituto.
- `Limpiar carpeta` afecta cualquier archivo o subcarpeta que exista dentro de la carpeta confirmada. La recuperacion depende de la disponibilidad de la Papelera de Windows.
