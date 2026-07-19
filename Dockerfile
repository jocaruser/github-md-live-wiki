# base: the development container used by docker-compose (source bind-mounted).
FROM node:25-alpine AS base

# Pin pnpm to v9 to avoid breaking changes in v10 regarding build scripts
RUN npm install -g pnpm@9.15.0

# Git is required by react-doctor for --scope changed / --diff mode
RUN apk add --no-cache git

WORKDIR /app

EXPOSE 5176

CMD ["tail", "-f", "/dev/null"]

# build: compiles the static shell.
FROM base AS build

COPY package.json pnpm-lock.yaml ./
RUN CI=true pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# runtime: the published image. One image serves any content repository:
# the entrypoint writes /site/config.js from CONTENT_REPO / CONTENT_PATH /
# SITE_TITLE / APP_URL / DEFAULT_REF at start, in both modes:
#   serve  — static server on :5176 (mount a directory at /content for local mode)
#   export — copies the configured site into a directory mounted at /out
FROM node:25-alpine AS runtime

COPY --from=build /app/dist /site
COPY docker/server.mjs /app/server.mjs
COPY docker/entrypoint.sh /app/entrypoint.sh
# The entrypoint rewrites /site/config.js from env at start; nothing else in
# the image needs write access, and serving runs as the unprivileged user.
RUN chmod +x /app/entrypoint.sh && chown -R node:node /site
USER node

ENV PORT=5176
EXPOSE 5176

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["serve"]
