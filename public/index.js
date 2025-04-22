// 全局變量
let currentFolder = null;
let isAdmin = false;
let currentUser = null;

// 頁面加載時初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 檢查登入狀態
        const token = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');
        
        if (!token || !userJson) {
            window.location.href = '/login.html';
            return;
        }

        // 解析用戶信息
        currentUser = JSON.parse(userJson);
        isAdmin = currentUser.role === 'admin';

        // 更新界面
        updateUI(currentUser);

        // 綁定上傳表單事件
        bindUploadForm();

        // 更新用戶界面
        await updateUserInterface();
    } catch (error) {
        console.error('初始化錯誤:', error);
        alert('初始化失敗: ' + error.message);
    }
});

// 更新界面
function updateUI(currentUser) {
    const userSection = document.getElementById('userSection');
    const fileSection = document.getElementById('fileSection');
    const adminSection = document.getElementById('adminSection');
    const usernameSpan = document.getElementById('username');
    
    if (userSection) userSection.style.display = 'block';
    if (fileSection) fileSection.style.display = 'block';
    if (usernameSpan) usernameSpan.textContent = currentUser.username;
    
    if (isAdmin && adminSection) {
        adminSection.style.display = 'block';
    }
}

// 綁定上傳表單事件
function bindUploadForm() {
    const uploadForm = document.getElementById('uploadForm');
    const fileType = document.getElementById('fileType');
    const folderType = document.getElementById('folderType');
    const fileInput = document.getElementById('fileInput');
    const folderInput = document.getElementById('folderInput');

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const uploadType = document.querySelector('input[name="uploadType"]:checked').value;
            
            if (uploadType === 'file') {
                await uploadFile();
            } else {
                await uploadFolder();
            }
        });
    }

    if (fileType && folderType) {
        fileType.addEventListener('change', () => {
            fileInput.style.display = 'block';
            folderInput.style.display = 'none';
        });

        folderType.addEventListener('change', () => {
            fileInput.style.display = 'none';
            folderInput.style.display = 'block';
        });
    }
}

// 檢查登入狀態
async function checkLoginStatus() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('檢查登入狀態錯誤:', error);
        return false;
    }
}

// 更新用戶界面
async function updateUserInterface() {
    try {
        const isLoggedIn = await checkLoginStatus();
        if (!isLoggedIn) return;

        // 如果是管理員，顯示管理員界面
        if (isAdmin) {
            const adminSection = document.getElementById('adminSection');
            if (adminSection) {
                adminSection.style.display = 'block';
                await loadAdminDashboard();
                await loadUsers();
            }
        }

        // 加載文件列表
        await displayFiles();
    } catch (error) {
        console.error('更新界面錯誤:', error);
        alert('更新界面失敗: ' + error.message);
    }
}

// 顯示文件列表
async function displayFiles() {
    try {
        console.log('開始獲取文件列表');
        
        // 獲取文件夾列表
        const foldersResponse = await fetch('/api/folders/list', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!foldersResponse.ok) {
            const errorData = await foldersResponse.json();
            throw new Error(errorData.message || `獲取文件夾列表失敗: ${foldersResponse.status}`);
        }

        const folders = await foldersResponse.json();
        console.log('獲取到的文件夾列表:', folders);

        // 獲取文件列表
        const filesResponse = await fetch('/api/files/list', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!filesResponse.ok) {
            const errorData = await filesResponse.json();
            throw new Error(errorData.message || `獲取文件列表失敗: ${filesResponse.status}`);
        }

        const files = await filesResponse.json();
        console.log('獲取到的文件列表:', files);

        const fileList = document.getElementById('fileList');
        if (!fileList) {
            console.error('找不到 fileList 元素');
            return;
        }

        fileList.innerHTML = '';

        // 顯示文件夾
        if (folders.length > 0) {
            const folderSection = document.createElement('div');
            folderSection.className = 'folder-section mb-3';
            folderSection.innerHTML = '<h6 class="text-muted mb-2">文件夾</h6>';
            
            folders.forEach(folder => {
                const folderElement = createFolderElement(folder);
                folderSection.appendChild(folderElement);
            });
            
            fileList.appendChild(folderSection);
        }

        // 顯示文件
        if (files.length > 0) {
            const fileSection = document.createElement('div');
            fileSection.className = 'file-section';
            fileSection.innerHTML = '<h6 class="text-muted mb-2">文件</h6>';
            
            files.forEach(file => {
                const fileElement = createFileElement(file);
                fileSection.appendChild(fileElement);
            });
            
            fileList.appendChild(fileSection);
        }

        // 如果沒有文件和文件夾
        if (folders.length === 0 && files.length === 0) {
            fileList.innerHTML = '<div class="text-center text-muted py-4">沒有文件或文件夾</div>';
        }
    } catch (error) {
        console.error('顯示文件列表錯誤:', error);
        alert('顯示文件列表失敗: ' + error.message);
    }
}

