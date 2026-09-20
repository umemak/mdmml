.PHONY: all test build wasm web-dev web-build deploy

all: test build

test:
	go test ./...

build:
	go build -o bin/mdmml ./cmd/mdmml

wasm:
	cd web && npm run build:wasm

web-dev:
	cd web && npm run dev

web-build:
	cd web && npm run build

deploy:
	cd web && npm run deploy
