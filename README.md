# PORTAFOLIO cyberpunk con CI/CD

Portafolio personal responsive con frontend, backend, SQLite y despliegue CI/CD. La portada usa el retrato original en WebP con respaldo PNG. Incluye modo claro y oscuro, música bajo demanda y un CV con estilos para imprimir o guardar como PDF.

Vite empaqueta el módulo de React y el paso de compilación incluye las tres tarjetas en el HTML. React actualiza los proyectos con `GET /api/projects` en Express, que lee los datos desde SQLite. Si la API falla o JavaScript está desactivado, el HTML de la compilación conserva las tarjetas. Se conservan las secciones de trayectoria, formación, habilidades e idiomas, junto con el ambiente cyberpunk: cursor visual, carga breve, barra de lectura, partículas acotadas, red y lluvia Matrix, retrato holográfico, controles flotantes, contadores, ripple y visualizador de audio. Los elementos animados son finitos o reutilizados y priorizan `transform` y `opacity`; no se crean partículas en bucles permanentes. El movimiento reducido respeta `prefers-reduced-motion` y la portada conserva su contenido aunque falten APIs de animación.

## Estructura del proyecto

- `frontend/`: páginas, estilos, scripts, componentes React e imágenes y audio.
- `backend/`: API Express, acceso a SQLite y base local en `backend/data/`.
- `infrastructure/`: configuración Terraform para Oracle Cloud Infrastructure (OCI) y despliegue con Ansible.
- `tests/`: pruebas unitarias, de integración y de navegador.
- `scripts/`: tareas que generan los archivos publicados en `dist/`.
- En la raíz quedan Docker, configuración de Node/Vite y workflows de GitHub Actions.

## Base de datos

SQLite usa nombres de tablas y columnas en español. El esquema incluye `perfil`, `contactos`, `areas_habilidades`, `habilidades`, `idiomas`, `categorias_proyecto`, `proyectos`, `tecnologias`, `proyecto_tecnologias`, `experiencias_laborales`, `formaciones` y `certificaciones`. Experiencia, formación y certificaciones quedan listas para completar cuando tengas datos confirmados.

La base existente se migra al iniciar el servidor: los proyectos y sus tecnologías pasan a las nuevas tablas. La ruta `/api/projects` mantiene la respuesta que espera la interfaz actual; `/api/proyectos`, `/api/habilidades`, `/api/idiomas` y `/api/perfil` devuelven datos con nombres en español.

## Cumplimiento de la consigna

| Requisito | Implementación |
| --- | --- |
| Push a `dev` | `.github/workflows/tests.yml` ejecuta las tres suites |
| 3 pruebas unitarias | Render estático de tarjetas, escape HTML y validación de la plantilla |
| 3 pruebas de integración | Express y SQLite: salud, consulta a la BD y respuesta HTTP 404 |
| 3 pruebas E2E | Chromium: portada móvil, tarjetas desde la API y persistencia del tema con acceso al CV |
| Push a `main` | `.github/workflows/deploy.yml` exige que pasen las pruebas, publica la imagen, aplica Terraform y ejecuta Ansible |
| Dockerfile, Compose y Docker Hub | Imagen multi-arquitectura `amd64`/`arm64` etiquetada con el SHA y desplegada por digest |
| Terraform | VM de OCI con Ubuntu 24.04, VCN, subred pública, Internet Gateway, reglas de red y una IP pública |
| Configuración de VM | Ansible instala Docker y Compose, activa UFW y comprueba las reglas de iptables para TCP 80 y 443 |
| Cloudflare | Registro DNS A y dominio HTTPS con Caddy, si se configura el subdominio |

## Ejecutar y probar en local

Requisitos: Node.js 24 y npm. En PowerShell puedes usar `npm.cmd` y `npx.cmd` si los ejecutables de PowerShell están bloqueados.