// 創建文件夾元素
function createFolderElement(folder) {
    const div = document.createElement('div');
    div.className = 'list-group-item';
    div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
                <i class="bi bi-folder-fill text-warning me-2"></i>
                <span class="folder-name">${folder.name || folder.originalName || '未命名文件夾'}</span>
            </div>
            <div class="btn-group">
                <button class="btn btn-sm btn-outline-primary" onclick="toggleFolder('${folder._id}')">
                    <i class="bi bi-chevron-down"></i> 展開
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteFolder('${folder._id}')">
                    <i class="bi bi-trash"></i> 刪除
                </button>
            </div>
        </div>
        <div id="folder-content-${folder._id}" class="folder-content mt-2" style="display: none;">
            <div class="folder-files"></div>
            <div class="folder-subfolders"></div>
        </div>
    `;
    return div;
}

// 創建文件元素
function createFileElement(file) {
    const div = document.createElement('div');
    div.className = 'list-group-item d-flex justify-content-between align-items-center';
    div.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi bi-file-earmark-text text-primary me-2"></i>
            <span class="file-name">${file.originalname || file.filename || '未命名文件'}</span>
        </div>
        <div class="btn-group">
            <a href="/file.html?id=${file._id}" class="btn btn-sm btn-outline-info">
                <i class="bi bi-info-circle"></i> 詳情
            </a>
            <button class="btn btn-sm btn-outline-success" onclick="downloadFile('${file._id}')">
                <i class="bi bi-download"></i> 下載
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteFile('${file._id}')">
                <i class="bi bi-trash"></i> 刪除
            </button>
        </div>
    `;
    return div;
}

