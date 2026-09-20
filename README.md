# mdmml

Markdown | Music Macro Language

A library to convert MML written in Markdown to SMF.

## Usage

### CLI

```bash
$ go run cmd/mdmml/main.go testdata/demo.md > demo.mid
```

### Web UI (Browser & Cloudflare Workers)

WebAssembly (Wasm) と Web Audio API (Tone.js) を用いた Web UI でブラウザ上で即座にプレビュー・再生・MIDIダウンロードが可能です。

```bash
# 開発サーバー起動
$ make web-dev
# または
$ cd web && npm run dev

# ビルド (Wasm + Frontend)
$ make web-build
# または
$ cd web && npm run build

# Cloudflare Workers にデプロイ
$ make deploy
# または
$ cd web && npm run deploy
```

## MML

- The first column of the table will be the part name; the second and subsequent columns should contain the MML.
- Lines with the same part name will be played in order from the top.

| symbol | 意味 | 備考 |
| --- | --- | --- |
| cdefgab | 音階 |  |
| +, # | 半音上げ | 音階の直後に書く |
| - | 半音下げ | 音階の直後に書く |
| . | 符点 | |
| ^ | タイ | |
| r | 休符 |  |
| l | 省略時音長 | |
| o | オクターブ | |
| > | 1オクターブ上げ | |
| < | 1オクターブ下げ | |
| v | ベロシティ | 0～127 |
| @ | 音色 | 1～128 |
| $ | チャンネル | 1～16 |
| t | テンポ | 1～960 |
| p | パンポット | 0～64～127 |
| [] | 繰り返し | |
| {} | 和音 | |

## License

MIT