```bash
npm install
npm run test:unit
npm run test:integration
npm run build
npx playwright install chromium
npm run test:e2e
npm start
```

Abre http://localhost:3000. La base se crea automáticamente en `backend/data/portfolio.sqlite`. Después de editar el frontend, ejecuta `npm run build` para regenerar `dist/`. Consulta `/api/projects` para ver los datos servidos desde SQLite.

Con Docker Desktop en ejecución, se puede probar la misma imagen que usa el pipeline:

```bash
docker build -t portafolio:local .
docker compose up -d --wait
docker compose ps
curl http://localhost/api/health
```

El sitio queda en http://localhost. Para detenerlo, usa `docker compose down`. El volumen de SQLite permanece disponible entre reinicios de los contenedores.

## Configurar GitHub, Docker Hub y Oracle Cloud

1. En OCI crea un bucket privado de Object Storage en la región elegida, activa el versionado y anota su nombre y el namespace de Object Storage. Terraform guarda el estado en `jesus-z/portfolio-cicd/production.tfstate`; el backend OCI bloquea el estado durante `plan`, `apply` y `destroy`.
2. En OCI crea o elige un compartimento. Desde el perfil de usuario, agrega una API signing key y guarda la clave privada PEM. Copia el tenancy OCID, user OCID y fingerprint. La API key da acceso a Terraform según las políticas OCI asignadas al usuario; evita usar un usuario administrador permanente si puedes limitar permisos al compartimento y al bucket.
3. Elige la región y el availability domain. En esa región busca la imagen **Ubuntu 24.04** que corresponda a la arquitectura. La configuración predeterminada usa `VM.Standard.A1.Flex` (Arm) con 1 OCPU y 6 GB; ajusta el shape y la imagen juntos si eliges AMD/x86. OCI puede no tener capacidad disponible para A1 en algunos dominios.
4. Crea un par de claves SSH. La clave pública se instala en la VM; guarda la privada como secreto de GitHub para que Ansible se conecte durante el despliegue. No pegues la clave privada en el repositorio.
5. En Docker Hub usa el repositorio público `portafolio-cicd` y un token con permiso de lectura/escritura. La VM descarga la imagen pública por digest.
6. En GitHub abre **Settings → Secrets and variables → Actions** y configura estos valores:

| Tipo | Nombre | Valor |
| --- | --- | --- |
| Variable | `DOCKERHUB_USERNAME` | Usuario de Docker Hub, en minúsculas |
| Variable | `OCI_REGION` | Región OCI, por ejemplo `us-ashburn-1` |
| Variable | `OCI_TENANCY_OCID` | OCID de tenancy |
| Variable | `OCI_USER_OCID` | OCID del usuario que firma las llamadas API |
| Variable | `OCI_FINGERPRINT` | Fingerprint de la API signing key |
| Variable | `OCI_NAMESPACE` | Namespace de Object Storage |
| Variable | `OCI_TF_STATE_BUCKET` | Nombre del bucket de estado |
| Variable | `OCI_COMPARTMENT_OCID` | OCID del compartimento de la VM y red |
| Variable | `OCI_AVAILABILITY_DOMAIN` | Availability domain de la VM |
| Variable | `OCI_IMAGE_OCID` | OCID de la imagen Ubuntu 24.04 compatible con el shape |
| Variable | `OCI_SSH_PUBLIC_KEY` | Clave pública SSH para el usuario `ubuntu` |
| Variable | `OCI_SHAPE` | Opcional; predeterminado `VM.Standard.A1.Flex` |
| Variable | `OCI_OCPUS` | Opcional; predeterminado `1` |
| Variable | `OCI_MEMORY_GBS` | Opcional; predeterminado `6` |
| Secret | `OCI_API_PRIVATE_KEY` | Contenido completo de la clave API privada PEM |
| Secret | `OCI_SSH_PRIVATE_KEY` | Clave privada del par SSH |
| Secret | `DOCKERHUB_TOKEN` | Token de Docker Hub con permiso de escritura |
| Variable, extra | `SITE_DOMAIN` | Subdominio dedicado, por ejemplo `portafolio.tudominio.com` |
| Variable, extra | `CLOUDFLARE_ZONE_ID` | Zone ID de la zona activa en Cloudflare |
| Secret, extra | `CLOUDFLARE_API_TOKEN` | Token de Cloudflare con **Zone → DNS → Edit** |