// 顯示文件詳情
async function showFileDetails(fileId) {
    try {
        const response = await fetch(`/api/files/${fileId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('獲取文件詳情失敗');
        }

        const file = await response.json();
        
        // 格式化文件大小
        const formatSize = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        // 格式化時間
        const formatDate = (date) => {
            return new Date(date).toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        };

        // 創建模態框
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'fileDetailsModal';
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">文件詳情</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">文件名稱</label>
                            <p class="form-control-static">${file.originalname || file.filename}</p>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">文件類型</label>
                            <p class="form-control-static">${file.mimetype || '未知'}</p>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">文件大小</label>
                            <p class="form-control-static">${formatSize(file.size)}</p>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">上傳時間</label>
                            <p class="form-control-static">${formatDate(file.createdAt)}</p>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">最後修改</label>
                            <p class="form-control-static">${formatDate(file.updatedAt)}</p>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">共享狀態</label>
                            <p class="form-control-static">
                                <span class="badge ${file.isPublic ? 'bg-success' : 'bg-secondary'}">
                                    ${file.isPublic ? '公開' : '私有'}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">關閉</button>
                        <button type="button" class="btn btn-primary" onclick="downloadFile('${file._id}')">
                            <i class="bi bi-download"></i> 下載
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 添加到頁面並顯示
        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();

        // 監聽模態框關閉事件
        modal.addEventListener('hidden.bs.modal', function () {
            document.body.removeChild(modal);
        });
    } catch (error) {
        console.error('顯示文件詳情錯誤:', error);
        alert('顯示文件詳情失敗: ' + error.message);
    }
}

// 打開文件夾
async function openFolder(folderId) {
    try {
        // 更新當前文件夾
        currentFolder = folderId;
        
        // 更新麵包屑
        await updateBreadcrumb(folderId);
        
        // 重新加載文件列表
        await displayFiles();
    } catch (error) {
        console.error('打開文件夾錯誤:', error);
        alert('打開文件夾失敗: ' + error.message);
    }
}

// 更新麵包屑
async function updateBreadcrumb(folderId) {
    try {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;

        const response = await fetch(`/api/folders/${folderId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '獲取文件夾信息失敗');
        }

        const folder = await response.json();
        console.log('獲取到的文件夾信息:', folder);
        
        // 構建麵包屑
        let breadcrumbHtml = `
            <nav aria-label="breadcrumb">
                <ol class="breadcrumb">
                    <li class="breadcrumb-item">
                        <a href="#" onclick="openRootFolder()">
                            <i class="bi bi-house-door"></i> 根目錄
                        </a>
                    </li>
        `;

        // 如果有父文件夾，遞歸獲取路徑
        if (folder.parentFolder) {
            try {
                const path = await getFolderPath(folder.parentFolder);
                breadcrumbHtml += path;
            } catch (error) {
                console.error('獲取父文件夾路徑錯誤:', error);
                // 繼續執行，不中斷流程
            }
        }

        breadcrumbHtml += `
                    <li class="breadcrumb-item active" aria-current="page">
                        ${folder.name || folder.originalName || '未命名文件夾'}
                    </li>
                </ol>
            </nav>
        `;

        breadcrumb.innerHTML = breadcrumbHtml;

        // 更新當前文件夾的文件列表
        await displayFiles();
    } catch (error) {
        console.error('更新麵包屑錯誤:', error);
        // 顯示錯誤提示，但不中斷流程
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            breadcrumb.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i> 無法獲取文件夾路徑
                </div>
            `;
        }
    }
}

// 獲取文件夾路徑
async function getFolderPath(folderId) {
    try {
        const response = await fetch(`/api/folders/${folderId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '獲取文件夾信息失敗');
        }

        const folder = await response.json();
        console.log('獲取到的父文件夾信息:', folder);
        let path = '';

        if (folder.parentFolder) {
            try {
                path = await getFolderPath(folder.parentFolder);
            } catch (error) {
                console.error('遞歸獲取父文件夾路徑錯誤:', error);
                // 繼續執行，不中斷流程
            }
        }

        path += `
            <li class="breadcrumb-item">
                <a href="#" onclick="openFolder('${folder._id}')">${folder.name || folder.originalName || '未命名文件夾'}</a>
            </li>
        `;

        return path;
    } catch (error) {
        console.error('獲取文件夾路徑錯誤:', error);
        return '';
    }
}

// 打開根目錄
function openRootFolder() {
    currentFolder = null;
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = `
            <nav aria-label="breadcrumb">
                <ol class="breadcrumb">
                    <li class="breadcrumb-item active" aria-current="page">
                        <i class="bi bi-house-door"></i> 根目錄
                    </li>
                </ol>
            </nav>
        `;
    }
    displayFiles();
}

