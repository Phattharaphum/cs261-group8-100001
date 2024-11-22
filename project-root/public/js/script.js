document.addEventListener("DOMContentLoaded", function () {
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

        // ตรวจสอบว่า username และ password ตรงตามเงื่อนไข
        if (!/^\d{4,}$/.test(username)) {
            showModal(`
                <p class="login-failed"><span class="spatata">Error!</span></p>
                <p class="login-failed-message">Username must be at least 4 digits.</p>
            `);
            return;
        }

        if (password.length <= 3) {
            showModal(`
                <p class="login-failed"><span class="spatata">Error!</span></p>
                <p class="login-failed-message">Password must be more than 4 characters.</p>
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
                showModal(`
                    <p class="login-failed">Login Failed!</p>
                    <p class="login-failed-message">${data.message}</p>
                `);
            }
        } catch (error) {
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

    closeModalButton.addEventListener('click', () => {
        modal.style.display = 'none';
        document.getElementById('modalBackdrop').style.display = 'none';
    });

    window.submitLogin = submitLogin;
});
