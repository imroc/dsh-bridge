#!/usr/bin/env node
// 假 cloudflared：行为由 FAKE_CF_MODE 环境变量驱动，供 CloudflaredManager 自愈测试使用。
// 不接触网络、不下载真实二进制；通过打印/退出码模拟 cloudflared 的握手与崩溃行为。
const mode = process.env.FAKE_CF_MODE || 'version';

function write(s) { process.stderr.write(s + '\n'); }

if (mode === 'version') {
  // 供 _checkManagedBinaryVersion / --version 校验用；钉死版本测试通过 binaryVersion 注入期望值
  process.stdout.write(`${process.env.FAKE_CF_VERSION || 'cloudflared version 2024.10.0 (built 2024-10-01)'}\n`);
  process.exit(0);
}

if (mode === 'crash-after-ready') {
  // 模拟：tunnel run 打出手握就绪文本 → 保持运行 → 一段时间后崩溃退出
  write('Registered tunnel connection');
  const delay = Number(process.env.FAKE_CF_READY_MS || 300);
  const crashIn = Number(process.env.FAKE_CF_CRASH_MS || 1500);
  setTimeout(() => {
    write('Registered tunnel connection'); // 确保 tryResolve 已触发
    setTimeout(() => process.exit(1), crashIn);
  }, delay);
  // 保持进程存活直到 exit
  setInterval(() => {}, 1000);
} else if (mode === 'exit-fast') {
  // 模拟：立即退出且无就绪文本（启动失败，如 token 错误）
  write('ERR failed to connect');
  setTimeout(() => process.exit(1), Number(process.env.FAKE_CF_EXIT_MS || 50));
} else if (mode === 'hang') {
  // 模拟：启动后不打印就绪、一直挂着（握手超时场景）
  write('Connecting...');
  setInterval(() => {}, 1000);
} else if (mode === 'ready-then-hold') {
  write('Registered tunnel connection');
  setInterval(() => {}, 1000);
}
