# Project: askinglucidly — Dependency Vulnerability Remediation

## Architecture
- Single package repository with Next.js App Router (`output: "export"`).
- Dual lockfiles: `package-lock.json` (npm v7+ lockfileVersion 3) and `pnpm-lock.yaml` (pnpm 8 lockfileVersion 6.0).
- Toolchain: Node v24.15.0, npm v12.0.1, corepack pnpm@8.15.9.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1.1 Next.js Critical RCE & Auth Remediation | Upgrade `next` to `15.5.25` and `@next/env` to `15.5.25` (maintains React 18 compatibility) | M1 | Survey |
| 2 | R1.2 PostCSS High Vulnerability Remediation | Upgrade/override `postcss` to `^8.5.26` in dependencies and overrides | M1 | Survey |
| 3 | R1.3 Node-Tar Critical DoS & Symlink Remediation | Upgrade `@hey-api/openapi-ts` to `^0.99.0` and override `tar` to `^7.5.22` | M1 | Survey |
| 4 | R1.4 Handlebars Critical AST Injection Remediation | Upgrade `openapi-typescript-codegen` to `^0.31.0` and override `handlebars` to `^4.7.9` | M1 | Survey |
| 5 | R1.5 Glob & Minimatch High Vulnerabilities Remediation | Upgrade `eslint-config-next` to `15.5.25` and override `glob` to `^10.5.0`, `minimatch` to `^9.0.7` | M1 | Survey |
| 6 | R1.6 Brace-Expansion High Vulnerabilities Remediation | Override `brace-expansion` to `^2.1.4` in npm and pnpm overrides | M1 | Survey |
| 7 | R1.7 JS-YAML High CPU DoS Remediation | Override `js-yaml` to `^4.3.2` in npm and pnpm overrides | M1 | Survey |
| 8 | R1.8 PNPM Lockfile Transitive Sync | Override/update `pnpm-lock.yaml` for `braces`, `cross-spawn`, `nanoid`, `flatted`, `picomatch`, `defu` | M1 | Survey |
| 9 | R2.1 Test Suite Definition & Stability Verification | Add `"test": "next lint && next build"` in `package.json` scripts and ensure test pass | M1 | Survey |
| 10 | R2.2 Lockfile Synchronization & Audit Verification | Ensure `npm audit` and `pnpm audit` report 0 critical and 0 high vulnerabilities | M1 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Dependency Remediation & Verification | Update package.json manifests and overrides, regenerate package-lock.json and pnpm-lock.yaml, verify 0 critical/high audit and passing tests | none | DONE |

## Code Layout
- `package.json`: Project manifest, scripts, dependencies, overrides, and pnpm.overrides
- `package-lock.json`: npm lockfile
- `pnpm-lock.yaml`: pnpm lockfile
