> Public snapshot: local machine paths were redacted. Historical records are not acceptance evidence for this public revision.

---
schema: tessera-g0-status/v1
baseline_revision: b9c797d8dcd8ed044bd6a4f5bc479bfe52296810
candidate_source_sha256: 506c05fc1e7c3dddfc62215a5355d4a7fbe128604df9232948963856eb401a54
staging_manifest_sha256: 506c05fc1e7c3dddfc62215a5355d4a7fbe128604df9232948963856eb401a54
decision: HOLD_G0
generated_at: 2026-08-17T04:12:14Z
adjudicator: independent-sol
g1_authorized: false
---
# 阻断项

结论：`G0_BLOCKED`。55 个 gate 中 `SATISFIED=11`、`UNVERIFIED=39`、`NOT_APPLICABLE=5`、`UNSATISFIED=0`；46 个 hard gate 中仅 7 个 `SATISFIED`，39 个仍为 `UNVERIFIED`。任一 active hard gate 未满足即阻断 G0 -> G1，因此 `G1_authorized=false`。

身份边界：front matter 中的 `506c05fc1e7c3dddfc62215a5355d4a7fbe128604df9232948963856eb401a54` 是 historical adjudicator/pre-stage candidate identity；final staging wrapper identity 仅由外层 `integration-manifest-v1.tsv` 与 `machine-summary.json` 绑定。本文不记录集成后 source revision，也不记录包含本文自身的 wrapper 自引用 hash。

- id: `B-G0-EVIDENCE-216-MISSING`
  gate_ids: `G0-SRC-03`, `G0-EVD-01`, `G0-EVD-02`, `G0-EVD-03`, `G0-EVD-04`, `G0-EVD-05`
  conclusion: `BLOCKED / UNVERIFIED`
  evidence: `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/testkit/baseline/ledger-g0.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-product-traceability-verifier/outputs/machine.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-doc-projection-verifier/outputs/machine.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/docs/traceability.md`
  boundary: 216 个 G0 active cells 全部 `missing`；2 个 soak cellset 是 future-only；bounded verifier PASS 不能替代 G0 evidence records。
  minimum_next_evidence: 提交同一 candidate identity 下 schema-valid evidence、原始 artifacts、hash、命令、环境、manual records 和独立复跑日志。

- id: `B-G0-PLATFORM-GUI-AX-IME-DPI`
  gate_ids: `G0-PLAT-01`, `G0-MAC-01`, `G0-WIN-01`, `G0-X11-01`, `G0-REN-01..03/05/06`, `G0-FONT-01..02`, `G0-IME-*`, `G0-DPI-MAC/WIN/X11`, `G0-AX-*`
  conclusion: `BLOCKED / UNVERIFIED`
  evidence: `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/docs/adr/0005-platform-scope.md`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/docs/adr/0009-font-ime-accessibility.md`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/spikes/accessibility/report.md`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/spikes/platform-gui-evidence/report.md`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-product-traceability-verifier/outputs/machine.json`
  boundary: 缺 Windows/Linux 真实 GUI、IME、DPI、renderer/backend、读屏和低配硬件；macOS 也缺 MacBook Air M1 8 GiB、Tab focus 完整闭环和真实 VoiceOver。
  minimum_next_evidence: 在目标硬件补真实 GUI/硬件证据，或正式签署降级并保留原等级失败事实。

- id: `B-G0-LOW-SPEC-PERFORMANCE`
  gate_ids: `G0-PERF-00`, `G0-PERF-MAC-01`, `G0-PERF-WIN-01`, `G0-PERF-PKG-01`, `G0-PERF-IO-01`
  conclusion: `BLOCKED / UNVERIFIED`
  evidence: `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/testkit/baseline/ledger-g0.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/docs/traceability.md`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-technical-verifier/outputs/finding-first.md`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-product-traceability-verifier/outputs/machine.json`
  boundary: M4 Pro/48 GiB 只能作趋势；缺 M1 8 GiB 与 Windows i5-8250U/8 GiB/UHD620 的 release/strip 原始样本、包体、sync I/O trace 和持续 redraw trace。
  minimum_next_evidence: 按 iced-plan 固定环境至少 5 次运行并保留 raw samples/trace/profile；低配较差结果必须满足硬限。

