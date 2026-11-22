// Tiny stack VM, make.fun ISA v1 (kit program/generator/subject/ISA.md).
// Faithful port of the reference VM (generator/subject/vm.mjs): same step order,
// same trap codes, same wrapping 32-bit arithmetic. Node 22, stdlib only.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_STEPS = 1000000;

// [opcode, immediate bytes, pops, pushes] for every valid opcode.
const OPS = [
  [0,0,0,0],[1,1,0,1],[2,4,0,1],[3,0,1,0],[4,0,1,2],
  [5,0,2,2],[6,0,2,3],[7,0,3,3],[16,0,2,1],[17,0,2,1],
  [18,0,2,1],[19,0,2,1],[20,0,2,1],[21,0,2,1],[22,0,2,1],
  [23,0,1,1],[24,0,2,1],[25,0,2,1],[26,0,2,1],[27,0,1,1],
  [28,0,2,1],[29,0,2,1],[30,0,2,1],[32,0,2,1],[33,0,2,1],
  [34,0,2,1],[48,2,0,0],[49,2,1,0],[50,2,1,0],[51,2,0,0],
  [52,0,0,0],[64,0,1,1],[65,0,2,0],[80,0,1,0],[81,0,1,0],
  [82,0,0,1],[83,0,1,0],
];
const IMM = new Uint8Array(256);
const POPS = new Uint8Array(256);
const PUSHES = new Uint8Array(256);
const VALID = new Uint8Array(256);
for (const [o, i, p, q] of OPS) { IMM[o] = i; POPS[o] = p; PUSHES[o] = q; VALID[o] = 1; }

// Runs one program on its input. Returns [stdout bytes, exit code].
function run(P, inp) {
  const n = P.length;
  const D = new Int32Array(256);
  const C = new Int32Array(64);
  const M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let sp = 0, csp = 0, olen = 0, inPos = 0, pc = 0, steps = 0;
  const done = (exit) => [out.subarray(0, olen), exit];
  for (;;) {
    if (steps === MAX_STEPS) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const op = P[pc];
    if (!VALID[op]) return done(5);
    const imm = IMM[op], pops = POPS[op], pushes = PUSHES[op];
    if (pc + imm >= n) return done(9);
    steps++;
    const next = pc + 1 + imm;
    if (sp < pops) return done(2);
    if (sp - pops + pushes > 256) return done(3);
    pc = next;
    switch (op) {
      case 0: return done(0);
      case 1: D[sp++] = (P[next - 1] << 24) >> 24; break;
      case 2: D[sp++] = P[next - 4] | (P[next - 3] << 8) | (P[next - 2] << 16) | (P[next - 1] << 24); break;
      case 3: sp--; break;
      case 4: D[sp] = D[sp - 1]; sp++; break;
      case 5: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 6: D[sp] = D[sp - 2]; sp++; break;
      case 7: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
      case 23: D[sp - 1] = -D[sp - 1] | 0; break;
      case 27: D[sp - 1] = ~D[sp - 1]; break;
      case 16: case 17: case 18: case 19: case 20: case 21: case 22:
      case 24: case 25: case 26: case 28: case 29: case 30:
      case 32: case 33: case 34: {
        const b = D[sp - 1], a = D[sp - 2];
        let r;
        switch (op) {
          case 16: r = (a + b) | 0; break;
          case 17: r = (a - b) | 0; break;
          case 18: r = Math.imul(a, b); break;
          case 19: if (b === 0) return done(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; break;
          case 20: if (b === 0) return done(4); r = b === -1 ? 0 : (a % b) | 0; break;
          case 21: if (b === 0) return done(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; break;
          case 22: if (b === 0) return done(4); r = (a >>> 0) % (b >>> 0) | 0; break;
          case 24: r = a & b; break;
          case 25: r = a | b; break;
          case 26: r = a ^ b; break;
          case 28: r = a << (b & 31); break;
          case 29: r = a >> (b & 31); break;
          case 30: r = (a >>> (b & 31)) | 0; break;
          case 32: r = a === b ? 1 : 0; break;
          case 33: r = a < b ? 1 : 0; break;
          default: r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        }
        sp -= 2; D[sp++] = r; break;
      }
      case 48: case 49: case 50: {
        const rel = ((P[next - 2] | (P[next - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 48) { const v = D[--sp]; take = op === 49 ? v === 0 : v !== 0; }
        if (take) pc = next + rel;
        break;
      }
      case 51:
        if (csp === 64) return done(7);
        C[csp++] = next; pc = P[next - 2] | (P[next - 1] << 8); break;
      case 52:
        if (csp === 0) return done(8);
        pc = C[--csp]; break;
      case 64: {
        const addr = D[sp - 1];
        if (addr < 0 || addr >= 256) return done(6);
        D[sp - 1] = M[addr]; break;
      }
      case 65: {
        const addr = D[sp - 1], v = D[sp - 2];
        if (addr < 0 || addr >= 256) return done(6);
        sp -= 2; M[addr] = v; break;
      }
      case 80: {
        const s = String(D[sp - 1]);
        if (olen + s.length > 65536) return done(11);
        sp--;
        for (let i = 0; i < s.length; i++) out[olen++] = s.charCodeAt(i);
        break;
      }
      case 81:
        if (olen + 1 > 65536) return done(11);
        out[olen++] = D[--sp] & 255; break;
      case 82: D[sp++] = inPos < inp.length ? inp[inPos++] : -1; break;
      default: return done(D[--sp] & 255);
    }
  }
}

for (const id of readdirSync(I).sort()) {
  const [stdout, exit] = run(
    readFileSync(join(I, id, 'program.bin')),
    readFileSync(join(I, id, 'input.bin')),
  );
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), stdout);
  writeFileSync(join(O, id, 'exit.txt'), exit + '\n');
}
