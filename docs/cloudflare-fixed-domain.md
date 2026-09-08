# Cloudflare 固定域名（Token 模式）申请与配置教程

> 适用：想让 dsh-bridge 的公网入口**固定不变**（如 `dsh.yourdomain.com`），而不是每次开启都换新的
> `trycloudflare.com` 随机地址。全程免费（Cloudflare 免费套餐即可），无需公网 IP、无需备案（境外流量）。

- 预计耗时：20–40 分钟（含域名生效等待）
- 费用：Cloudflare 免费套餐 $0；域名需自购（约 ¥30–80/年，.com/.net/.xyz 等均可）

---

## 原理一句话

你在 Cloudflare 建一条 **Named Tunnel（固定隧道）**，把 `dsh.yourdomain.com` 这个子域名的流量经 Cloudflare 边缘转发到
你电脑上 dsh-bridge 的本地端口（默认 `3082`）。dsh-bridge 只需要拿到这条隧道的 **Token** 就能替你后台运行
`cloudflared tunnel run --token <TOKEN>`，隧道进程由 dsh-bridge 托管（崩溃自动重启、随 DSH 启动自愈），域名永不改变。

```
手机/浏览器 → https://dsh.yourdomain.com → Cloudflare 边缘 → 加密隧道 → 你的电脑:3082 → DSH
```

---

## 第 1 步：注册 Cloudflare 账号

1. 打开 <https://dash.cloudflare.com/sign-up>，用邮箱注册（或 Google 账号登录）。
2. 登录后进入 Dashboard。

## 第 2 步：准备一个域名

两种方式任选：

- **已有域名**：确保域名的 DNS 托管在 Cloudflare（见第 3 步）。
- **没有域名**：
  1. 在任意注册商购买一个（.com / .net / .xyz / .top 均可，便宜的先练手也行）；
  2. 拿到域名的 **NS 记录**（或注册商 API 权限），准备迁到 Cloudflare。

## 第 3 步：把域名接入 Cloudflare（DNS 托管）

> 固定域名隧道要求域名由 Cloudflare 托管（DNS 生效才能签发证书、路由流量）。若域名已在 Cloudflare 可跳过本步。

1. Cloudflare Dashboard → 「**Add a site**」→ 输入你的域名 → 选 **Free** 套餐 → Continue。
2. Cloudflare 会扫描现有 DNS 记录并导入（自动保留）。
3. 按提示到**域名注册商**处，把域名的 NS（Name Server）改成 Cloudflare 给的两条（形如 `xxx.ns.cloudflare.com`）。
4. 回 Cloudflare 点「Check nameservers」，等待生效（通常几分钟到 24 小时，多数 1 小时内）。
5. 状态变 **Active** 即托管完成。

## 第 4 步：进入 Zero Trust 创建固定隧道

1. 打开 Zero Trust 控制台：<https://one.dash.cloudflare.com/>
   （或 Dashboard 左侧菜单 → **Zero Trust**）。
2. 首次使用会让你选团队名、套餐——选 **Free** 计划即可。
3. 左侧菜单：**Networks → Tunnels**。
4. 点 **Create a tunnel**：
   - 选择连接器类型：**Cloudflared**；
   - Tunnel name：起个名，如 `dsh-home`；
   - 点 **Save tunnel**。
5. 下一步会给安装命令，其中包含 `cloudflared tunnel run --token <一串很长的 Token>` ——**先别关页面**，继续第 5 步；Token 后面也能在隧道详情里复制。

> 💡 **Token 位置**（以后要取）：Tunnels 列表 → 点该隧道 → 右上 **⋯ / Configure** → 页面里有 token 或「Install and run a connector」命令可复制。

## 第 5 步：给隧道绑定你的固定子域名（Public Hostname）

> ⚠️ **关键**：隧道本身不含"域名→本地端口"的路由规则，必须在这里配。而且这个子域名要和你之后在
> dsh-bridge 面板里填的「自定义固定域名」**完全一致**。

