// Packs the plugin archive that the Anthropic directory and OpenAI's "Skills only" upload accept, at the archive root:
// .claude-plugin/plugin.json, the Agent Plugins plugin.json (OpenAI reads the package identity and listing fields from
// its extensions["com.openai"]), skills/<name>/SKILL.md for each skill, README.md and LICENSE.
// Written with Node built-ins only, and deterministic: the same files always give the same bytes.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { buildIndex, isEntryPoint } from './build-wellknown.mjs';
import { PLUGIN } from './manifests.mjs';

export const ZIP_NAME = `${PLUGIN.name}.zip`;

// Every entry gets the same timestamp, 1980-01-01 00:00 (the earliest a ZIP can hold), so builds are reproducible.
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;
const UTF8_NAMES = 0x0800;
const VERSION_MADE_BY = (3 << 8) | 20; // Unix, ZIP 2.0
const VERSION_NEEDED = 20;
const REGULAR_FILE_0644 = (0o100644 << 16) >>> 0;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// A ZIP holding the given { name, data } entries in order, each deflated unless storing it is smaller.
export function createZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const [method, body] = deflated.length < data.length ? [8, deflated] : [0, data];
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(VERSION_NEEDED, 4);
    local.writeUInt16LE(UTF8_NAMES, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBytes, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(VERSION_MADE_BY, 4);
    central.writeUInt16LE(VERSION_NEEDED, 6);
    central.writeUInt16LE(UTF8_NAMES, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(REGULAR_FILE_0644, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);

    offset += local.length + nameBytes.length + body.length;
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

// The { name, data } entries of a ZIP, in central-directory order; throws when an entry fails its CRC-32.
export function readZip(zip) {
  const endAt = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endAt === -1) throw new Error('not a ZIP: no end of central directory');
  const count = zip.readUInt16LE(endAt + 10);
  let at = zip.readUInt32LE(endAt + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(at) !== 0x02014b50) throw new Error('invalid central directory');
    const method = zip.readUInt16LE(at + 10);
    const crc = zip.readUInt32LE(at + 16);
    const size = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const extraLength = zip.readUInt16LE(at + 30);
    const commentLength = zip.readUInt16LE(at + 32);
    const localAt = zip.readUInt32LE(at + 42);
    const name = zip.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    const dataAt = localAt + 30 + zip.readUInt16LE(localAt + 26) + zip.readUInt16LE(localAt + 28);
    const body = zip.subarray(dataAt, dataAt + size);
    const data = method === 8 ? zlib.inflateRawSync(body) : Buffer.from(body);
    if (crc32(data) !== crc) throw new Error(`CRC-32 mismatch in ${name}`);
    entries.push({ name, data });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

// The archive entries, read from root: both manifests, every skill under skills/ (sorted), README.md, LICENSE.
export function packageEntries(root) {
  const read = (name) => {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) throw new Error(`${name} is missing from ${root}`);
    return { name, data: fs.readFileSync(file) };
  };
  const skills = buildIndex(path.join(root, 'skills')).files.map(({ path: file, content }) => ({ name: `skills/${file}`, data: content }));
  return [read('.claude-plugin/plugin.json'), read('plugin.json'), ...skills, read('README.md'), read('LICENSE')];
}

// Writes the archive for the plugin at root to outFile and returns the entry names.
export function writePackage(root, outFile) {
  const entries = packageEntries(root);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, createZip(entries));
  return entries.map((e) => e.name);
}

if (isEntryPoint(import.meta.url, process.argv[1])) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const outFile = path.join(root, 'dist', ZIP_NAME);
  const names = writePackage(root, outFile);
  console.log(`Wrote ${path.relative(root, outFile)} with ${names.length} file(s): ${names.join(', ')}`);
}