// 下載文件
async function downloadFile(fileId) {
    try {
        const response = await fetch(`/api/files/${fileId}/download`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition').split('filename=')[1].replace(/"/g, '');
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        console.error('下載文件錯誤:', error);
        alert('下載文件失敗: ' + error.message);
    }
}

// 刪除文件
async function deleteFile(fileId) {
    try {
        if (!confirm('確定要刪除此文件嗎？')) {
            return;
        }

        const response = await fetch(`/api/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        alert('文件已刪除');
        await displayFiles();
        
    } catch (error) {
        console.error('刪除文件錯誤:', error);
        alert('刪除文件失敗: ' + error.message);
    }
}

// 刪除文件夾
async function deleteFolder(folderId) {
    try {
        if (!confirm('確定要刪除此文件夾嗎？這將同時刪除文件夾中的所有內容。')) {
            return;
        }

        const response = await fetch(`/api/folders/${folderId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        alert('文件夾已刪除');
        await displayFiles();
    } catch (error) {
        console.error('刪除文件夾錯誤:', error);
        alert('刪除文件夾失敗: ' + error.message);
    }
}

// 上傳文件
async function uploadFile() {
    try {
        const fileInput = document.getElementById('file');
        const files = fileInput.files;
        if (files.length === 0) {
            alert('請選擇要上傳的文件');
            return;
        }

        const formData = new FormData();
        formData.append('file', files[0]);
        formData.append('uploadedBy', currentUser._id);
        if (currentFolder) {
            formData.append('parentFolder', currentFolder);
        }

        console.log('上傳文件數據:', {
            uploadedBy: currentUser._id,
            parentFolder: currentFolder,
            fileName: files[0].name
        });

        const response = await fetch('/api/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('文件上傳結果:', result);

        alert('文件上傳成功');
        fileInput.value = '';
        await displayFiles();
    } catch (error) {
        console.error('上傳文件錯誤:', error);
        alert('上傳文件失敗: ' + error.message);
    }
}

// 上傳文件夾
async function uploadFolder() {
    try {
        const folderInput = document.getElementById('folder');
        const files = folderInput.files;
        if (files.length === 0) {
            alert('請選擇要上傳的文件夾');
            return;
        }

        // 創建文件夾
        const folderName = files[0].webkitRelativePath.split('/')[0];
        const folderResponse = await fetch('/api/folders/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: folderName,
                createdBy: currentUser._id,
                parentFolder: currentFolder
            })
        });

        if (!folderResponse.ok) {
            const errorData = await folderResponse.json();
            throw new Error(errorData.message || `HTTP error! status: ${folderResponse.status}`);
        }

        const folderResult = await folderResponse.json();
        console.log('文件夾創建結果:', folderResult);

        // 上傳文件
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('uploadedBy', currentUser._id);
            formData.append('parentFolder', folderResult._id);
            formData.append('path', file.webkitRelativePath);

            console.log('上傳文件數據:', {
                uploadedBy: currentUser._id,
                parentFolder: folderResult._id,
                path: file.webkitRelativePath,
                fileName: file.name
            });

            const response = await fetch('/api/files/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(`文件 ${file.name} 上傳結果:`, result);
        }

        alert('文件夾上傳成功');
        folderInput.value = '';
        await displayFiles();
    } catch (error) {
        console.error('上傳文件夾錯誤:', error);
        alert('上傳文件夾失敗: ' + error.message);
    }
}

// 創建文件夾
async function createFolder() {
    try {
        const folderName = prompt('請輸入文件夾名稱');
        if (!folderName) {
            return;
        }

        const response = await fetch('/api/folders/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: folderName,
                createdBy: currentUser._id,
                parentFolder: currentFolder
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        alert('文件夾創建成功');
        await displayFiles();
    } catch (error) {
        console.error('創建文件夾錯誤:', error);
        alert('創建文件夾失敗: ' + error.message);
    }
}

// 登出
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    window.location.href = '/login.html';
}

// 加載管理員儀表板
async function loadAdminDashboard() {
    try {
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '無法獲取儀表板數據');
        }

        const data = await response.json();
        
        const dashboard = document.getElementById('adminDashboard');
        const cardBody = dashboard.querySelector('.card-body');
        
        // 生成統計卡片
        const statsHtml = `
            <div class="row">
                <div class="col-md-3 mb-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="card-title">總用戶數</h6>
                                    <h2 class="mb-0">${data.totalUsers || 0}</h2>
                                </div>
                                <i class="bi bi-people fs-1"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-success text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="card-title">總文件數</h6>
                                    <h2 class="mb-0">${data.totalFiles || 0}</h2>
                                </div>
                                <i class="bi bi-file-earmark-text fs-1"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-info text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="card-title">總資料夾數</h6>
                                    <h2 class="mb-0">${data.totalFolders || 0}</h2>
                                </div>
                                <i class="bi bi-folder fs-1"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-warning text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="card-title">總存儲空間</h6>
                                    <h2 class="mb-0">${formatFileSize(data.totalStorage || 0)}</h2>
                                </div>
                                <i class="bi bi-hdd fs-1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 生成系統狀態和活動
        const systemHtml = `
            <div class="row mt-3">
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">系統狀態</h6>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label class="form-label">CPU 使用率</label>
                                <div class="progress">
                                    <div class="progress-bar" role="progressbar" style="width: ${data.systemStatus?.cpuUsage || 0}%">
                                        ${data.systemStatus?.cpuUsage || 0}%
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">記憶體使用率</label>
                                <div class="progress">
                                    <div class="progress-bar bg-success" role="progressbar" style="width: ${data.systemStatus?.memoryUsage || 0}%">
                                        ${data.systemStatus?.memoryUsage || 0}%
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-6">
                                    <small class="text-muted">總記憶體：</small>
                                    <span>${formatFileSize(data.systemStatus?.totalMemory || 0)}</span>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">可用記憶體：</small>
                                    <span>${formatFileSize(data.systemStatus?.freeMemory || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">最近上傳</h6>
                        </div>
                        <div class="card-body">
                            <ul class="list-group" id="recentActivitiesList">
                                <li class="list-group-item text-center">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">載入中...</span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        cardBody.innerHTML = statsHtml + systemHtml;
        
        // 異步加載最近活動
        const recentActivitiesList = document.getElementById('recentActivitiesList');
        if (recentActivitiesList && data.recentActivities && data.recentActivities.length > 0) {
            const activitiesHtml = await Promise.all(
                data.recentActivities.map(async activity => {
                    const username = await getUsername(activity.uploadedBy);
                    return `
                        <li class="list-group-item">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <small class="text-muted">${new Date(activity.createdAt).toLocaleString()}</small>
                                    <div>${activity.originalname}</div>
                                </div>
                                <span class="badge bg-info">${username}</span>
                            </div>
                        </li>
                    `;
                })
            );
            recentActivitiesList.innerHTML = activitiesHtml.join('');
        } else if (recentActivitiesList) {
            recentActivitiesList.innerHTML = '<li class="list-group-item text-center">暫無最近活動</li>';
        }
    } catch (error) {
        console.error('載入儀表板失敗:', error);
        const dashboard = document.getElementById('adminDashboard');
        const cardBody = dashboard.querySelector('.card-body');
        cardBody.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                載入儀表板失敗: ${error.message}
            </div>
        `;
    }
}

// 獲取用戶名
async function getUsername(userId) {
    try {
        const response = await fetch(`/api/admin/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('獲取用戶名失敗:', errorData);
            return '未知用戶';
        }

        const data = await response.json();
        return data.username || '未知用戶';
    } catch (error) {
        console.error('獲取用戶名錯誤:', error);
        return '未知用戶';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 加載用戶列表
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '獲取用戶列表失敗');
        }

        const users = await response.json();
        const userList = document.getElementById('userList');
        
        if (!userList) {
            console.error('找不到用戶列表元素');
            return;
        }

        userList.innerHTML = users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>
                    <span class="badge bg-${user.status === 'active' ? 'success' : 'danger'}">
                        ${user.status === 'active' ? '啟用' : '停用'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-${user.status === 'active' ? 'warning' : 'success'}"
                            onclick="updateUserStatus('${user._id}', '${user.status === 'active' ? 'deactivate' : 'activate'}')">
                        ${user.status === 'active' ? '停用' : '啟用'}
                    </button>
                    <button class="btn btn-sm btn-danger ms-2" onclick="deleteUser('${user._id}')">
                        刪除
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加載用戶列表錯誤:', error);
        alert('加載用戶列表失敗: ' + error.message);
    }
}

