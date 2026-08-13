import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../../..");
const COMPOSE_FILE = path.join(ROOT, "infra/docker-compose.yml");
const ENV_FILE = path.join(ROOT, ".env.docker");
const IS_WIN = process.platform === "win32";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (ns, msg) => console.log(`[${ns}] ${msg}`);

const env = readEnvDev();
const ENABLE_OLLAMA = env.ENABLE_OLLAMA === "true";
const AUTO_PULL_OLLAMA = env.AUTO_PULL_OLLAMA === "true";
const OLLAMA_MODEL = "qwen3:4b";

function readEnvDev() {
  const f = path.join(ROOT, ".env.dev");
  const out = { ENABLE_OLLAMA: undefined, AUTO_PULL_OLLAMA: undefined };
  if (!fs.existsSync(f)) return out;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    if (m[1] === "ENABLE_OLLAMA") out.ENABLE_OLLAMA = m[2];
    if (m[1] === "AUTO_PULL_OLLAMA") out.AUTO_PULL_OLLAMA = m[2];
  }
  return out;
}

// Single gateway for all external processes. Returns the exit code, or
// { code, stdout } when `capture` is set.
function run(command, args = [], options = {}) {
  const { cwd = ROOT, stdio = "inherit", capture = false, ...rest } = options;
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: capture ? ["ignore", "pipe", "pipe"] : stdio,
      ...rest,
    });
    let stdout = "";
    if (capture) child.stdout.on("data", (d) => (stdout += d));
    child.on("close", (code) => resolve(capture ? { code: code ?? 0, stdout } : code ?? 0));
    child.on("error", () => resolve(capture ? { code: 1, stdout } : 1));
  });
}

function venvPython() {
  return IS_WIN
    ? path.join(ROOT, "apps/ai-service/.venv/Scripts/python.exe")
    : path.join(ROOT, "apps/ai-service/.venv/bin/python");
}

// Run a long-lived service, prefixing every output line with [name].
function spawnPrefixed(name, command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
  prefixStream(child.stdout, name, process.stdout);
  prefixStream(child.stderr, name, process.stderr);
  return child;
}

function prefixStream(stream, name, out) {
  let buf = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      out.write(`[${name}] ${buf.slice(0, idx)}\n`);
      buf = buf.slice(idx + 1);
    }
  });
  stream.on("end", () => {
    if (buf.length) out.write(`[${name}] ${buf}\n`);
  });
}

function composeArgs(extra) {
  return ["compose", "--file", COMPOSE_FILE, "--env-file", ENV_FILE, ...extra];
}

async function waitUntil(ns, check, max, delayMs) {
  log(ns, "waiting for service...");
  for (let i = 1; i <= max; i++) {
    if (await check()) {
      log(ns, "ready");
      return true;
    }
    await sleep(delayMs);
  }
  log(ns, "timed out");
  return false;
}

async function ensureDocker() {
  if ((await run("docker", ["info"], { stdio: "ignore" })) === 0) {
    log("Docker", "daemon ready");
    return;
  }
  if (IS_WIN) {
    const exe = "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";
    if (fs.existsSync(exe)) {
      log("Docker", "launching Docker Desktop...");
      spawn(exe, [], { detached: true, stdio: "ignore" }).unref();
      for (let i = 0; i < 60; i++) {
        await sleep(5000);
        if ((await run("docker", ["info"], { stdio: "ignore" })) === 0) {
          log("Docker", "daemon ready");
          return;
        }
      }
    }
  }
  log("Docker", "Docker is not running. Start Docker and rerun.");
  process.exit(1);
}

async function ensureInfra() {
  if (!fs.existsSync(ENV_FILE)) {
    log("Docker", ".env.docker missing — copy .env.docker.example to .env.docker");
    process.exit(1);
  }
  const code = await run("docker", composeArgs(["--profile", "ai", "up", "-d", "postgres", "redis"]), {
    ns: "Docker",
  });
  if (code !== 0) {
    log("Docker", "failed to start PostgreSQL/Redis");
    process.exit(1);
  }
  if (!(await waitUntil("Postgres", () => pgReady(), 60, 2000))) process.exit(1);
  if (!(await waitUntil("Redis", () => redisReady(), 60, 2000))) process.exit(1);

  if (ENABLE_OLLAMA) {
    const oc = await run("docker", composeArgs(["--profile", "ai", "up", "-d", "ollama"]), { ns: "Docker" });
    if (oc !== 0) log("Ollama", "warning: failed to start container");
    if (await waitUntil("Ollama", () => ollamaReady(), 30, 2000)) checkOllamaModel();
  }
}

const pgReady = async () =>
  (await run("docker", ["exec", "tradezen-db", "pg_isready", "-U", "postgres"], { stdio: "ignore" })) === 0;
const redisReady = async () =>
  (await run("docker", ["exec", "tradezen-redis", "redis-cli", "ping"], { stdio: "ignore" })) === 0;
const ollamaReady = async () =>
  (await run("curl", ["-s", "-o", "nul", "http://localhost:11434/api/tags"], { stdio: "ignore" })) === 0;

async function checkOllamaModel() {
  const { code, stdout } = await run("docker", ["exec", "tradezen-ollama", "ollama", "list"], { capture: true });
  if (code !== 0) {
    log("Ollama", "could not list models");
    return;
  }
  if (stdout.includes(OLLAMA_MODEL)) {
    log("Ollama", `model ${OLLAMA_MODEL} present`);
    return;
  }
  if (AUTO_PULL_OLLAMA) {
    log("Ollama", `pulling ${OLLAMA_MODEL}...`);
    await run("docker", ["exec", "tradezen-ollama", "ollama", "pull", OLLAMA_MODEL], { ns: "Ollama" });
  } else {
    log("Ollama", `required model '${OLLAMA_MODEL}' missing — run: docker exec tradezen-ollama ollama pull ${OLLAMA_MODEL}`);
  }
}