1. 隧道创建后进入隧道详情页 → 标签 **Public Hostname** → **Add a public hostname**。
2. 填写：
   - **Subdomain**：如 `dsh`
   - **Domain**：下拉选你的域名（如 `yourdomain.com`）
   - 即最终 = `dsh.yourdomain.com`
   - **Service**（类型）：`HTTP`
   - **URL**：`localhost:3082`（dsh-bridge 代理端口；如果你改过 dsh-bridge 端口则填对应端口）
3. 保存。Cloudflare 会自动为你签发该域名的免费 TLS 证书并创建 DNS 记录（Tunnel 类型，CNAME 指向 `*.cfargotunnel.com`），无需手动配 DNS。
4. 状态稍后变为 **Healthy**（见隧道详情 Connectors 与 Public Hostname 状态）。

> 端口说明：dsh-bridge 默认把面板代理在 `3082`（`proxyPort`），DSH 原生在 `3080`。**必须指向 3082**（走 dsh-bridge 的
> 认证/会话/二维码/隧道控制逻辑），不要直接指 3080。

## 第 6 步：把 Token 和域名填回 dsh-bridge

1. 打开 dsh-bridge 面板 → **公网隧道** tab。
2. 展开底部「**⚙️ 隧道配置**」→「**Cloudflare 隧道**」卡 → 展开「**高级配置：固定域名 (Cloudflare Token)**」。
3. 填写两项并「保存固定域名配置」：
   - **自定义固定域名**：`dsh.yourdomain.com`（与第 5 步 Public Hostname **完全一致**，不要带 `https://`）
   - **Tunnel Token**：第 4/5 步复制的 `cloudflared tunnel run --token` 后的那一长串
4. 回到顶部「**公网访问入口**」卡 → 点「**开启**」（token 模式下该卡显示固定域名模式）。
5. 几秒后状态变 **固定隧道已建立 (https://dsh.yourdomain.com)**。

## 第 7 步：验证

1. 浏览器打开 `https://dsh.yourdomain.com` → 应出现 DSH 登录页/面板（取决于你的访问认证设置）。
2. Cloudflare Zero Trust → Networks → Tunnels → 该隧道 → **Healthy**，Connectors 有连接。
3. 重启 DSH 服务或重启电脑，勾选「随 DSH 启动自动开启」后域名保持不变、自动恢复。

---

## 常见问题

### Q1：面板显示"已建立"但浏览器打不开？
几乎都是 **Public Hostname 与面板填的域名不一致**，或 Service URL 端口写错（应为 `localhost:3082` 而非 3080）。
逐项核对第 5、6 步。

### Q2：提示"cloudflared 启动失败: Incorrect Usage / flag provided but not defined"？
请确认 dsh-bridge ≥ **v2.10.7**（v2.10.6 曾因 `--no-autoupdate` 参数位置导致固定域名隧道秒退，已修复）。

### Q3：隧道一直"自动重连中"然后 error？
先看面板 error 文案：
- 含 **Incorrect Usage / 配置错误** → Token 复制不完整或参数问题，重新复制整串 Token；
- 含 **退出 code≠0 / 连接失败** → 多为网络到 Cloudflare 边缘不通或 Token 无效，检查网络后点「开启」重试（自愈已内置退避重试）。

### Q4：需要买最贵的套餐吗？
不用。Cloudflare **Free** 套餐即可创建固定隧道、绑定子域名、免费 TLS。仅当你想在同一域名下加很多复杂规则或团队审计时才需付费。

### Q5：域名必须在 Cloudflare 托管吗？
**固定域名隧道是的**（要在 Cloudflare DNS 建 `CNAME → *.cfargotunnel.com` 的记录）。不想迁移主域名的话，
可以买一个便宜小域名专门做隧道入口，把主域名留在原注册商。

### Q6：为什么面板里"复制 Token"和 Cloudflare 命令里看到的不一样长？
Token 就是 `cloudflared tunnel run --token` 后面那一长串（不含引号、不含 `--token` 字样本身）。
若你在别处看到的 token 是用于 `cloudflared tunnel login` 的，那是不同的东西——固定域名模式要的是 **run --token** 那个。

---

## 相关链接

- [Cloudflare Zero Trust 控制台](https://one.dash.cloudflare.com/)
- [Cloudflare 官方：Create a tunnel (dashboard)](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/)
- [Cloudflare 官方：Tunnel run 参数（--token / --no-autoupdate）](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/)