// 更新用戶狀態
async function updateUserStatus(userId, action) {
    if (action === 'deactivate') {
        status = 'disable';
    }
    else if (action === 'activate') {
        status = 'active';
    }
    try {
        const response = await fetch(`/api/admin/users/${userId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '無法更新用戶狀態');
        }

        alert(`用戶${action === 'activate' ? '啟用' : '停用'}成功`);
        await loadUsers();
    } catch (error) {
        console.error('更新用戶狀態錯誤:', error);
        alert('更新用戶狀態失敗: ' + error.message);
    }
}

// 刪除用戶
async function deleteUser(userId) {
    if (!confirm('確定要刪除此用戶嗎？此操作無法撤銷。')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '無法刪除用戶');
        }

        alert('用戶刪除成功');
        await loadUsers();
    } catch (error) {
        console.error('刪除用戶錯誤:', error);
        alert('刪除用戶失敗: ' + error.message);
    }
}

// 清除所有數據
async function clearAllData() {
    if (!confirm('確定要清除所有數據嗎？此操作將刪除所有非管理員用戶的數據，且無法撤銷。')) {
        return;
    }

    try {
        const response = await fetch('/api/admin/clear-all', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '無法清除數據');
        }

        alert('所有數據已清除');
        await loadAdminDashboard();
        await loadUsers();
        await displayFiles();
    } catch (error) {
        console.error('清除數據錯誤:', error);
        alert('清除數據失敗: ' + error.message);
    }
}

// 切換文件夾展開/收起
async function toggleFolder(folderId) {
    try {
        const contentDiv = document.getElementById(`folder-content-${folderId}`);
        if (!contentDiv) return;

        const isHidden = contentDiv.style.display === 'none';
        contentDiv.style.display = isHidden ? 'block' : 'none';

        // 如果展開且內容為空，則加載內容
        if (isHidden && (!contentDiv.querySelector('.folder-files').children.length && 
            !contentDiv.querySelector('.folder-subfolders').children.length)) {
            await loadFolderContent(folderId);
        }
    } catch (error) {
        console.error('切換文件夾錯誤:', error);
        alert('切換文件夾失敗: ' + error.message);
    }
}

// 加載文件夾內容
async function loadFolderContent(folderId) {
    try {
        const response = await fetch(`/api/folders/${folderId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '獲取文件夾內容失敗');
        }

        const folder = await response.json();
        console.log('獲取到的文件夾內容:', folder);

        const contentDiv = document.getElementById(`folder-content-${folderId}`);
        if (!contentDiv) return;

        // 顯示子文件夾
        const subfoldersDiv = contentDiv.querySelector('.folder-subfolders');
        if (folder.subfolders && folder.subfolders.length > 0) {
            subfoldersDiv.innerHTML = '<h6 class="text-muted mb-2">子文件夾</h6>';
            folder.subfolders.forEach(subfolder => {
                const subfolderElement = createFolderElement(subfolder);
                subfoldersDiv.appendChild(subfolderElement);
            });
        }

        // 顯示文件
        const filesDiv = contentDiv.querySelector('.folder-files');
        if (folder.files && folder.files.length > 0) {
            filesDiv.innerHTML = '<h6 class="text-muted mb-2">文件</h6>';
            folder.files.forEach(file => {
                const fileElement = createFileElement(file);
                filesDiv.appendChild(fileElement);
            });
        }

        // 如果沒有內容，顯示提示
        if ((!folder.subfolders || folder.subfolders.length === 0) && 
            (!folder.files || folder.files.length === 0)) {
            contentDiv.innerHTML = '<div class="text-center text-muted py-2">此文件夾為空</div>';
        }
    } catch (error) {
        console.error('加載文件夾內容錯誤:', error);
        alert('加載文件夾內容失敗: ' + error.message);
    }
} 
