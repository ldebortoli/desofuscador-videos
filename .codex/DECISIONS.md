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

## D-011 - Acciones controladas sobre archivos detectados

- Estado: vigente; reemplaza el limite de solo lectura de D-003 y D-004 por pedido explicito del usuario.
- Fecha: 2026-08-31.
- Decision: desde 0.4.0 permitir desofuscar un MP4 BDVE validado hacia una ruta elegida y vaciar el contenido de su carpeta. La entrada siempre se revalida contra las tres raices CapCut; la desofuscacion conserva el original y valida la salida completa; el vaciado muestra ruta y cantidad, requiere confirmacion nativa, envia cada hijo a la Papelera y conserva la carpeta contenedora. Las acciones son mutuamente excluyentes y la app detiene el proceso transitorio al cerrar.
- Motivo: incorporar el flujo BDVE automatico ya probado y la limpieza solicitada sin exponer rutas arbitrarias ni convertir una confirmacion ambigua en borrado permanente.

## D-012 - Destino fijo y nombre opcional para videos recuperados

- Estado: vigente; reemplaza la seleccion manual de salida definida en D-011.
- Fecha: 2026-08-31.
- Decision: desde 0.5.0 guardar las copias desofuscadas en `%USERPROFILE%\Videos\Cortos`, mostrar esa ruta en la tarjeta y ofrecer `Abrir Cortos`. El nombre ingresado es opcional, se limita a un nombre de archivo Windows con extension MP4 y nunca controla una ruta. Si el destino ya existe, elegir automaticamente `(2)`, `(3)`, etc.; no sobrescribirlo.
- Motivo: reducir pasos y mantener todos los cortos en un destino predecible sin perder salidas anteriores ni permitir traversal desde el renderer.

## D-013 - Identidad Desofuscador Videos, salida configurable y repositorio publico

- Estado: vigente; reemplaza el destino fijo de D-012, pero conserva sus reglas de nombre y anticolision.
- Fecha: 2026-08-31.
- Decision: desde 0.6.0 llamar al producto, carpeta local, ventana y acceso `Desofuscador Videos`; usar `desofuscador-videos` como nombre de paquete y repositorio. Mantener `Abrir`, `Ruta`, `Abrir salida`, `Desofuscar` y `Limpiar carpeta` en una sola fila. Elegir la salida mediante dialogo nativo, aceptar solo una ruta absoluta y persistirla en los datos locales de la app; el valor inicial sigue siendo `%USERPROFILE%\Videos\Cortos`. Publicar el repositorio con Secret Scanning y Push Protection habilitados, calidad/cobertura en push y PR, y E2E/empaquetado solo por ejecucion manual.
- Motivo: simplificar la barra de acciones, permitir que cada usuario organice sus videos sin exponer entrada de rutas arbitrarias y entregar el proyecto bajo el nombre y visibilidad solicitados con controles proporcionales a un repositorio publico.

## D-014 - Finales de linea deterministas para CI Windows

- Estado: vigente.
- Fecha: 2026-08-31.
- Decision: versionar `.gitattributes` con `* text=auto eol=lf` y marcar ICO como binario. Mantener Prettier con su salida LF canonica en lugar de relajar `endOfLine` a `auto`.
- Motivo: el primer run publico convirtio el checkout a CRLF y Prettier marco 42 archivos aunque el mismo commit pasaba localmente; normalizar desde Git hace reproducible el control sin ocultar diferencias reales de formato.

## D-015 - Diagnostico de indices MP4 parcialmente ofuscados

- Estado: vigente como restriccion conocida; correccion funcional pendiente de solicitud.
- Fecha: 2026-09-02.
- Decision: no interpretar `ffprobe no pudo leer la tabla de muestras` como prueba de dano irreversible ni como rechazo general a HEVC. Ante este fallo, inspeccionar si la ofuscacion alcanza el `moov` final; la siguiente mejora del detector debe contemplar ese caso y conservar los detalles utiles de stderr.
- Motivo: se reprodujo el fallo en una copia de analisis y se encontraron entradas STSC y cabeceras `stsz`/`udta` aun ofuscadas, que recuperan valores coherentes con la misma clave XOR. La rutina vigente solo restaura los bytes anteriores a `mdat`.

