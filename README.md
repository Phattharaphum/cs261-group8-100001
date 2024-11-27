## วิธีการติดตั้งและรัน

### สิ่งที่ต้องเตรียมก่อน

- ติดตั้ง Docker, SSMS
- ติดตั้ง Node.js (หากต้องการรัน Node นอก Docker) แนะนำเป็น version 22

---

### ขั้นตอนที่ 1: Clone Repository

ถ้ายังไม่ได้ clone โปรเจกต์นี้ลงเครื่อง ให้ทำการ clone และเข้าไปในโฟลเดอร์ของโปรเจกต์

```bash
git clone <repository-url> develop หรือ branch ล่าสุด
cd <project-folder>
```

แทนที่ `<repository-url>` ด้วย URL ของ Repository และ `<project-folder>` ด้วยชื่อโฟลเดอร์ที่ clone ลงมา
โดย path ไปยัง dir หลักคือ CS261_Group8_TermProject01/project-root

---

### ขั้นตอนที่ 2: ตั้งค่า Environment Variables

1. สร้างไฟล์ `.env` ในโฟลเดอร์หลักของโปรเจกต์
2. เพิ่ม Environment Variables ที่จำเป็น โดยตัวอย่างอาจเป็นแบบนี้ :

   ```plaintext
   #db config
   DB_HOST=sqlserver_container #ใช้เป็น container name แทน ip ปกติ
   DB_PORT=1433
   DB_USER=sa
   DB_PASSWORD="YourStrong!Passw0rd"
   DB_NAME=master #ใช้dbนี้เพื่อให้ง่ายแก่การ start project

   API_KEY=key สำหรับ auth จาก tu api
   ```

   หมายเหตุ รหัสผ่าน DB_PASSWORD ควรเปลี่ยนที่ docker-compose.yml และ .env เมื่อขึ้น production

---

### ขั้นตอนที่ 3: การตั้งค่า Docker

เมื่อเตรียม .env file เสร็จแล้วสามารถ เริ่ม project ด้วย docker ได้เลย ด้วยคำสั่ง

```bash
docker compose up --build
#หรือ ขึ้นอยู่กับ version ของ docker compose
docker-compose up --build
```

---

## วิธีการทดสอบระบบใน Sprint 2

### ขั้นตอนที่ 1: ตั้งค่าไฟล์ Environment

1. สร้างไฟล์ `.env` ในโฟลเดอร์หลักของโปรเจกต์
2. เพิ่ม Environment Variables ที่จำเป็น โดยตัวอย่างอาจเป็นแบบนี้:

   ```plaintext
   #db config
   DB_HOST="sqlserver" #ใช้เป็น container name แทน ip ปกติ
   DB_PORT=1433
   DB_USER=sa
   DB_PASSWORD="YourStrong!Passw0rd"
   DB_NAME=master #ใช้ db นี้เพื่อให้ง่ายแก่การเริ่มโปรเจกต์

   API_KEY=key สำหรับ auth จาก tu api
   ```

   หมายเหตุ: รหัสผ่าน DB_PASSWORD ควรเปลี่ยนใน docker-compose.yml และ .env เมื่อขึ้น production

---

### ขั้นตอนที่ 2: ตั้งค่า Docker

เมื่อเตรียมไฟล์ .env เสร็จแล้ว สามารถเริ่มโปรเจกต์ด้วย Docker ได้เลย ด้วยคำสั่ง

```bash
docker compose up --build
#หรือ ขึ้นอยู่กับ version ของ docker compose
docker-compose up --build
```

---

### หมายเหตุเพิ่มเติม

#### ปัญหาที่อาจเจอ

1. หากสั่ง `docker compose` ไม่ได้ แนะนำให้ติดตั้ง Docker เวอร์ชันล่าสุด แล้วลองอีกครั้ง
2. หาก backend ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ แนะนำให้ตรวจสอบว่ามีการสร้างไฟล์ `.env` แล้วหรือไม่ ควรสร้างไฟล์ `.env` ตามตัวอย่างที่ให้ไว้ และตรวจสอบให้แน่ใจว่ารหัสผ่านฐานข้อมูลในไฟล์ `.env` ตรงกับที่กำหนดใน `docker-compose.yml`

---
