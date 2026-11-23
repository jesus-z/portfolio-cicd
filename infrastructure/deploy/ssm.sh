#!/usr/bin/env bash
set -euo pipefail

: "${INSTANCE_ID:?Falta el ID EC2}"
: "${PORTFOLIO_IMAGE:?Falta la imagen Docker}"
site_address=${SITE_DOMAIN:-:80}

online=false
for attempt in {1..60}; do
  status=$(aws ssm describe-instance-information \
    --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
    --query 'InstanceInformationList[0].PingStatus' --output text)
  if [[ "$status" == Online ]]; then
    online=true
    break
  fi
  sleep 5
done
if [[ "$online" != true ]]; then
  echo 'La instancia no se registró en Systems Manager.' >&2
  exit 1
fi

bundle=$(tar -czf - compose.yaml Caddyfile infrastructure/deploy/playbook.yml | base64 -w0)
config=$(jq -nc --arg portfolio_image "$PORTFOLIO_IMAGE" --arg site_address "$site_address" \
  '{portfolio_image:$portfolio_image, site_address:$site_address}' | base64 -w0)
remote_script=$(cat <<EOF
set -eu
export DEBIAN_FRONTEND=noninteractive
cloud-init status --wait
apt-get -q -o DPkg::Lock::Timeout=180 update
apt-get -qy -o DPkg::Lock::Timeout=180 install ansible-core
bundle_dir=\$(mktemp -d)
trap 'rm -rf "\$bundle_dir"' EXIT
echo '$bundle' | base64 -d | tar -xz -C "\$bundle_dir"
echo '$config' | base64 -d > "\$bundle_dir/config.json"
ansible-playbook -i localhost, "\$bundle_dir/infrastructure/deploy/playbook.yml" \
  -e "@\$bundle_dir/config.json" -e "bundle_dir=\$bundle_dir"
EOF
)
parameters=$(jq -nc --arg script "$remote_script" '{commands:[$script], executionTimeout:["900"]}')
command_id=$(aws ssm send-command --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript --parameters "$parameters" --timeout-seconds 120 \
  --query 'Command.CommandId' --output text)

for attempt in {1..110}; do
  if invocation=$(aws ssm get-command-invocation --command-id "$command_id" --instance-id "$INSTANCE_ID" --output json 2>&1); then
    status=$(jq -r '.Status' <<< "$invocation")
    case "$status" in
      Success)
        jq -r '.StandardOutputContent' <<< "$invocation"
        exit 0
        ;;
      Pending|InProgress|Delayed|Cancelling) ;;
      *)
        jq -r '.StandardOutputContent, .StandardErrorContent, .StatusDetails' <<< "$invocation" >&2
        exit 1
        ;;
    esac
  elif [[ "$invocation" != *InvocationDoesNotExist* ]]; then
    echo "$invocation" >&2
    exit 1
  fi
  sleep 10
done
echo "Agotado el tiempo para el comando SSM $command_id." >&2
exit 1