## D-016 - Recuperacion con indice parcial y muestras dispersas

- Estado: vigente; resuelve la limitacion D-015 desde 0.6.1 por pedido explicito.
- Fecha: 2026-09-02.
- Decision: mantener ffprobe como primera via y usar un lector MP4 acotado sobre pistas de video intactas cuando falla. Derivar el patron de residuos de posiciones, sin asumir una transicion observada por ciclo ni que la primera muestra pertenezca al primer bloque. Exigir coincidencia SHA-256 y remux/decodificacion final; todas las pistas originales siguen incluidas. Publicar errores con marcador estructurado desde PowerShell y retirar el envoltorio IPC en la UI.
- Motivo: el HEVC real tenia el audio parcialmente ofuscado y un periodo menor que muchos paquetes. Se recupero con periodo 23747, longitud 8656 y clave 0x6e; 817 fotogramas HEVC y AAC completos, con SHA-256 original sin cambios. Regresiones sinteticas ejecutan los auxiliares reales, sin publicar contenido personal.

## D-017 - Miniaturas de Windows y conservacion del codec

- Estado: diagnostico vigente; sin cambio funcional.
- Fecha: 2026-09-02.
- Decision: no confundir falta de miniatura del Explorador con fallo de recuperacion ni agregar recodificacion automaticamente. La salida vigente usa copia de streams para conservar calidad. Instalar soporte HEVC o agregar una salida H.264 requiere un pedido de cambio.
- Motivo: se verifico que el generador de miniaturas de Windows funciona con H.264 de la misma carpeta pero falla con ambos HEVC Main 10 recuperados; no hay extension HEVC registrada para el usuario y las miniaturas no estan desactivadas globalmente. Los MP4 ya habian pasado decodificacion completa.

## D-018 - Salida H.264 compatible predeterminada

- Estado: vigente desde 0.6.2, reemplaza la conservacion del codec de video de D-017 por pedido explicito.
- Fecha: 2026-09-02.
- Decision: convertir todas las pistas de video a H.264 High/avc1/yuv420p, usar h264_mf en modo software (sin depender de GPU) y calidad 90/100, conservar audio y timestamps, y agregar hasta un pixel de padding para dimensiones impares. Validar codec/bit depth y decodificacion completa antes de publicar. No reemplazar salidas existentes ni entregar HEVC si la conversion falla.
- Motivo: CapCut incluye h264_mf pero no libx264 en la instalacion comprobada. La salida real conserva 817 cuadros a 1080x1920/30fps, audio identico por hash y genera una miniatura Windows 144x256 donde el HEVC fallaba. La recompresion es con perdida y puede aumentar el tamano/tiempo; documentarlo sin prometer calidad identica.

## D-019 - Diagnostico de indice totalmente XOR

- Estado: diagnostico confirmado; ampliacion funcional pendiente de pedido.
- Fecha: 2026-09-02.
- Decision: el rechazo de tablas intactas no demuestra que el recurso este danado ni que falle H.264. Antes de declararlo irrecuperable, comprobar si todo el moov esta XOR; cualquier futura aceptacion debe validar la estructura y la huella de parametros, sin reemplazar datos a ciegas ni prometer soporte universal.
- Motivo: el nuevo recurso tiene todo el indice dentro de un bloque ofuscado. Al restaurarlo solo en memoria, el lector existente recupera 817 paquetes y el detector encuentra una configuracion exacta por SHA-256; FFmpeg decodifica video y audio completos a null sin errores. No se cambio la app, el original ni las salidas.
