อย่าลืมสร้างโฟลเดอร์ชื่อ attachments หรือมันอาจจะสร้างให้เอง

วิธีการติดตั้งและรัน
---

### สิ่งที่ต้องเตรียมก่อน

- ติดตั้ง Docker, SSMS
- ติดตั้ง Node.js (หากต้องการรัน Node นอก Docker)

---

### ขั้นตอนที่ 1: Clone Repository

ถ้ายังไม่ได้ clone โปรเจกต์นี้ลงเครื่อง ให้ทำการ clone และเข้าไปในโฟลเดอร์ของโปรเจกต์

```bash
git clone <repository-url>
cd <project-folder>
```

แทนที่ `<repository-url>` ด้วย URL ของ Repository และ `<project-folder>` ด้วยชื่อโฟลเดอร์ที่ clone ลงมา
โดย path ไปยัง dir หลักคือ CS261_Group8_TermProject01/project-root

---

### ขั้นตอนที่ 2: ตั้งค่า Environment Variables

1. สร้างไฟล์ `.env` ในโฟลเดอร์หลักของโปรเจกต์
2. เพิ่ม Environment Variables ที่จำเป็น โดยตัวอย่างอาจเป็นแบบนี้ ( DB_ ไม่จำเป็นเพราะยังไม่ได้ย้าย - การตั้งค่าอยู่ที่ config/db.config.js):

   ```plaintext
   PORT=3000 
   API_KEY=your_api_key_here
   
   DB_HOST=*-*
   DB_USER=*-*
   DB_PASSWORD=*-*
   DB_NAME=*-*
   DB_PORT=*-*
   ```
   
---

### ขั้นตอนที่ 3: การตั้งค่า Docker

1. **Docker Compose**: 
2. เปิดไฟล์ `docker-compose.yml` และตั้งค่าที่จำเป็น (เช่น ฐานข้อมูล)(กรณี run node นอก docker ใช้ตามนี้ได้เลย)

ตัวอย่าง `docker-compose.yml` สำหรับแอป Node.js กับ SQL Server (กรณี run node บน docker):

   ```yaml
   version: '3.8'

   services:
     db:
       image: mcr.microsoft.com/mssql/server:latest
       environment:
         - ACCEPT_EULA=Y
         - SA_PASSWORD=YourStrongPassword
       ports:
         - "1433:1433"
       networks:
         - app-network

     app:
       build:
         context: .
       ports:
         - "3000:3000"
       environment:
         - API_KEY=${API_KEY}
       depends_on:
         - db
       networks:
         - app-network

   networks:
     app-network:
       driver: bridge
   ```

3. **สร้างและรัน Docker Containers**

   ใช้คำสั่งต่อไปนี้เพื่อสร้างและเริ่มบริการที่กำหนดใน `docker-compose.yml`:

   ```bash
   docker-compose up -d
   ```

   - ตัวเลือก `-d` ทำให้ Containers รันในโหมด Background
   - คำสั่งนี้จะเริ่มต้นฐานข้อมูลและเซิร์ฟเวอร์ Node.js ภายใน Docker

4. **ตรวจสอบ Containers ที่กำลังรัน**

   หลังจากรันคำสั่ง `docker-compose up` คุณสามารถตรวจสอบได้ว่าทุกอย่างทำงานได้ดีหรือไม่โดยใช้คำสั่ง:

   ```bash
   docker-compose ps
   ```

---

### ขั้นตอนที่ 4: การรัน Node.js บนเครื่อง (โดยไม่ใช้ Docker)

หากคุณต้องการรันแอป Node.js บนเครื่องโดยตรง (โดยไม่ใช้ Docker):

1. **ติดตั้ง Dependencies**

   รันคำสั่งต่อไปนี้ในโฟลเดอร์โปรเจกต์:

   ```bash
   npm install
   ```

2. **เริ่มต้นแอปพลิเคชัน**

   หลังจากตั้งค่าไฟล์ `.env` ด้วยการตั้งค่าฐานข้อมูลที่เชื่อมต่อกับเครื่องของคุณ รันแอปพลิเคชันโดยใช้:

   ```bash
   node server.js
   ```

   หรือถ้ามีการติดตั้ง `nodemon`:

   ```bash
   npx nodemon server.js
   ```

3. **เข้าถึงแอปพลิเคชัน**

   เปิดเบราว์เซอร์และไปที่ [http://localhost:3000](http://localhost:3000) เพื่อดูแอปพลิเคชัน

---

### ขั้นตอนที่ 5: การหยุด Containers ของ Docker

เมื่อคุณต้องการหยุด Containers ของ Docker ให้ใช้คำสั่ง:

```bash
docker-compose down
```

คำสั่งนี้จะหยุดและลบ Containers แต่จะเก็บ Images และ Volumes ไว้

---

### หมายเหตุเพิ่มเติม

- **การเริ่มต้นฐานข้อมูล**: การเริ่มต้นฐานข้อมูลหรือสร้างตารางครั้งแรกในฐานข้อมูล 
- 1. สร้าง Database ชื่อ db01 บน SQL Server โดยคลิกขวาที่เมนู Databases ใน SSMS แล้วเลือก Create Database ตั้งชื่อ db01
- 2. สร้างตารางฐานข้อมูลหลักโดยสามารถเข้าไปใน Container ที่กำลังรันแล้วรันสคริปต์ Node.js เพื่อเริ่มต้นฐานข้อมูลโดยใช้คำสั่ง "node initialize.js" หรือทำบน terminal

---
