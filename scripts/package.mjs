#!/usr/bin/env node
import { mkdir, rm, cp, writeFile, readFile, access } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { readdir, stat } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

async function pathExists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath);
    } else {
      yield fullPath;
    }
  }
}

async function createTarGz(sourceDir, outPath) {
  const { execSync } = await import('node:child_process');
  // Convert Windows paths to MSYS-style (/c/Users/...) to avoid tar interpreting C: as remote host
  const toMsys = (p) => p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
  const msysSource = toMsys(sourceDir);
  const msysOut = toMsys(outPath);
  execSync(`tar -czf "${msysOut}" -C "${msysSource}" .`, { stdio: 'inherit' });
}

async function main() {
  const buildDir = join(rootDir, 'package-build');
  const distDir = join(rootDir, 'dist');
  const proxiesPath = join(rootDir, 'config', 'proxies.yml');
  const outDir = join(rootDir, 'build');

  if (await pathExists(buildDir)) await rm(buildDir, { recursive: true });
  await mkdir(buildDir, { recursive: true });
  await mkdir(join(buildDir, 'static'), { recursive: true });
  await mkdir(join(buildDir, 'default'), { recursive: true });
  await mkdir(outDir, { recursive: true });

  if (!(await pathExists(distDir))) {
    throw new Error('dist/ not found — run npm run build first.');
  }

  await cp(distDir, join(buildDir, 'static'), { recursive: true });

  if (await pathExists(proxiesPath)) {
    await cp(proxiesPath, join(buildDir, 'default', 'proxies.yml'));
  }

  const pkg = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'));
  const packMeta = {};
  for (const k of ['name', 'version', 'displayName', 'description', 'author', 'license']) {
    if (pkg[k]) packMeta[k] = pkg[k];
  }
  await writeFile(join(buildDir, 'package.json'), JSON.stringify(packMeta, null, 2));

  const filename = `${pkg.name}-${pkg.version}.tgz`;
  const outPath = join(outDir, filename);

  await createTarGz(buildDir, outPath);

  await rm(buildDir, { recursive: true });
  console.log(`✓ Packaged: build/${filename}`);
}

main().catch((err) => { console.error('✖', err.message); process.exit(1); });
