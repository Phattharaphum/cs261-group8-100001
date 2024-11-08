---

### สิ่งที่ต้องเตรียมก่อน

- ติดตั้ง Docker บนเครื่องของคุณ
- ติดตั้ง Node.js (หากต้องการรัน Node นอก Docker)
- ความเข้าใจพื้นฐานเกี่ยวกับ Docker และ Node.js

---

### ขั้นตอนที่ 1: Clone Repository

ถ้ายังไม่ได้ clone โปรเจกต์นี้ลงเครื่อง ให้ทำการ clone และเข้าไปในโฟลเดอร์ของโปรเจกต์

```bash
git clone <repository-url>
cd <project-folder>
```

แทนที่ `<repository-url>` ด้วย URL ของ Repository และ `<project-folder>` ด้วยชื่อโฟลเดอร์ที่ clone ลงมา

---

### ขั้นตอนที่ 2: ตั้งค่า Environment Variables

1. สร้างไฟล์ `.env` ในโฟลเดอร์หลักของโปรเจกต์
2. เพิ่ม Environment Variables ที่จำเป็น โดยตัวอย่างอาจเป็นแบบนี้:

   ```plaintext
   API_KEY=your_api_key_here
   DB_HOST=db
   DB_USER=sa
   DB_PASSWORD=YourStrongPassword
   DB_NAME=your_database_name
   ```

แทนที่ `your_api_key_here`, `your_database_name`, และ `YourStrongPassword` ด้วยค่าจริงที่คุณมี

---

### ขั้นตอนที่ 3: การตั้งค่า Docker

1. **Docker Compose**: ตรวจสอบให้แน่ใจว่าคุณมีไฟล์ `docker-compose.yml` (ดูเหมือนโปรเจกต์นี้จะมีอยู่แล้ว)
2. เปิดไฟล์ `docker-compose.yml` และตั้งค่าบริการที่จำเป็น (เช่น บริการฐานข้อมูล)

ตัวอย่าง `docker-compose.yml` สำหรับแอป Node.js กับ SQL Server อาจมีลักษณะดังนี้:

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

- **การเริ่มต้นฐานข้อมูล**: หากคุณต้องการเริ่มต้นฐานข้อมูลหรือสร้างตาราง ตรวจสอบให้แน่ใจว่าได้ตั้งค่าให้สคริปต์ `initialize.js` รันอัตโนมัติในตอนเริ่มต้น หรือสามารถเข้าไปใน Container ที่กำลังรันแล้วรันสคริปต์ Node.js เพื่อเริ่มต้นฐานข้อมูล
- **การจัดการ Session**: ตั้งค่า Session Configuration ใน `server.js` ให้เหมาะสม เพื่อให้ Session คงอยู่จนกว่าผู้ใช้จะปิดเบราว์เซอร์

---
