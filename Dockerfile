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

# runtime: the published image. The app is fully client-side (content is
# fetched from GitHub in the browser), so the container just serves the static
# bundle, in two modes:
#   serve  — static server on :5176
#   export — copies the site into a directory mounted at /out
FROM node:25-alpine AS runtime

COPY --from=build /app/dist /site
COPY docker/server.mjs /app/server.mjs
COPY docker/entrypoint.sh /app/entrypoint.sh
# Serving is read-only and runs as the unprivileged user.
RUN chmod +x /app/entrypoint.sh
USER node

ENV PORT=5176
EXPOSE 5176

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["serve"]