- id: `B-G0-TOOLCHAIN-SUPPLY-EVIDENCE`
  gate_ids: `G0-TOOL-01`, `G0-TOOL-02`, `G0-TOOL-03`, `G0-SUP-01`, `G0-SUP-02`
  conclusion: `BLOCKED / UNVERIFIED`
  evidence: `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/spikes/toolchain/REPORT.md`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-technical-verifier/outputs/machine.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-supplychain-verifier/outputs/machine.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-supplychain-verifier/outputs/finding-first.md`
  boundary: 有界非 GUI Rust 合同可作为机械复跑项；但缺生产 workspace 级 toolchain/lock/cargo deny/audit/license/人工审查的 G0 evidence records。
  minimum_next_evidence: 集成后在 source 中补 root/workspace toolchain、Cargo.lock、locked builds、deny/audit/license/重复依赖审查原始证据。

## 集成后复跑命令清单

这些命令是 source 集成后的复跑合同，不表示本次已经通过 GUI、硬件或产品门禁。

机械验证：

```bash
cd $HOME/Data/User/Project/tessera
git rev-parse HEAD
git status --porcelain=v1 --untracked-files=all
native/scripts/bootstrap-baseline.sh --target $HOME/Data/User/Project/tessera
mkdir -p /private/tmp/tessera-g0-v2-replay/tmp
TESSERA_SOURCE_ROOT=$HOME/Data/User/Project/tessera TESSERA_G0_WORK_ROOT=/private/tmp/tessera-g0-v2-replay TESSERA_TMPDIR=/private/tmp/tessera-g0-v2-replay/tmp native/scripts/verify-baseline-v2.sh --target $HOME/Data/User/Project/tessera
rtk bun run build
rtk bun run scan:deps
rtk bun run acceptance
```

Web acceptance 预期判定：`build` 与 `scan:deps` 必须 exit 0。`acceptance` 若 exit 0 则正常通过；若 exit 1 且输出只匹配技术 verifier 的 `NON_STAGING_BASELINE_FAILURE` 签名，即 unchanged `src/styles.css` performance guards + unchanged `scripts/acceptance.mjs` socket listen，且 changed set 仍仅为 `.gitignore` + `native/**`，集成 owner 记录 `ADJUDICATED_EXCEPTION_NON_STAGING_BASELINE_FAILURE_FOR_OVERLAY_ONLY` 后可继续。任何不同失败、任何 Web 文件变化、或 build/scan 失败均 stop/handback。该例外不得写成产品 PASS。

非 GUI Rust 合同：

```bash
cd $HOME/Data/User/Project/tessera
PYTHONDONTWRITEBYTECODE=1 PYTHONWARNINGS=error::ResourceWarning python3 -B native/testkit/tests/test_contract.py
PYTHONDONTWRITEBYTECODE=1 PYTHONWARNINGS=error::ResourceWarning python3 -B native/spikes/platform-gui-evidence/scripts/test_verify_capture.py
bash native/spikes/toolchain/scripts/run-msrv.sh
bash native/spikes/renderer/scripts/verify.sh
bash native/spikes/fonts/verify-integration.sh
bash native/spikes/accessibility/scripts/test-verify-source-facts.sh
bash native/spikes/accessibility/scripts/verify-source-facts.sh
bash native/spikes/platform/iced-platform-probe/scripts/verify-first-party-invariants.sh
bash native/spikes/platform/iced-platform-probe/scripts/verify-payload-hygiene.sh
```

Handback-7.1 candidate identity is limited to the following unsealed files. It is not a v10 manifest, a self hash, or an integrated source revision.

| 类别 | 路径 | mode | SHA-256 | 测试计数 |
| --- | --- | --- | --- | ---: |
| production | `native/testkit/lib/evidence_contract.py` | `100644` | `76bc9e83ca7dd6b97bb26d1e60bc906ade900f4782b9dcb67ee00310ebe3e9e2` | - |
| production | `native/testkit/lib/run_evidence.py` | `100644` | `66bc9493647bd9bd66fc63c4445d6c01b61b27d2748d425ae1a395f016747911` | - |
| production | `native/spikes/platform-gui-evidence/scripts/verify_capture.py` | `100755` | `90a66cecfb000409b2ef15a2615e22c9b37886506df1b40c084daf09d0d3d689` | - |
| test | `native/testkit/tests/test_contract.py` | `100644` | `05d2baee8320e203e5274a6a39718c802687f3b98372fb17abcb8ca91ec350b4` | 49 |
| test | `native/spikes/platform-gui-evidence/scripts/test_verify_capture.py` | `100644` | `acc8961845fcec6360a2980167315f48d402ff2f9a95bb27eed41c990ac1db11` | 7 |

Current observation used a complete `TemporaryDirectory` overlay made from the sealed-v9 payload plus the five exact files above. With `PYTHONWARNINGS=error::ResourceWarning`, the two Python commands passed `49/49` and `7/7` respectively, both with exit 0. This is an overlay-only bounded contract result, not a final clean integration result and not Windows/Linux runtime, GUI, IME, DPI, AX, performance, 216-cell, soak, supply-chain, or G0 evidence.

The future integration owner must run the same two commands from the final clean integrated source root after the final manifest is mechanically generated. A copied `platform-gui-evidence` subtree, this private candidate directory, or the completed temporary overlay cannot substitute for that integration replay.

GUI/硬件人工门禁：当前无可机械替代命令。必须在 MacBook Air M1 8 GiB、Windows 11 i5-8250U/8 GiB/UHD620、Ubuntu 22.04+ X11 真实环境分别采集 renderer/backend、IME、DPI、键盘焦点、读屏、性能和包体证据；任何本机 M4、源码审查、AccessKit tree dump 或静态合同输出都不得伪造成通过。

# 风险池

- id: `R-WEB-ACCEPTANCE-EXCEPTION`
  gate_ids: `source-integration-web-gates`
  conclusion: `TRANSPARENT_EXCEPTION_FOR_MECHANICAL_OVERLAY_ONLY`
  evidence: `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-technical-verifier/outputs/machine.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-technical-verifier/outputs/replay-summary.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-technical-verifier/outputs/command-ledger.tsv`
  boundary: `bun run acceptance` actual exit 1 是未改 Web baseline + socket 环境 observation，不是 staging defect，也不是产品 PASS。
  owner: integration owner
  stage: source mechanical integration
  recheck: 仅同一 exit/signature 且 overlay changed set 无 Web 文件时继续；否则 stop/handback。

- id: `R-G6-SUPPLY-RELEASE-FUTURE`
  gate_ids: `G0-SUP-03`
  conclusion: `BOUNDARY`
  evidence: `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-supplychain-verifier/outputs/machine.json`
  boundary: G0 未要求最终 SBOM、签名、许可证归档或可重现 release 构建；不得宣称 release-ready。
  owner: release owner
  stage: G5/G6
  recheck: G6 前提交 SBOM、签名、许可证归档、校验和、可重现构建与回滚演练。

- id: `R-SOAK-FUTURE-ONLY`
  gate_ids: `G0-PERF-SOAK-01`
  conclusion: `BOUNDARY`
  evidence: `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-doc-projection-verifier/outputs/machine.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/testkit/baseline/ledger-g0.json`
  boundary: `CELLSET-G0-L4-MAC-SOAK` 与 `CELLSET-G0-L4-WIN-SOAK` 是 future-only，不能计入 G0 active gate。
  owner: performance/test owner
  stage: Nightly/RC G5-G6
  recheck: 后续提交 8h/6h/24h 原始时间序列与增长斜率证据。

# 无发现

- id: `N-STAGING-MECHANICAL-INTEGRITY`
  gate_ids: `G0-SRC-02`, `G0-SRC-04`
  conclusion: `SATISFIED_WITH_BOUNDARY`
  evidence: `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/integration-manifest-v1.tsv`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/integration-manifest-v1.tsv.sha256`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-repro-verifier/outputs/machine.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/machine-summary.json`
  boundary: F=113、G=1、payload=113 files/861956 bytes；manifest `506c05fc1e7c3dddfc62215a5355d4a7fbe128604df9232948963856eb401a54` 与 sidecar file `8d8f1558990443447ec8cddbcb16f3be783d41e2c51672e0190d2221900f9d85` 一致；不等于 G0 PASS。

- id: `N-SOURCE-BASELINE-CLEAN`
  gate_ids: `G0-SRC-01`
  conclusion: `SATISFIED_WITH_BOUNDARY`
  evidence: `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-technical-verifier/outputs/machine.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/docs/baseline-run.md`
  boundary: source baseline revision `b9c797d8dcd8ed044bd6a4f5bc479bfe52296810`、tracked manifest `b4dfd2064e8d30cd24f72f1347ece2ef525c5f0673796035cb4415f1ae866c0a`、487 tracked files clean；native execution evidence 另判。

- id: `N-ADR-AND-SCOPE-DECISIONS`
  gate_ids: `G0-ADR-01`, `G0-ADR-02`, `G0-OOS-01`, `G0-REN-04`, `G0-WAY-01`, `G0-FONT-03`, `G0-DPI-WAY-01`, `G0-PERF-REG-01`
  conclusion: `SATISFIED_OR_NOT_APPLICABLE_WITH_BOUNDARY`
  evidence: `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/docs/adr`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/docs/adr/0004-renderer-artifacts.md`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/docs/adr/0005-platform-scope.md`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/docs/adr/0009-font-ime-accessibility.md`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-pre-adjudication-staging-owner-v8/outputs/g0-pre-adjudication-staging-v8/payload/native/docs/traceability.md`
  boundary: ADR/scope 冻结可接收；双 renderer 单包、Noto 捆绑、Wayland 升级和相对回退 baseline 未启用。

- id: `N-BOUNDED-VERIFIERS-RECEIVED`
  gate_ids: `bounded-verifier-contract`
  conclusion: `ALL_EXPECTED_BOUNDED_PASS_RECEIVED`
  evidence: `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-technical-verifier/outputs/machine.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-supplychain-verifier/outputs/machine.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-repro-verifier/outputs/machine.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-doc-projection-verifier/outputs/machine.json`, `$HOME/Documents/Codex/2026-08-17/tessera-iced-g0-staging-v8-product-traceability-verifier/outputs/machine.json`
  boundary: 五个 bounded PASS 仅关闭 pre-adjudication 机械/投影/追溯检查；不得启动 G1。
