document.addEventListener("DOMContentLoaded", function () {

    // กำหนดตัวแปรที่เชื่อมต่อกับ element ต่างๆ ใน HTML
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const modal = document.getElementById('loginModal');
    const modalContent = document.getElementById('modal-content');
    const closeModalButton = document.getElementById('closeModal');

    // ฟังก์ชันจัดการการล็อกอินเมื่อผู้ใช้ส่งฟอร์ม
    async function submitLogin(event) {
        event.preventDefault(); // ป้องกันการส่งฟอร์มตามปกติ

        const username = usernameInput.value;
        const password = passwordInput.value;

        // ตรวจสอบว่า username และ password ไม่เป็นค่าว่าง
        if (!username || !password) {
            showModal(`
                <p class="login-failed"><span class="spatata">Alert !</span></p>
                <p class="login-failed-message">Username and Password Fields Must Be Filled.</p>
            `);
            return; 
        }

        try {
            // ส่งคำขอล็อกอินไปที่ API
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                window.location.href = data.redirectUrl; // เปลี่ยนเส้นทางไปยังหน้าที่กำหนด
            } else {
                // ถ้าล็อกอินล้มเหลวแสดงข้อความผิดพลาด
                showModal(`
                    <p class="login-failed">Login Failed!</p>
                    <p class="login-failed-message">${data.message}</p>
                `);
            }
        } catch (error) {
            // จัดการกรณีมีข้อผิดพลาดในการเชื่อมต่อ
            showModal(`
                <p class="login-failed">Error!</p>
                <p class="login-failed-message">Error: ${error.message}</p>
            `);
        }
    }

    // ฟังก์ชันแสดง modal
    function showModal(content) {
        modalContent.innerHTML = content;
        modal.style.display = 'block';
        document.getElementById('modalBackdrop').style.display = 'block';
    }

    // ฟังก์ชันปิด modal เมื่อคลิกปุ่มปิด
    closeModalButton.addEventListener('click', () => {
        modal.style.display = 'none';
        document.getElementById('modalBackdrop').style.display = 'none';
    });

    // ผูกฟังก์ชัน submitLogin กับ window เพื่อให้สามารถเรียกจาก onsubmit ใน HTML ได้
    window.submitLogin = submitLogin;
});
