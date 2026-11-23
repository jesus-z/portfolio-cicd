# PORTAFOLIO cyberpunk con CI/CD

Rediseño responsive de [jesus-z/PORTFOLIO](https://github.com/jesus-z/PORTFOLIO). La portada usa el retrato original en WebP con respaldo PNG. Incluye modo claro y oscuro, música bajo demanda y un CV con estilos para imprimir o guardar como PDF.

Vite empaqueta el módulo de React y el paso de compilación incluye las tres tarjetas en el HTML. React actualiza los proyectos con `GET /api/projects` en Express, que lee los datos desde SQLite. Si la API falla o JavaScript está desactivado, el HTML de la compilación conserva las tarjetas. Se conservan las secciones de trayectoria, formación, habilidades e idiomas, junto con el ambiente cyberpunk: cursor visual, carga breve, barra de lectura, partículas acotadas, red y lluvia Matrix, retrato holográfico, controles flotantes, contadores, ripple y visualizador de audio. Los elementos animados son finitos o reutilizados y priorizan `transform` y `opacity`; no se crean partículas en bucles permanentes. El movimiento reducido respeta `prefers-reduced-motion` y la portada conserva su contenido aunque falten APIs de animación.

## Estructura del proyecto

- `frontend/`: páginas, estilos, scripts, componentes React e imágenes y audio.
- `backend/`: API Express, acceso a SQLite y base local en `backend/data/`.
- `infrastructure/`: configuración Terraform y archivos de despliegue para AWS/Ansible.
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
| Dockerfile, Compose y Docker Hub | Imagen amd64 etiquetada con el SHA del commit y desplegada por digest |
| Terraform | EC2 con Ubuntu 24.04 LTS, VPC, dos subredes públicas, rutas y Elastic IP |
| Configuración de VM | Ansible instala Git, Docker y Compose, activa UFW y comprueba las reglas de iptables para TCP 80 y 443 |
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

## Configurar GitHub, Docker Hub y AWS

1. En Docker Hub crea un repositorio **público** llamado `portafolio-cicd`. Genera un token de Docker Hub con permiso de escritura. La VM descarga la imagen pública por digest.
2. En AWS crea un bucket S3 privado, con bloqueo de acceso público, cifrado y versionado. Terraform guarda el estado en la clave `OWNER/REPO/production.tfstate` y usa un objeto `.tflock` para el bloqueo.
3. En AWS IAM registra el proveedor OIDC `https://token.actions.githubusercontent.com` con audiencia `sts.amazonaws.com`, si tu cuenta todavía no lo tiene. Crea un rol para el workflow y limita su condición de confianza al repositorio y la rama `main`. Usa [aws-trust.example.json](infrastructure/deploy/aws-trust.example.json) como plantilla. Reemplaza `ACCOUNT_ID` y usa `jesus-z/PORTFOLIO` como `OWNER/REPO`.
4. Adjunta al rol una política de permisos para el laboratorio. Usa [aws-permissions.example.json](infrastructure/deploy/aws-permissions.example.json) como plantilla y reemplaza ACCOUNT_ID, AWS_REGION, TF_STATE_BUCKET y OWNER/REPO. La política cubre EC2, IAM, el estado S3 y Systems Manager. Adapta los permisos si tu cuenta aplica restricciones de organización.
5. En GitHub abre **Settings → Secrets and variables → Actions** y agrega estos valores.

| Tipo | Nombre | Valor |
| --- | --- | --- |
| Variable | `DOCKERHUB_USERNAME` | Usuario de Docker Hub, en minúsculas |
| Variable | `AWS_REGION` | Región de EC2, por ejemplo `us-east-1` |
| Variable | `TF_STATE_BUCKET` | Nombre del bucket creado para Terraform |
| Variable | `TF_STATE_REGION` | Región del bucket |
| Secret | `DOCKERHUB_TOKEN` | Token de Docker Hub con escritura |
| Secret | `AWS_ROLE_ARN` | ARN del rol de GitHub Actions |
| Variable, extra | `SITE_DOMAIN` | Subdominio dedicado, por ejemplo `portafolio.tudominio.com` |
| Variable, extra | `CLOUDFLARE_ZONE_ID` | Zone ID del dominio activo en Cloudflare |
| Secret, extra | `CLOUDFLARE_API_TOKEN` | Token limitado a la zona, con permiso **Zone → DNS → Edit** |

Cloudflare requiere una zona activa con sus nameservers ya delegados. Usa un subdominio dedicado porque el script actualiza su registro A para apuntar a la IP de EC2. Cloudflare gestiona el DNS y Caddy emite el certificado HTTPS. Con `SITE_DOMAIN` vacío, la URL de verificación usa HTTP en la IP pública.

## Demostrar el pipeline

Clona tu repositorio y crea `dev` a partir de `main`:

```bash
git clone https://github.com/jesus-z/PORTFOLIO.git
cd PORTFOLIO
git switch -c dev
```

Extrae el ZIP sobre esa carpeta. Incluye los archivos originales y la carpeta `.github`. En la carpeta del repositorio, ejecuta:

```bash
git add .
git commit -m "Adaptar portafolio a la practica de CI/CD"
git push -u origin dev
```

En **Actions**, abre **Pruebas automatizadas** y revisa las nueve pruebas. Con Docker Hub y AWS ya configurados, integra `dev` en `main` para activar el despliegue:

```bash
git switch main
git merge --ff-only dev
git push origin main
```

En **Publicar y desplegar portafolio**, revisa las pruebas, el paso de Docker Hub, la salida de Terraform y el resultado de Ansible. El resumen final muestra la URL. Abre la URL y `/api/health`. Para mostrar el extra de Cloudflare, captura el registro A, la dirección HTTPS en el navegador y el resumen del workflow.

## Retirar la infraestructura después de la práctica

EC2, EBS e IPv4 pública pueden generar cargos. Desde una terminal con Terraform y una sesión AWS autorizada, usa los mismos valores del despliegue. El comando `destroy` muestra el plan antes de confirmar.

```bash
cd infrastructure/terraform
terraform init -backend-config="bucket=NOMBRE_BUCKET" -backend-config="region=REGION_BUCKET" -backend-config="key=OWNER/REPO/production.tfstate"
terraform destroy -var="region=REGION_EC2"
```

Si creaste el registro de Cloudflare, elimínalo desde el panel de la zona cuando retires el sitio.

## Documentación oficial

- [AWS OIDC para GitHub Actions](https://github.com/aws-actions/configure-aws-credentials#oidc)
- [Imágenes de Ubuntu en AWS](https://ubuntu.com/aws/docs/aws-how-to/instances/find-ubuntu-images/)
- [Backend S3 de Terraform](https://developer.hashicorp.com/terraform/language/backend/s3)
- [Docker Engine en Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [API DNS de Cloudflare](https://developers.cloudflare.com/api/resources/dns/subresources/records/)
