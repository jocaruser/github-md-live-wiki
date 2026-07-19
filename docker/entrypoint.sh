#!/bin/sh
# Runs the github-md-live-wiki image. The app is fully client-side, so there is
# no runtime configuration — the container only serves or exports the bundle.
#   serve  (default) — static server on $PORT
#   export           — copy the site into the /out mount
set -eu

SITE=/site
MODE="${1:-serve}"

case "$MODE" in
  serve)
    exec node /app/server.mjs
    ;;
  export)
    if [ ! -d /out ]; then
      echo "github-md-live-wiki: mount an output directory at /out" >&2
      exit 1
    fi
    find /out -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    cp -R "$SITE"/. /out/
    echo "github-md-live-wiki: site exported to /out"
    ;;
  *)
    echo "github-md-live-wiki: unknown mode '$MODE' (use serve or export)" >&2
    exit 1
    ;;
esac
