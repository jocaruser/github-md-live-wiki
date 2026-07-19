.PHONY: help init up down logs clean sync-main dev build preview install add add-dev quality-gate ci audit budget lint react-doctor format test e2e-test image image-serve image-export bash-exec shell

APP = docker compose exec app
E2E_PORT ?= 5177
IMAGE ?= ghcr.io/jocaruser/github-md-live-wiki:dev

.DEFAULT_GOAL := help

# ============ HELP ============
help: ## List available commands
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ============ SETUP ============
init: ## Build images, start containers, install deps
	@echo "🚀 Initializing github-md-live-wiki..."
	docker compose build
	docker compose up -d
	$(MAKE) install
	@echo ""
	@echo "✅ Ready! Run 'make dev' and open http://localhost:5176"

# ============ DOCKER ============
up: ## Start containers in the background
	docker compose up -d

down: ## Stop containers
	docker compose down

logs: ## Follow app container logs
	docker compose logs -f app

clean: ## Remove containers, volumes, and local images
	docker compose down -v --rmi local

# ============ GIT ============
sync-main: ## Checkout main and pull --rebase (autostash)
	git checkout main && git pull --rebase --autostash

# ============ DEVELOPMENT ============
dev: ## Vite dev server on :5176
	$(APP) pnpm dev

build: ## Typecheck and production build
	$(APP) pnpm build

preview: ## Preview the production build on :5176
	$(APP) pnpm preview

# ============ DEPENDENCIES ============
install: ## pnpm install inside the app container
	$(APP) sh -c 'export CI=true && pnpm install'

add: ## Add runtime dependency (PKG=<name>)
	$(APP) pnpm add $(PKG)

add-dev: ## Add dev dependency (PKG=<name>)
	$(APP) pnpm add -D $(PKG)

# ============ QUALITY ============
# Local quality gate: build, lint, unit tests, and e2e tests. Use before finishing any code change.
quality-gate: build lint react-doctor test e2e-test ## Sequential full gate: build, lint, react-doctor, unit, e2e
	@echo ""
	@echo "✅ Quality gate passed (build, lint, react-doctor, unit tests, e2e tests)"

# Local mirror of the CI jobs: the independent checks in parallel, then e2e (it owns the
# container's Vite port and CPU, so racing it against the unit suite flakes).
ci: ## Run all checks; fast ones in parallel, then e2e
	$(MAKE) -j4 budget lint react-doctor test audit
	$(MAKE) e2e-test

audit: ## Dependency vulnerability gate (fails on high/critical)
	$(APP) pnpm audit --audit-level=high

budget: build ## Performance budget: gzipped bundle within limits (P2)
	$(APP) node scripts/check-bundle-budget.mjs

lint: ## ESLint (0 errors required)
	$(APP) pnpm lint

react-doctor: ## React Doctor over changed files vs main
	$(APP) sh -c 'if ! git show-ref --quiet refs/heads/main; then git fetch origin main:refs/heads/main 2>/dev/null || true; fi; pnpm exec react-doctor . --offline --scope changed --base main --blocking warning'

format: ## Prettier (write)
	$(APP) pnpm format

# Forward CI env into the container so Vitest can tune parallelism (GitHub sets CI=true on the host).
test: ## Vitest unit tests with 100% coverage thresholds
	docker compose exec -e CI=${CI} -e GITHUB_ACTIONS=${GITHUB_ACTIONS} app pnpm test

# The e2e build bakes a fixture repo id; Playwright intercepts the GitHub API
# and raw content requests, so the suite runs fully offline against the
# PRODUCTION bundle served by `vite preview`.
# Start the server with nohup so it survives the exec shell exiting; -T avoids
# signal issues when the exec session detaches.
e2e-test: ## Playwright e2e suite against a production build (preview on :5177)
	docker compose up -d app
	docker compose exec app sh -c 'kill $$(cat /tmp/github-md-live-wiki-e2e-$(E2E_PORT).pid 2>/dev/null) 2>/dev/null; rm -f /tmp/github-md-live-wiki-e2e-$(E2E_PORT).pid /tmp/github-md-live-wiki-e2e-$(E2E_PORT).log; true'
	docker compose exec -T app sh -c 'pnpm exec vite build --outDir dist-e2e --logLevel warn'
	docker compose exec -d -T app sh -c 'nohup pnpm exec vite preview --strictPort --port $(E2E_PORT) --host 0.0.0.0 --outDir dist-e2e >>/tmp/github-md-live-wiki-e2e-$(E2E_PORT).log 2>&1 & echo $$! > /tmp/github-md-live-wiki-e2e-$(E2E_PORT).pid'
	@n=0; until docker compose exec app wget -q -O- http://127.0.0.1:$(E2E_PORT)/ >/dev/null 2>&1; do \
		n=$$((n+1)); \
		if [ $$n -gt 120 ]; then echo 'E2E: preview did not become ready on port $(E2E_PORT) (see /tmp/github-md-live-wiki-e2e-$(E2E_PORT).log in app container)'; docker compose exec app sh -c 'kill $$(cat /tmp/github-md-live-wiki-e2e-$(E2E_PORT).pid 2>/dev/null) 2>/dev/null; rm -f /tmp/github-md-live-wiki-e2e-$(E2E_PORT).pid'; exit 1; fi; \
		sleep 0.5; \
	done
	docker compose run --rm -e CI=$${CI} -e PLAYWRIGHT_BASE_URL=http://web:$(E2E_PORT) playwright pnpm exec playwright test
	@docker compose exec app sh -c 'kill $$(cat /tmp/github-md-live-wiki-e2e-$(E2E_PORT).pid 2>/dev/null) 2>/dev/null; rm -f /tmp/github-md-live-wiki-e2e-$(E2E_PORT).pid'

# ============ IMAGE ============
image: ## Build the production Docker image (IMAGE=<tag>)
	docker build -t $(IMAGE) .

image-serve: image ## Run the production image on :5176
	docker run --rm -p 5176:5176 $(IMAGE)

image-export: image ## Export the static site to ./dist-export
	mkdir -p dist-export
	docker run --rm -v $(PWD)/dist-export:/out $(IMAGE) export

# ============ ESCAPE HATCH ============
bash-exec: ## Run a one-off command in the app container (CMD="...")
	$(APP) $(CMD)

shell: ## Interactive shell in the app container
	docker compose exec app sh
