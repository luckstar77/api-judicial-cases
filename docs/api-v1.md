# 租屋通 API v1 合約

Base URL：`https://api.rental.imallenlai.com/v1`（本機：`http://localhost:3010/v1`）
Swagger UI：`/apidocs`

> 舊版未加版號的路徑（`/case`、`/cases`、`/name`、`/user`、`/likes`、`/comment`）仍保留給舊前端，
> 回傳格式維持原樣，標記為 deprecated，新前端一律使用 `/v1`。

## 共通規則

### 回應格式

成功：

```json
{ "status": "ok", "code": 20000, "data": { } }
```

失敗：

```json
{ "status": "error", "code": 40000, "error": { "message": "title should not be empty" } }
```

| code  | HTTP | 意義 |
|-------|------|------|
| 20000 | 200 / 201 | 成功 |
| 20400 | 200 | 查無資料（例如 detail 找不到 id） |
| 40000 | 200 | 參數驗證失敗 |
| 40100 | 401 | 未登入或 token 無效 / 過期 |
| 40101 | 200 | 手機或密碼錯誤（含改密碼時目前密碼錯誤） |
| 40102 | 200 | Firebase 簡訊驗證 token 無效 |
| 40900 | 200 | 資料衝突（例如手機已註冊） |
| 42900 | 429 | 請求過於頻繁 |
| 50000 | 500 | 伺服器錯誤 |

前端判斷：`code === 20000` 才是成功；HTTP 401 時清除登入狀態。

### 驗證

`Authorization: Bearer <accessToken>`。標示「登入」的 API 必須帶；標示「選擇性」的 API 帶了會多回傳個人狀態（例如 `liked`）。

- token 只含 `uid` 與 token 版本，不含任何個資。
- 改密碼後，之前簽發的 token 全部失效（HTTP 401），請改用 `PATCH /v1/users/me` 回傳的新 token。
- 限流：每 IP 每分鐘 300 次；登入、註冊、簡訊驗證每 IP 每分鐘 10 次。

### 分頁

Query：`page`（從 1 開始，預設 1）、`limit`（預設 10，最大 50）。

```json
{
  "list": [],
  "meta": { "take": 10, "page": 1, "pageCount": 5, "itemCount": 10, "totalCount": 48, "hasPreviousPage": false, "hasNextPage": true }
}
```

### 個資遮罩

- `defendantName` / `defendantPhone` / `defendantIdNo`：中間一半以 `*` 遮罩（例：`王*明`、`09*****678`）。
- `ipMasked`：IPv4 只留前兩段（`35.78.*.*`），IPv6 只留前兩組（`2001:db8:*`）。
- 公開 API 不回傳任何使用者 email、完整 IP、uid。

---

## Auth / Users

### `POST /v1/auth/verify` — 手機簡訊驗證登入（Firebase）

Body：`{ "firebaseToken": string }`
Data：`AuthResult`

### `POST /v1/auth/register` — 註冊（簡訊驗證後設定密碼）

Body：`{ "firebaseToken": string, "password": string(8-64), "name": string(1-32), "displayName": string(1-30), "email": string(email) }`
Data：`AuthResult`；手機已有密碼 → `40900`

### `POST /v1/auth/login` — 手機 + 密碼登入

Body：`{ "phone": string, "password": string }`，`phone` 接受 `0912345678` 或 `+886912345678`
Data：`AuthResult`；錯誤 → `40101`
限流：每 IP 每分鐘 10 次

### `GET /v1/users/me`（登入）

Data：`UserProfile`

### `PATCH /v1/users/me`（登入）

Body：`{ "displayName"?: string(1-30), "email"?: string(email), "password"?: string(8-64), "currentPassword"?: string }`
Data：`AuthResult`（會換發 token）

- 帶 `password` 時，若帳號已設定密碼（`hasPassword: true`）必須帶正確的 `currentPassword`，否則 `40101`。
- 只用簡訊登入、尚未設定密碼的帳號（`hasPassword: false`）可以直接設定第一組密碼。
- 改密碼成功後舊 token 全部失效。

```ts
interface UserProfile { uid: string; phone: string; name?: string; displayName?: string; email?: string; hasPassword: boolean }
interface AuthResult { user: UserProfile; accessToken: string }
```

---

## 法院判決（judicialFileset）

### `GET /v1/judgments` — 依姓名搜尋判決

Query：`keyword`（必填，原告或被告姓名完全相符，不分大小寫）、`page`、`limit`
Data：`Paginated<JudgmentListItem>`，依 `jdate` 新到舊

### `GET /v1/judgments/detail?id=`

Data：`JudgmentDetail`；找不到 → `20400`

### `GET /v1/judgments/warning_names` — 高風險名單

