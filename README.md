## 流程

-   連接 mysql
-   建立 express 連線
-   建立 API 查詢姓名取得資訊
    -   判斷是否有原告或被告姓名
    -   若有回傳資訊，沒有回傳 404
        -   原告姓名
        -   被告姓名
        -   租金
        -   地區
        -   勝訴方
        -   案件 ID
        -   年份

## 安裝 Mysql

-   安裝指令

```
https://dev.mysql.com/get/mysql-apt-config_0.8.22-1_all.deb
sudo dpkg -i mysql-apt-config_0.8.22-1_all.deb
sudo apt update
sudo apt-cache policy mysql-server
sudo apt install mysql-client mysql-server
```

-   設定密碼

## 資料庫

-   mysql
    -   rental
        -   judicialFileset
            -   id `string`
            -   plaintiff `string`
            -   defendant `string`
            -   city `string`
            -   win `enum`
                -   plaintiff
                -   defendant
            -   rent `int`
            -   jyear `string`
        -   cases
            -   id `auto`
            -   plaintiffId `string`
            -   title `string`
            -   content `text`
            -   location `string` (縣市)
            -   district `string` (鄉鎮市區)
            -   defendantName `string`
            -   defendantPhone `string`
            -   defendantIdNo `string`
            -   imageUrls `text`
            -   createdAt `timestamp`
            -   updatedAt `timestamp`

### 台灣縣市列表

所有縣市及其鄉鎮市區請參考 `src/utils/taiwanDistricts.ts`

```
台北市
新北市
桃園市
台中市
台南市
高雄市
基隆市
新竹市
新竹縣
苗栗縣
彰化縣
南投縣
雲林縣
嘉義市
嘉義縣
屏東縣
宜蘭縣
花蓮縣
台東縣
金門縣
澎湖縣
連江縣
```

### 新增欄位

若 `cases` 表尚無 `title` 與 `content` 欄位，可執行下列 SQL 新增：

```sql
ALTER TABLE cases
    ADD COLUMN title VARCHAR(255) NOT NULL AFTER plaintiffId,
    ADD COLUMN content TEXT AFTER title,
    ADD COLUMN location VARCHAR(20) NOT NULL AFTER content,
    ADD COLUMN district VARCHAR(20) NOT NULL AFTER location;
```

## 開發流程

-   sudo service mysql start
-   npm i -g pm2 typescript
-   cd rental-housing/api-judicial-cases
-   tsc
-   pm2 start rental-housing/api-judicial-cases/ecosystem.config.js

---

## 查詢項目

-   查詢姓名是否有在預警名單

## nginx 設定

sudo vim /etc/nginx/sites-enabled/api.rental.imallenlai.com

```
server {
        listen       80;
        server_name  api.rental.imallenlai.com;


        location / {
            proxy_pass http://127.0.0.1:3010;
        }
    }
```

## 技術文章參考

-   [certbot](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-20-04)
-   [nginx](https://andy6804tw.github.io/2022/02/27/nginx-tutorial/)

## 主機環境架設

-   在 AWS Route 53 新增 A 紀錄指到主機 IP
-   在 nginx 的設定檔新增 domain 的 nginx 設定檔

`/etc/nginx/sites-enabled/api.rental.imallenlai.com`

```
server {
        server_name  api.rental.imallenlai.com;


        location / {
            proxy_pass http://127.0.0.1:3010;
        }

}
```

-   利用 certbot 建立 SSL 憑證，並且選擇 http 自動轉址

```
sudo certbot --nginx -d example.com
```

-   確認 nginx 設定檔是否正確

```
sudo nginx -t
```

-   確認 nginx 設定檔是否正確

```
sudo nginx -s reload
```

## 部署

-   本地上傳到遠端

```
scp -i ./pem -r build/* ec2@remote:/build
```

## 建立.env.local

FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
MEASUREMENT_ID=
SESSION_SECRET=

## 本地開發流程
- 建立 mysql
- 建立資料表