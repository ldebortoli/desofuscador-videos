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