Query：`city`（必填；`台北市`、`臺北市`、`臺北` 皆可，後端會正規化成判決資料格式 `臺北`）、`rentMin`（預設 0）、`rentMax`（預設 1000000）、`minCount`（預設 2，最小 1）
Data：`{ list: { name: string; judgmentCount: number }[] }`，依次數多到少，最多 100 筆
規則：取敗訴方姓名，排除含「○」的匿名姓名與長度 > 12 的名稱

### `GET /v1/judgments/city_stats` — 各縣市判決數（地圖用）

Data：`{ list: { city: string; judgmentCount: number }[] }`，`city` 為判決資料格式（`臺北`、`新北`、`臺中`…，臺字、無「市/縣」），已排除空值。
前端對應地圖縣市名稱時：`臺北` ↔ `臺北市`/`台北市`；`新竹`、`嘉義` 同時對應市與縣。

> 資料格式差異：判決的 `city` 是 `臺北`；網友回報 `cases.location` 是 `台北市`（台字、含市/縣），沿用 `src/utils/taiwanDistricts.ts` 的清單。

```ts
interface JudgmentListItem {
  id: string;            // 例："CCEV,100,潮簡,260,20110811,1"
  jyear?: string; jcase?: string; jno?: string;
  jdate: string;         // YYYY-MM-DD
  jtitle?: string;
  plaintiff?: string; defendant?: string;
  rent?: number; city?: string; district?: string;
  win?: 'plaintiff' | 'defendant';
  likeCount: number; commentCount: number;
}
interface JudgmentDetail extends JudgmentListItem { jfull: string; jpdf?: string }
```

### `GET /v1/judgment_comments?filesetId=`

Data：`{ list: Comment[] }`，舊到新

### `POST /v1/judgment_comments`（登入）

Body：`{ "filesetId": string, "content": string(1-1000) }`
Data：`Comment`（HTTP 201）

### `GET /v1/judgment_likes?filesetId=`（選擇性登入）

Data：`LikeState`

### `POST /v1/judgment_likes/toggle`（登入）

Body：`{ "filesetId": string }`
Data：`LikeState`

---

## 網友回報案例（cases）

### `GET /v1/cases` — 列表

Query：`page`、`limit`、`city`（選填，例：`台北市`；`臺` 也可以）、`district`（選填）
Data：`Paginated<CaseListItem>`，依建立時間新到舊（id 為次排序）

### `GET /v1/cases/search` — 依對象搜尋（登入）

Query：`keyword`（必填，被告姓名 / 電話 / 身分證完全相符）、`page`、`limit`
Data：`Paginated<CaseListItem>`

### `GET /v1/cases/detail?id=`

Data：`CaseDetail`；找不到 → `20400`

### `POST /v1/cases`（登入，`multipart/form-data`）

欄位：`title`(1-100)、`content`(1-5000)、`location`(縣市，必須是台灣縣市清單中的值)、`district`(必須屬於該縣市)、`rent`(整數 0-1000000)、`defendantName`(1-32)、`defendantPhone`(選填，≤16)、`defendantIdNo`(選填，≤16)、`images`(選填，最多 10 張，每張 ≤ 5MB，jpeg/png/webp/gif)

- `location` / `district` 的「台」「臺」兩種寫法都接受，存成清單中的寫法（例：`臺北市` → `台北市`、`臺西鄉` → `台西鄉`）。
- 圖片以檔案內容判斷格式，內容與宣告的 Content-Type 不符 → `40000`。
Data：`{ id: number }`（HTTP 201）

### `GET /v1/case_comments?caseId=`

Data：`{ list: Comment[] }`，舊到新

### `POST /v1/case_comments`（登入）

Body：`{ "caseId": number, "content": string(1-1000) }`
Data：`Comment`（HTTP 201）

### `GET /v1/case_likes?caseId=`（選擇性登入）

Data：`LikeState`

### `POST /v1/case_likes/toggle`（登入）

Body：`{ "caseId": number }`
Data：`LikeState`

```ts
interface CaseListItem {
  id: number;
  title: string;
  content: string;
  location?: string; district?: string;
  rent: number;
  defendantName: string; defendantPhone: string; defendantIdNo: string;   // 已遮罩
  imageUrls: string[];
  authorDisplayName?: string;
  likeCount: number; commentCount: number;
  createdAt: string; updatedAt: string;   // ISO 8601
}
type CaseDetail = CaseListItem;
interface Comment { id: number; content: string; authorDisplayName?: string; ipMasked?: string; createdAt: string }
interface LikeState { likeCount: number; liked: boolean }   // 未登入時 liked = false
```

---

## 其他

### `GET /v1/stats` — 首頁統計

Data：`{ judgmentCount: number; caseCount: number; userCount: number }`

### `GET /v1/health`、`GET /health`

Data：`{ db: 'up' }`；`/health` 維持舊格式 `{ "status": "OK" }`