El usuario de la API OCI debe tener permisos para administrar Compute, VCN y Object Storage en el compartimento y leer/escribir/eliminar objetos en el bucket de estado. El bucket debe existir antes del primer `terraform init`.

Cloudflare requiere una zona activa con nameservers delegados. El script actualiza el registro A del subdominio para apuntar a la IP pública de OCI y Caddy solicita el certificado HTTPS. Con `SITE_DOMAIN` vacío, el sitio se verifica por HTTP en la IP pública.

## Demostrar el pipeline

El código ya está publicado en la rama `dev` de [jesus-z/portfolio-cicd](https://github.com/jesus-z/portfolio-cicd). Si clonas el proyecto en otra computadora, usa:

```bash
git clone https://github.com/jesus-z/portfolio-cicd.git
cd portfolio-cicd
git switch dev
```

Cada `push` a `dev` ejecuta las nueve pruebas. Cuando termines la configuración de Docker Hub y OCI en GitHub, integra `dev` en `main` para activar el despliegue y crear los recursos OCI:

```bash
git switch main
git merge --ff-only dev
git push origin main
```

En **Publicar y desplegar portafolio**, revisa las pruebas, el paso de Docker Hub, la salida de Terraform y el resultado de Ansible. El resumen final muestra la URL. Abre la URL y `/api/health`. Para mostrar el extra de Cloudflare, captura el registro A, la dirección HTTPS en el navegador y el resumen del workflow.

## Retirar la infraestructura después de la práctica

Desde una terminal con Terraform y la CLI de OCI configurada con el mismo usuario/perfil autorizado, ejecuta el destroy desde `infrastructure/terraform`. El bucket con el estado no se elimina porque es un recurso preexistente. Revisa el plan antes de confirmar. La VM, volúmenes u otras opciones fuera del nivel gratuito pueden generar cargos.

```bash
cd infrastructure/terraform
terraform init \
  -backend-config="bucket=NOMBRE_BUCKET" \
  -backend-config="namespace=NAMESPACE_OBJECT_STORAGE" \
  -backend-config="region=REGION_OCI" \
  -backend-config="key=jesus-z/portfolio-cicd/production.tfstate"
terraform destroy \
  -var="compartment_ocid=OCID_COMPARTIMENTO" \
  -var="availability_domain=DOMINIO_DISPONIBILIDAD" \
  -var="image_ocid=OCID_IMAGEN_UBUNTU" \
  -var="ssh_public_key=CLAVE_PUBLICA_SSH"
```

Si creaste un registro de Cloudflare, elimínalo desde el panel de la zona al retirar el sitio.

## Documentación oficial

- [Backend nativo OCI de Terraform](https://developer.hashicorp.com/terraform/language/backend/oci)
- [Documentación del proveedor Terraform OCI](https://registry.terraform.io/providers/oracle/oci/latest/docs)
- [Crear una instancia OCI con Terraform](https://docs.oracle.com/en-us/iaas/Content/dev/terraform/tutorials/tf-compute.htm)
- [Imágenes Ubuntu 24.04 en OCI](https://docs.oracle.com/en-us/iaas/Content/Compute/References/images.htm)
- [Almacenamiento de estado en OCI Object Storage](https://docs.oracle.com/en-us/iaas/Content/dev/terraform/object-storage-state.htm)
- [Docker Engine en Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [API DNS de Cloudflare](https://developers.cloudflare.com/api/resources/dns/subresources/records/)
