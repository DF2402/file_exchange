async function loadDashboardStats() {
    try {
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('獲取統計數據失敗');
        }
        
        const stats = await response.json();
        updateDashboardStats(stats);
    } catch (error) {
        console.error('加載統計數據錯誤:', error);
        alert('加載統計數據失敗');
    }
}

async function loadUserList() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('獲取用戶列表失敗');
        }
        
        const users = await response.json();
        displayUserList(users);
    } catch (error) {
        console.error('加載用戶列表錯誤:', error);
        alert('加載用戶列表失敗');
    }
} 