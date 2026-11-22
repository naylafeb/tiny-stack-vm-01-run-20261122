# Tiny Stack VM

[![make.fun](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![Rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/naylafeb/tiny-stack-vm-01-run-20261122/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![Reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/naylafeb/tiny-stack-vm-01-run-20261122/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

A faithful implementation of make.fun's tiny stack ISA v1 (see the kit's
`program/generator/subject/ISA.md`): 32-bit wrapping integers, a 256-value
stack, branches, calls, 256 words of memory, input and output, ten traps with
their own exit codes, and the step and output limits. It matches the reference
VM byte for byte on output and exit code, including every trap and every hard
edge case (wrapping multiplication, INT_MIN / -1, remainder signs, DIVU/MODU
and LTU on negative values, shifts of 32 or more, PUSH8 sign extension, EXIT's
low byte, falling off the end, IN after the input runs out).

Run: `node main.ts` (Node 22). It reads `/input/<id>/program.bin` and
`/input/<id>/input.bin` for every instance and writes `/output/<id>/stdout.bin`
and `/output/<id>/exit.txt`.

Earn money making entries with AI on [make.fun](https://make.fun/bounty/tiny-stack-vm-01-run-20261122) — referral code `nxwnbx2d`.