async function ensureDbBuilt() {
  const code = await run("bun", ["run", "build", "--filter=@tradezen/db"], { ns: "Build" });
  if (code !== 0) {
    log("Build", "@tradezen/db build failed");
    process.exit(1);
  }
}

function track(children) {
  const shutdown = () => {
    children.forEach((c) => {
      try {
        c.kill();
      } catch {}
    });
    process.exit(130);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const quote = (s) => `"${s.replace(/"/g, '\\"')}"`;

// Spawn a service in its own OS window so output isn't interleaved.
function spawnWindow({ title, cmd, args, cwd }) {
  if (IS_WIN) {
    spawn("cmd.exe", ["/c", "start", quote(title), "/D", cwd, cmd, ...args], {
      detached: true,
      stdio: "ignore",
      windowsVerbatimArguments: true,
    }).unref();
    return;
  }
  const command = `${quote(cmd)} ${args.map(quote).join(" ")}`;
  for (const [bin, build] of [
    ["gnome-terminal", ["--title", title, "--working-directory", cwd, "--", "bash", "-lc", `${command}; exec bash`]],
    ["xterm", ["-T", title, "-e", `cd ${quote(cwd)} && ${command}`]],
  ]) {
    const child = spawn(bin, build(title), { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
    if (child.pid) return;
  }
  spawn("osascript", ["-e", `tell app "Terminal" to do script "cd ${cwd} && ${command}"`], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

async function launchAll() {
  const targets = [
    { title: "TradeZen API", cmd: "bun", args: ["run", "dev"], cwd: path.join(ROOT, "apps/api") },
    { title: "TradeZen Web", cmd: "bun", args: ["run", "dev"], cwd: path.join(ROOT, "apps/web") },
    { title: "TradeZen AI", cmd: venvPython(), args: ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"], cwd: path.join(ROOT, "apps/ai-service") },
  ];
  targets.forEach(spawnWindow);
  log("Dev", "launched API, Web, AI in separate windows — close each window to stop that service.");
  process.exit(0);
}

async function launchOne(name) {
  if (name === "api") track([spawnPrefixed("API", "bun", ["run", "dev"], path.join(ROOT, "apps/api"))]);
  else if (name === "web") track([spawnPrefixed("Web", "bun", ["run", "dev"], path.join(ROOT, "apps/web"))]);
  else if (name === "ai")
    track([spawnPrefixed("AI", venvPython(), ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"], path.join(ROOT, "apps/ai-service"))]);
}

async function runDoctor() {
  const sections = ["Environment", "Infrastructure", "Development", "Models"];
  const checks = [];
  const add = (section, label, ok, warn = false) => checks.push({ section, label, ok, warn });

  const bun = (await run("bun", ["--version"], { stdio: "ignore" })) === 0;
  const dockerCli = (await run("docker", ["--version"], { stdio: "ignore" })) === 0;
  const daemon = dockerCli && (await run("docker", ["info"], { stdio: "ignore" })) === 0;
  add("Environment", "Bun", bun);
  add("Environment", "Docker CLI", dockerCli);
  add("Environment", "Docker daemon", daemon);

  add("Infrastructure", "PostgreSQL", daemon && (await pgReady()));
  add("Infrastructure", "Redis", daemon && (await redisReady()));
  add("Infrastructure", "Ollama", ENABLE_OLLAMA ? (await ollamaReady()) : null, true);

  add("Development", "API .env", fs.existsSync(path.join(ROOT, "apps/api/.env")));
  add("Development", "AI virtualenv", fs.existsSync(venvPython()));
  add("Development", "@tradezen/db", fs.existsSync(path.join(ROOT, "packages/db/dist")));

  let modelOk = null;
  if (ENABLE_OLLAMA) {
    const { code, stdout } = await run("docker", ["exec", "tradezen-ollama", "ollama", "list"], { capture: true, stdio: "ignore" });
    modelOk = code === 0 && stdout.includes(OLLAMA_MODEL);
  }
  add("Models", OLLAMA_MODEL, modelOk, true);

  console.log("TradeZen Doctor\n");
  let failures = 0;
  for (const sec of sections) {
    console.log(sec);
    console.log("─".repeat(sec.length));
    for (const c of checks.filter((x) => x.section === sec)) {
      let sym;
      if (c.ok === null) sym = "⚠";
      else if (c.ok) sym = "✓";
      else if (c.warn) sym = "⚠";
      else sym = "✗";
      if (c.ok === false && !c.warn) failures++;
      const note = c.ok === null ? " (skipped)" : "";
      console.log(`${sym} ${c.label}${note}`);
    }
    console.log("");
  }
  process.exit(failures > 0 ? 1 : 0);
}

const cmd = process.argv[2] || "all";
(async () => {
  switch (cmd) {
    case "doctor":
      return runDoctor();
    case "up":
      await ensureDocker();
      await ensureInfra();
      process.exit(0);
    case "down": {
      const c = await run("docker", composeArgs(["--profile", "ai", "down"]), { ns: "Docker" });
      process.exit(c === 0 ? 0 : 1);
    }
    case "api":
    case "web":
    case "ai":
      return launchOne(cmd);
    case "all":
    default:
      await ensureDocker();
      await ensureInfra();
      await ensureDbBuilt();
      return launchAll();
  }
})();
