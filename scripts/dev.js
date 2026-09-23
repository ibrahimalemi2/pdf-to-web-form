import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Locate the best Python interpreter
function getPythonCommand() {
  const venvWin = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');
  const venvUnix = path.join(projectRoot, '.venv', 'bin', 'python');

  if (fs.existsSync(venvWin)) {
    return venvWin;
  }
  if (fs.existsSync(venvUnix)) {
    return venvUnix;
  }

  return process.platform === 'win32' ? 'python' : 'python3';
}

const pythonCmd = getPythonCommand();
const backendScript = path.join(projectRoot, 'backend', 'main.py');
const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');

console.log('\x1b[1m\x1b[32m%s\x1b[0m', '════════════════════════════════════════════════════════════════════');
console.log('\x1b[1m\x1b[36m%s\x1b[0m', '  🚀 Starting PDF to Web Form (Frontend + Backend)...');
console.log('\x1b[90m%s\x1b[0m', `  Python interpreter: ${pythonCmd}`);
console.log('\x1b[90m%s\x1b[0m', `  Frontend: Vite (React)`);
console.log('\x1b[90m%s\x1b[0m', `  Backend:  FastAPI + PyMuPDF (Port 8000)`);
console.log('\x1b[1m\x1b[32m%s\x1b[0m', '════════════════════════════════════════════════════════════════════\n');

// 2. Spawn Backend (FastAPI)
const backend = spawn(pythonCmd, [backendScript], {
  cwd: projectRoot,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: false,
  env: {
    ...process.env,
    PYTHONUNBUFFERED: '1',
  },
});

// 3. Spawn Frontend (Vite)
const frontend = spawn(process.execPath, [viteBin], {
  cwd: projectRoot,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: false,
  env: {
    ...process.env,
    FORCE_COLOR: '1',
  },
});

function pipeOutput(child, prefix, colorCode) {
  const tag = `\x1b[${colorCode}m[${prefix}]\x1b[0m `;
  if (child.stdout) {
    const rlOut = readline.createInterface({ input: child.stdout });
    rlOut.on('line', (line) => console.log(`${tag}${line}`));
  }
  if (child.stderr) {
    const rlErr = readline.createInterface({ input: child.stderr });
    rlErr.on('line', (line) => console.error(`${tag}${line}`));
  }
}

pipeOutput(backend, 'Backend', '33');   // Yellow tag
pipeOutput(frontend, 'Frontend', '36'); // Cyan tag

let isShuttingDown = false;
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n\x1b[35m[Dev]\x1b[0m Stopping all services...');

  const killProc = (proc) => {
    if (!proc || !proc.pid) return;
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
      } catch {
        // Process already terminated
      }
    } else {
      try {
        proc.kill('SIGTERM');
      } catch {
        // Process already terminated
      }
    }
  };

  killProc(backend);
  killProc(frontend);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

backend.on('exit', (code) => {
  if (!isShuttingDown && code !== 0 && code !== null) {
    console.error(`\x1b[31m[Backend] Exited with code ${code}\x1b[0m`);
  }
});

frontend.on('exit', (code) => {
  if (!isShuttingDown && code !== 0 && code !== null) {
    console.error(`\x1b[31m[Frontend] Exited with code ${code}\x1b[0m`);
  }
});
