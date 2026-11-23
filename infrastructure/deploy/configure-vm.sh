#!/usr/bin/env bash
set -euo pipefail

: "${PUBLIC_IP:?Falta la IP pública de OCI}"
: "${PORTFOLIO_IMAGE:?Falta la imagen Docker}"
: "${RUNNER_TEMP:?Falta el directorio temporal de GitHub Actions}"

inventory="$RUNNER_TEMP/oci_inventory.ini"
cat > "$inventory" <<EOF
$PUBLIC_IP ansible_user=ubuntu ansible_ssh_private_key_file=$RUNNER_TEMP/oci_ssh_key ansible_ssh_common_args='-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null'
EOF

echo "Esperando a que Ubuntu acepte conexiones SSH..."
for intento in {1..60}; do
  if ssh -i "$RUNNER_TEMP/oci_ssh_key" -o BatchMode=yes -o ConnectTimeout=4 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@"$PUBLIC_IP" true >/dev/null 2>&1; then
    break
  fi
  if [[ "$intento" == 60 ]]; then
    echo "La VM no quedó accesible por SSH en cinco minutos."
    exit 1
  fi
  sleep 5
done

ansible_output=""
if ansible_output="$(ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook \
  -i "$inventory" \
  infrastructure/deploy/playbook.yml \
  -e "portfolio_image=$PORTFOLIO_IMAGE" \
  -e "site_address=${SITE_DOMAIN:-:80}")"; then
  printf '%s\n' "$ansible_output"
else
  printf '%s\n' "$ansible_output"
  exit 1
fi

tunnel_url="$(printf '%s\n' "$ansible_output" | grep -Eo 'https://[[:alnum:]-]+\.trycloudflare\.com' | tail -n 1 || true)"
if [[ -z "$tunnel_url" ]]; then
  echo "Ansible no devolvió una URL de Cloudflare Quick Tunnel."
  exit 1
fi

echo "Verificando que el Quick Tunnel sirva la API..."
for intento in {1..30}; do
  if curl --fail --silent --show-error --max-time 15 "$tunnel_url/api/health" 2>/dev/null | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"'; then
    break
  fi
  if [[ "$intento" == 30 ]]; then
    echo "La URL del túnel no respondió correctamente a /api/health."
    exit 1
  fi
  sleep 4
done

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf '\n### URL gratuita de Cloudflare Quick Tunnel\n\n%s\n\n> Es temporal y puede cambiar cuando el túnel se reinicie.\n' "$tunnel_url" >> "$GITHUB_STEP_SUMMARY"
fi
echo "Quick Tunnel disponible: $tunnel_url"
