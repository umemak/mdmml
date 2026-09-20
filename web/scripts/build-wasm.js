import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(webDir, '..');
const publicDir = path.join(webDir, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Ensure Go is in PATH if in /usr/local/go/bin
const env = { ...process.env };
if (!env.PATH.includes('/usr/local/go/bin')) {
  env.PATH = `/usr/local/go/bin:${env.PATH}`;
}

console.log('[build-wasm] Locating Go environment...');
let goroot = '';
try {
  goroot = execSync('go env GOROOT', { env }).toString().trim();
} catch (e) {
  console.error('Error finding go. Please ensure Go is installed.', e);
  process.exit(1);
}

// Copy wasm_exec.js
const p1 = path.join(goroot, 'lib', 'wasm', 'wasm_exec.js');
const p2 = path.join(goroot, 'misc', 'wasm', 'wasm_exec.js');
const wasmExecSrc = fs.existsSync(p1) ? p1 : p2;

if (!fs.existsSync(wasmExecSrc)) {
  console.error(`Cannot find wasm_exec.js in ${goroot}`);
  process.exit(1);
}

const wasmExecDst = path.join(publicDir, 'wasm_exec.js');
fs.copyFileSync(wasmExecSrc, wasmExecDst);
console.log(`[build-wasm] Copied ${wasmExecSrc} -> ${wasmExecDst}`);

// Compile Wasm
console.log('[build-wasm] Compiling Go Wasm (cmd/wasm)...');
const wasmDst = path.join(publicDir, 'mdmml.wasm');
const buildCmd = `go build -ldflags="-s -w" -o "${wasmDst}" ./cmd/wasm`;

execSync(buildCmd, {
  cwd: rootDir,
  env: {
    ...env,
    GOOS: 'js',
    GOARCH: 'wasm',
  },
  stdio: 'inherit',
});

const stats = fs.statSync(wasmDst);
console.log(`[build-wasm] Built mdmml.wasm (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
