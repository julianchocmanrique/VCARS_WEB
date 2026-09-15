# Publicacion fija de VCARS

## Direccion y acceso

La ruta elegida es `https://www.viralcoproducciones.com/vcars/`. El dominio sin `www` conserva su redireccion original. La direccion de revision completa se guarda fuera del repositorio en `~/.local/share/vcars-fixed-preview/review-link.json`. Su clave no debe aparecer en Git, registros publicos ni capturas de pruebas.

El enlace privado establece una cookie limitada a `/vcars/`, con HTTPS y HttpOnly. Despues se usa el inicio de sesion normal de VCARS. La clave del enlace no caduca al publicar nuevas versiones; la cookie del navegador dura 30 dias y se renueva abriendo el mismo enlace.

## Publicar cambios

```sh
node tools/publish-preview.mjs
```

El publicador verifica pruebas y compilacion de web y API, empaqueta una lista explicita de archivos (sin `.env`, claves ni dependencias instaladas), cifra con AES-256-GCM y publica un paquete cifrado. Solo la infraestructura y el manifiesto de despliegue se actualizan en la rama `codex/vcars-fixed-preview`; no se cambian `main` ni `lab`, ni se confirman los cambios locales de la aplicacion en esas ramas.

La accion `VCARS Fixed Preview` verifica el paquete y lo transfiere mediante SSH al servidor existente. Hay que esperar a que termine y verificar el inicio de sesion, cotizaciones y fotos antes de anunciar una version disponible. Guardar codigo local no publica automaticamente una version incompleta. Guardar formularios dentro de la URL fija si persiste directamente en su base de datos.

## Aislamiento y datos

- Proyecto Docker independiente: `vcars_preview`.
- Aplicacion y API en `/opt/vcars-preview/releases/`; los puertos de web y gateway (3013/3014) solo escuchan en loopback.
- PostgreSQL no publica puertos y almacena sus datos en `/opt/vcars-preview/data/postgres`.
- Fotos persistentes en `/opt/vcars-preview/data/uploads`.
- Credenciales de infraestructura nuevas en `/opt/vcars-preview/runtime.env`; no se reutiliza el JWT de desarrollo.
- La base y fotos locales se copian solo en el despliegue inicial con `--initialize`. En actualizaciones posteriores se preservan los datos guardados en el servidor.
- El acceso via GitHub usa los secretos VPS existentes, mas `VCARS_PREVIEW_PACKAGE_KEY`. Las claves locales estan en `~/.local/share/vcars-fixed-preview/config.json` (permisos 600).

No modificar los contenedores de Viralco, Tornirepuestos ni los anteriores `vcars-web-lab`, `vcars-api-lab` y `vcars-db-lab`.

## Respaldo y recuperacion

Antes de actualizar una instalacion existente se guardan un `pg_dump` y las fotos en `/opt/vcars-preview/backups/<release>/`. La configuracion de nginx se respalda antes de anadir la unica inclusion de VCARS al bloque HTTPS de `www.viralcoproducciones.com`.

El instalador rechaza rutas VCARS desconocidas o configuraciones ambiguas. Comprueba `nginx -t` antes de recargar y compara el HTML de la portada de Viralco antes y despues. Ante fallo restaura la configuracion original. Si los nuevos contenedores de VCARS fallan, intenta recuperar los anteriores sin destruir datos ni deshacer migraciones de base automaticamente.

Una restauracion de datos requiere revision y autorizacion explicita: nunca borrar volumenes ni volver a importar la copia local encima de ordenes guardadas en el servidor.

La disponibilidad depende del servidor y del dominio, no del computador local. La ruta fija evita que cambie la URL, pero no constituye una garantia de disponibilidad absoluta.
