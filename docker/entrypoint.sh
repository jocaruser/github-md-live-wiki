#!/bin/sh
# Configures and runs the github-md-live-wiki image.
#   serve  (default) — static server on $PORT; /content mount enables local mode
#   export           — copy the configured site into the /out mount
set -eu

SITE=/site
MODE="${1:-serve}"

LOCAL_CONTENT=false
# Local mode only exists in serve mode: a static export has no server to
# expose a mounted directory through.
if [ "$MODE" = "serve" ] && [ -d /content ]; then
  LOCAL_CONTENT=true
fi
if [ "$MODE" = "export" ] && [ -d /content ]; then
  echo "github-md-live-wiki: note: /content is ignored in export mode" >&2
fi

if [ "$LOCAL_CONTENT" = "false" ] && [ -z "${CONTENT_REPO:-}" ]; then
  echo "github-md-live-wiki: set CONTENT_REPO=owner/name, or mount a content directory at /content" >&2
  exit 1
fi

# JSON.stringify makes the generated file immune to quotes/newlines/script in
# the env values — never interpolate them into JS source directly.
LOCAL_CONTENT="$LOCAL_CONTENT" node -e '
  const config = {
    contentRepo: process.env.CONTENT_REPO ?? "",
    contentPath: process.env.CONTENT_PATH ?? "",
    siteTitle: process.env.SITE_TITLE ?? "",
    appUrl: process.env.APP_URL ?? "",
    defaultRef: process.env.DEFAULT_REF ?? "",
    localContent: process.env.LOCAL_CONTENT === "true",
  }
  require("node:fs").writeFileSync(
    "/site/config.js",
    "window.__WIKI_CONFIG__ = " + JSON.stringify(config) + "\n"
  )
'

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
