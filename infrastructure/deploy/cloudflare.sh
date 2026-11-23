#!/usr/bin/env bash
set -euo pipefail

: "${CF_API_TOKEN:?Falta CLOUDFLARE_API_TOKEN}"
: "${CF_ZONE_ID:?Falta CLOUDFLARE_ZONE_ID}"
: "${SITE_DOMAIN:?Falta SITE_DOMAIN}"
: "${PUBLIC_IP:?Falta la IP pública}"

url="https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records"
headers=(-H "Authorization: Bearer ${CF_API_TOKEN}" -H 'Content-Type: application/json')
records=$(curl --silent --show-error --fail-with-body "${headers[@]}" --get \
  --data-urlencode 'type=A' --data-urlencode "name=${SITE_DOMAIN}" "$url")
jq -e '.success and (.result | length <= 1)' <<< "$records" >/dev/null

payload=$(jq -nc --arg name "$SITE_DOMAIN" --arg ip "$PUBLIC_IP" \
  '{type:"A", name:$name, content:$ip, ttl:60, proxied:false}')
record_id=$(jq -r '.result[0].id // empty' <<< "$records")
if [[ -n "$record_id" ]]; then
  method=PATCH
  url="$url/$record_id"
else
  method=POST
fi

curl --silent --show-error --fail-with-body "${headers[@]}" -X "$method" \
  --data "$payload" "$url" | jq -e '.success' >/dev/null
