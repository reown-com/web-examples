#!/usr/bin/env bash
# Installs a local walletconnect-monorepo build of @walletconnect/sign-client (and the types, utils
# and core it needs) into Nimbus and Ember, without touching package.json or pnpm-lock.yaml.
#
#   v3/scripts/use-local-sdk.sh            build, pack and install into v3/app and v3/wallet
#   SKIP_BUILD=1 v3/scripts/use-local-sdk.sh   pack what is already built
#   v3/scripts/use-local-sdk.sh --undo     reinstall the published packages from the lockfile
#
# MONOREPO_DIR defaults to a walletconnect-monorepo checkout next to web-examples. The packages are
# packed to v3/.local-sdk and swapped in by local-sdk.pnpmfile.cjs, with --no-lockfile, so `git
# status` stays clean. The Sign v3 WASM is already embedded in sign-client's source
# (src/v3/wasm, from scripts/sync-v3-wasm.sh there), so building needs no Rust.
set -euo pipefail

v3=$(cd "$(dirname "$0")/.." && pwd)
apps=("$v3/app" "$v3/wallet")

if [ "${1:-}" = --undo ]; then
  for app in "${apps[@]}"; do (cd "$app" && rm -rf node_modules .next && pnpm install --frozen-lockfile); done
  exit 0
fi

mono=$(cd "${MONOREPO_DIR:-$v3/../../walletconnect-monorepo}" && pwd)
pkgs=(types utils core sign-client)
out=$v3/.local-sdk
rm -rf "$out" && mkdir -p "$out"

for p in "${pkgs[@]}"; do
  dir=$mono/packages/$p
  if [ -z "${SKIP_BUILD:-}" ]; then (cd "$dir" && npm run build >/dev/null); fi
  tgz=$(cd "$dir" && npm pack --pack-destination "$out" --silent | tail -1)
  mv "$out/$tgz" "$out/$p.tgz"
done
echo "packed from $(git -C "$mono" rev-parse --short HEAD)$(git -C "$mono" diff --quiet || echo +dirty) into $out"

for app in "${apps[@]}"; do
  (cd "$app" && rm -rf .next && LOCAL_SDK_DIR=$out pnpm install --no-lockfile --force \
    --pnpmfile "$v3/scripts/local-sdk.pnpmfile.cjs")
done
