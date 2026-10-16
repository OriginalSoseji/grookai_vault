# Ruflo Codex Integration — October 15, 2026

## Status

The repository-scoped Ruflo integration merged through PR #690 as main commit
`e5a51be3812da752715b6366db1ba006abae837d` on October 16, 2026. Post-merge
readback confirmed the exact Codex registration and a live stdio MCP handshake
with 46 advertised tools and zero forbidden tool prefixes. The integration does
not change production, GitHub settings, or user-level Codex configuration.

## Boundary

- Ruflo is pinned to `3.56.9`; do not replace the pin with `latest`.
- Codex loads the project configuration from `.codex/config.toml` only after
  the repository is trusted.
- The MCP transport is child-process stdio only. HTTP, WebSocket, Docker,
  daemon, browser, GitHub, terminal, federation, and managed-agent surfaces are
  not enabled.
- The advertised tool set is limited to local agent/swarm coordination, tasks,
  selected memory operations, progress, guidance, coordination, and read-only
  workflow inspection/validation.
- No Ruflo initializer was run in this repository. In particular, do not run
  `ruflo init`, `ruflo init --codex`, or `ruflo doctor --fix` without first
  reviewing their complete proposed filesystem and user-scope changes.
- Existing `AGENTS.md`, `.codex/`, Git hooks, package manifests, and Grookai
  authority boundaries remain canonical.

## Why initialization is manual

The upstream Codex initializer can create or replace `AGENTS.md`, generate
`.agents/` and `.codex/` files, install a user-scoped Codex marketplace/plugin,
and write an MCP command that follows `ruflo@latest`. Those actions are broader
than this repository needs and would conflict with existing Grookai operating
instructions. The checked-in configuration therefore registers only the exact,
reviewed stdio command.

## Verified package evidence

The package metadata and tarballs were read from the npm registry over verified
TLS before runtime testing.

| Package | Version | Registry SHA-1 | Local tarball SHA-256 |
|---|---:|---|---|
| `ruflo` | `3.56.9` | `3c2a42718b55d4d6a15dc9c70e57f61886aec77b` | `73546f13d21df38432e7771437737e6696432fc06ade8ddc315f7de6047bf4dc` |
| `@claude-flow/cli` | `3.56.9` | `9732c0ba684d49d6737ff9841b997388f6e4eea3` | `33eb956c698ed668824acf52ab302f45210eb0bad284426e13486853c32a3436` |

The retained inspection artifacts are outside Git at
`C:/grookai_vault_operator_artifacts/ruflo_integration_20261015/`.

## Verification and operation

Prerequisites are Node 20 or newer, npm 9 or newer, and a trusted checkout.
From the repository root:

```powershell
node --version
npm.cmd --version
codex mcp get ruflo --json
codex mcp list
```

Start a new Codex session after checking out a commit containing this
configuration so the project configuration is loaded. Ruflo is started by Codex
on demand; do not start a background service. The first start may populate the
normal user npm cache with the exact pinned package.

Expected direct readback:

- server name `ruflo`;
- command `cmd.exe` and exact argument `ruflo@3.56.9`;
- stdio transport;
- 120-second startup/tool timeouts;
- 46 advertised tools in the current allowlist;
- zero `terminal_*`, `github_*`, `browser_*`, `federation_*`, or
  `managed_agent_*` tools.

`NODE_USE_SYSTEM_CA=1` enables the Windows system CA store on Node 22.19 and
newer. Node 20 ignores this environment variable and starts normally. If npm
still reports `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, configure the workstation's
npm/Node certificate trust explicitly; never disable TLS verification.

## Change procedure

For any Ruflo version or tool-surface change:

1. Review the official release/security notes and exact npm metadata.
2. Download and hash the `ruflo` and exact CLI tarballs without running the
   initializer.
3. Inspect install scripts, Codex initializer behavior, and MCP transport code.
4. Test the exact stdio initialize and `tools/list` exchange in an isolated npm
   cache.
5. Confirm the forbidden tool prefixes remain absent.
6. Update this document, `.codex/config.toml`, and the operator playbook in the
   same change.

Do not interpret a successful MCP handshake as permission for production,
database, deployment, GitHub, or other external mutations. Grookai contracts
and explicit authorization continue to govern every such action.
