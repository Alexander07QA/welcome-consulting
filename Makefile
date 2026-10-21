.PHONY: dev dev-backend dev-frontend test check up down

dev:
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

test:
	cd backend && pytest -q
	cd frontend && npm test

check:
	cd backend && ruff check . && mypy app
	cd frontend && npm run lint && npm run typecheck

up:
	docker compose up -d --build

down:
	docker compose down
