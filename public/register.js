// 檢查是否已登入
function checkLoggedIn() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
        window.location.href = 'index.html';
    }
}

// 顯示提示訊息
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

// 驗證表單
function validateForm(username, password, confirmPassword) {
    if (username.length < 3 || username.length > 20) {
        showAlert('用戶名長度需在 3-20 個字符之間', 'warning');
        return false;
    }

    if (password.length < 6) {
        showAlert('密碼長度需至少 6 個字符', 'warning');
        return false;
    }

    if (password !== confirmPassword) {
        showAlert('兩次輸入的密碼不一致', 'warning');
        return false;
    }

    return true;
}

// 處理註冊
async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!validateForm(username, password, confirmPassword)) {
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        showAlert('註冊成功，即將跳轉到登入頁面');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

// 初始化
checkLoggedIn();
document.getElementById('registerForm').addEventListener('submit', handleRegister); 