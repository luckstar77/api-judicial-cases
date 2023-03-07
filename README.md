## 流程
- 連接 mysql
- 建立 express 連線
- 建立API查詢姓名取得資訊
  - 判斷是否有原告或被告姓名
  - 若有回傳資訊，沒有回傳404
    - 原告姓名
    - 被告姓名
    - 租金
    - 地區
    - 勝訴方
    - 案件 ID

## 資料庫
- mysql
  - rental
    - judicialFileset
      - id `string`
      - plaintiff `string`
      - defendant `string`
      - city `string`
      - win `enum`
        - plaintiff
        - defendant
      - rent `int`

## 開發流程
- sudo service mysql start
- npm i -g pm2 typescript
- tsc
- pm2 start build/index.js

---

## 查詢項目
- 查詢姓名是否有在預警名單

## nginx 設定
sudo vim /etc/nginx/sites-enabled/api.rental.imallenlai.com
```
server {
        listen       80;
        server_name  api.rental.imallenlai.com;
        
      
        location / {
            proxy_pass http://127.0.0.1:3100;
        }
    }
```

## 技術文章參考
- [certbot](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-20-04)
- [nginx](https://andy6804tw.github.io/2022/02/27/nginx-tutorial/)

## EC2 主機重啟後初始指令
```
sudo systemctl start redis-server
sudo systemctl start mongod
cd stock-dividend-yield/api-stock-dividend-yield
pm2 start build/index.js
```