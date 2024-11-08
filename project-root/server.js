const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config(); // โหลด environment variables จาก .env

app.use(express.json()); // รองรับการรับข้อมูล JSON
app.use(express.static('public')); // ให้บริการไฟล์ static จากโฟลเดอร์ public

// กำหนดเส้นทางสำหรับ API Key
app.get('/api/get-api-key', (req, res) => {
    // ส่งค่า API Key กลับไปที่ frontend
    res.json({ apiKey: process.env.API_KEY });
});

// โหลดไฟล์ HTML สำหรับหน้า Home
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// กำหนดเส้นทางสำหรับ user routes
app.use('/api', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
