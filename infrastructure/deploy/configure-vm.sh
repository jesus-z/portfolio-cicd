#!/usr/bin/env bash
set -euo pipefail

: "${PUBLIC_IP:?Falta la IP pública de OCI}"
: "${PORTFOLIO_IMAGE:?Falta la imagen Docker}"
: "${RUNNER_TEMP:?Falta el directorio temporal de GitHub Actions}"

inventory="$RUNNER_TEMP/oci_inventory.ini"
cat > "$inventory" <<EOF
$PUBLIC_IP ansible_user=ubuntu ansible_ssh_private_key_file=$RUNNER_TEMP/oci_ssh_key ansible_ssh_common_args='-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null'
EOF

ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook \
  -i "$inventory" \
  infrastructure/deploy/playbook.yml \
  -e "portfolio_image=$PORTFOLIO_IMAGE" \
  -e "site_address=${SITE_DOMAIN:-:80}"
