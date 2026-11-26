# 租屋通 API（api-judicial-cases）

租屋通後端：查詢法院租賃判決、高風險名單、網友回報的惡房客／惡房東案例、留言與按讚、手機簡訊登入。

- 正式環境：`https://api.rental.imallenlai.com`
- API 文件：[`docs/api-v1.md`](docs/api-v1.md)；Swagger UI：`/apidocs`
- 前端：[web-judicial-cases](https://github.com/luckstar77/web-judicial-cases)

## 技術

| 項目 | 版本 / 套件 |
|------|-------------|
| Runtime | Node.js 22 LTS（`.nvmrc`） |
| 框架 | NestJS 11（Express） |
| 資料庫 | MySQL 8.0 + TypeORM 0.3（migration 管理 schema，`synchronize: false`） |
| 驗證 | Firebase 手機簡訊 ID token → 自簽 JWT（30 天） |
| 檔案 | AWS S3（案例證據照片） |
| 測試 | Jest + Supertest（E2E 連真實 MySQL） |

## 架構

```
Controller ──► Service ──► DatabaseService ──► Repository ──► Entity (TypeORM)
    │             └──► FirebaseService / StorageService / TokenService
    └── Guard（JwtAuthGuard / OptionalJwtAuthGuard）、ValidationPipe、AllExceptionsFilter、ThrottlerGuard
```

```
src/
├── auth/            手機簡訊驗證、註冊、密碼登入（/v1/auth/*）
├── user/            個人資料（/v1/users/me）
├── judgment/        判決搜尋、詳情、高風險名單、縣市統計、判決留言 / 按讚
├── cases/           網友回報案例、圖片上傳、案例留言 / 按讚
├── stats/           首頁統計
├── health/          /v1/health、/health
├── legacy/          舊前端使用的未加版號路徑（deprecated，回應格式維持原樣）
├── common/          回應格式、錯誤碼、例外 filter、guard、decorator、工具函式
├── config/          環境變數驗證（啟動時缺少必要設定會直接失敗）
├── database/        entities、repositories、migrations、DatabaseService、測試 factory
├── firebase/ storage/ token/   外部服務包裝
├── app.module.ts / app.setup.ts / main.ts
```

### 回應格式

`/v1/*` 一律回傳 `{ status, code, data }`；錯誤為 `{ status: 'error', code, error: { message } }`。
業務錯誤（查無資料、驗證失敗、帳密錯誤…）HTTP 200，未登入 401、限流 429、伺服器錯誤 500。完整代碼見 `docs/api-v1.md`。

### 安全性

- 密碼使用 scrypt（含 salt）；舊版 SHA-256 密碼在登入成功時自動升級。
- 搜尋一律完全比對（不再使用 `LIKE`，`%` 不會被當成萬用字元）。
- 公開 API 不回傳 email、完整 IP、uid；對象姓名 / 電話 / 身分證中間遮罩，留言 IP 只顯示前兩段。
- 只信任 loopback（nginx）帶來的 `X-Forwarded-For`；只監聽 `127.0.0.1`。
- helmet、CORS 白名單、全域限流 120 次/分鐘、登入相關 10 次/分鐘。
- 上傳最多 10 張、每張 5MB、限 jpeg/png/webp/gif，通過驗證後才上傳 S3。

### 資料庫

沿用既有正式資料表（`users`、`cases`、`caseComments`、`caseLikes`、`judicialFileset`、`comments`、`likes`），
欄位命名維持 camelCase、`users` 以 Firebase uid 為主鍵，與 Cedars 新表規範（snake_case、UUID、`is_deleted`）不同，
是為了不搬動正式資料；新表請依規範建立。

| Migration | 內容 |
|-----------|------|
| `1764100000000-baseline-schema` | 以正式機 DDL 建表（`IF NOT EXISTS`，正式機不會變動） |
| `1764100000001-fix-case-engagement-keys` | `caseComments` / `caseLikes` 補上 AUTO_INCREMENT 主鍵（原本在 STRICT 模式下無法新增）、同一人重複按讚的唯一索引 |
| `1764100000002-add-search-indexes` | 判決原告 / 被告 / 縣市租金 / 日期、案例對象欄位、手機索引 |
| `1764100000003-widen-user-ip` | `users.ip` 加寬到 45 字元（IPv6） |

## 本機開發

```bash
nvm use                 # Node.js 22
npm ci
cp .env.example .env    # 填入 JWT_SECRET、FIREBASE_PROJECT_ID、S3_BUCKET_NAME 等
npm run migration:run   # 需先 npm run build
npm run start:dev       # http://localhost:3010，Swagger：/apidocs
```

## 測試

```bash
npm run db:test:up      # 啟動 E2E 用 MySQL 8.0（docker，port 3307，資料在 tmpfs）
npm test                # unit tests（全部 mock，不連資料庫）
npm run test:e2e        # E2E（真實 MySQL，每個測試前清空）
npm run test:cov        # unit + E2E 合併覆蓋率
npm run lint && npm run typecheck
```

E2E 測試會先跑全部 migration，Firebase 與 S3 以 mock 取代（token 格式 `valid:<uid>:<phone>`）。

## CI / CD（GitHub Actions：`.github/workflows/ci.yml`）

- **每個 push / PR**：lint → typecheck → unit + E2E（MySQL 8.0 service）→ build。
- **push 到 `main`**：測試通過後打包 `dist`，以 `production` environment 的部署金鑰 SSH 到 EC2，執行 `deploy/remote-deploy.sh`：
  1. 解壓到 `~/rental-housing/api/releases/<sha>`，連結 `shared/.env`，`npm ci --omit=dev`
  2. 有待執行的 migration 時先 `mysqldump` 備份到 `~/rental-housing/api/backups/`（保留 5 份）再 migrate
  3. 切換 `~/rental-housing/api/current` → 新版本，重啟 pm2 `rental`
  4. 30 秒內 `/v1/health` 必須回 `db: up`，否則自動切回上一版
  5. 保留最近 5 個 release
- 部署金鑰在主機上以 forced command（`deploy/ssh-gate.sh`）限制，只能執行 `deploy-api <sha>`，無法取得 shell 或轉發 port。

GitHub `production` environment secrets：`EC2_HOST`、`EC2_USER`、`EC2_SSH_KEY`、`EC2_KNOWN_HOSTS`。

### 主機配置（EC2 Ubuntu 20.04）

| 項目 | 位置 |
|------|------|
| 正式設定 | `~/rental-housing/api/shared/.env`（權限 600，不進版控） |
| 目前版本 | `~/rental-housing/api/current` → `releases/<sha>` |
| pm2 | `~/ecosystem.config.js` 的 `rental`（Node 22，與 `stock` 各自固定 Node 版本） |
| nginx | `/etc/nginx/sites-enabled/api.rental.imallenlai.com`（參考 `deploy/nginx/`） |
| 舊版（Express） | `~/rental-housing/api-judicial-cases`（保留以備緊急回退） |

### 手動回滾

```bash
cd ~/rental-housing/api
ls -1dt releases/*/                         # 找到要回去的版本
ln -sfn ~/rental-housing/api/releases/<sha> current.next && mv -Tf current.next current
pm2 restart rental && curl -s http://127.0.0.1:3010/v1/health
```

資料庫還原：`gunzip -c backups/<file>.sql.gz | mysql -uroot rental`（migration 皆為加欄位 / 加索引，舊版程式可直接在新 schema 上執行）。
