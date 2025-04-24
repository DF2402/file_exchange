# API 文檔

## 目錄

1. [認證相關](#認證相關)
2. [用戶相關](#用戶相關)
3. [文件相關](#文件相關)
4. [文件夾相關](#文件夾相關)
5. [管理員相關](#管理員相關)

## 認證相關

### 用戶註冊

```http
POST /api/auth/register
Content-Type: application/json

{
    "username": "string",     // 用戶名，必填
    "email": "string",        // 電子郵箱，必填
    "password": "string"      // 密碼，必填，最少6位
}
```

**響應**
```json
{
    "message": "註冊成功",
    "user": {
        "_id": "string",
        "username": "string",
        "email": "string",
        "role": "user",
        "status": "active"
    }
}
```

### 用戶登入

```http
POST /api/auth/login
Content-Type: application/json

{
    "username": "string",     // 用戶名，必填
    "password": "string"      // 密碼，必填
}
```

**響應**
```json
{
    "token": "string",        // JWT token
    "user": {
        "_id": "string",
        "username": "string",
        "role": "string",
        "status": "string"
    }
}
```

## 用戶相關

### 獲取個人資料

```http
GET /api/users/profile
Authorization: Bearer <token>
```

**響應**
```json
{
    "_id": "string",
    "username": "string",
    "email": "string",
    "role": "string",
    "status": "string",
    "createdAt": "string",
    "updatedAt": "string"
}
```

### 更新個人資料

```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
    "username": "string",     // 可選
    "email": "string"         // 可選
}
```

**響應**
```json
{
    "message": "更新成功",
    "user": {
        "_id": "string",
        "username": "string",
        "email": "string",
        "role": "string",
        "status": "string"
    }
}
```

### 修改密碼

```http
PUT /api/users/password
Authorization: Bearer <token>
Content-Type: application/json

{
    "currentPassword": "string",  // 當前密碼，必填
    "newPassword": "string"       // 新密碼，必填，最少6位
}
```

**響應**
```json
{
    "message": "密碼修改成功"
}
```

## 文件相關

### 上傳文件

```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <文件>                  // 必填，文件大小限制 100MB
parentFolder: <string>        // 可選，父文件夾ID
```

**響應**
```json
{
    "message": "上傳成功",
    "file": {
        "_id": "string",
        "filename": "string",
        "originalname": "string",
        "mimetype": "string",
        "size": "number",
        "uploadedBy": "string",
        "parentFolder": "string",
        "createdAt": "string"
    }
}
```

### 獲取文件列表

```http
GET /api/files/list
Authorization: Bearer <token>
```

**響應**
```json
[
    {
        "_id": "string",
        "filename": "string",
        "originalname": "string",
        "mimetype": "string",
        "size": "number",
        "uploadedBy": {
            "_id": "string",
            "username": "string"
        },
        "parentFolder": "string",
        "createdAt": "string"
    }
]
```

### 下載文件

```http
GET /api/files/:fileId/download
Authorization: Bearer <token>
```

**響應**
- 文件流

### 刪除文件

```http
DELETE /api/files/:fileId
Authorization: Bearer <token>
```

**響應**
```json
{
    "message": "文件刪除成功"
}
```

### 移動文件

```http
PUT /api/files/:fileId/move
Authorization: Bearer <token>
Content-Type: application/json

{
    "folderId": "string"      // 可選，目標文件夾ID，null表示移動到根目錄
}
```

**響應**
```json
{
    "message": "文件移動成功",
    "file": {
        "_id": "string",
        "filename": "string",
        "parentFolder": "string"
    }
}
```

## 文件夾相關

### 創建文件夾

```http
POST /api/folders/create
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "string",         // 必填，文件夾名稱
    "parentFolder": "string"  // 可選，父文件夾ID
}
```

**響應**
```json
{
    "message": "文件夾創建成功",
    "folder": {
        "_id": "string",
        "name": "string",
        "parentFolder": "string",
        "createdBy": "string",
        "createdAt": "string"
    }
}
```

### 獲取文件夾列表

```http
GET /api/folders/list
Authorization: Bearer <token>
```

**響應**
```json
[
    {
        "_id": "string",
        "name": "string",
        "parentFolder": "string",
        "createdBy": "string",
        "createdAt": "string",
        "files": [
            {
                "_id": "string",
                "filename": "string",
                "originalname": "string"
            }
        ],
        "subfolders": [
            {
                "_id": "string",
                "name": "string"
            }
        ]
    }
]
```

### 獲取文件夾詳情

```http
GET /api/folders/:folderId
Authorization: Bearer <token>
```

**響應**
```json
{
    "_id": "string",
    "name": "string",
    "parentFolder": "string",
    "createdBy": "string",
    "createdAt": "string",
    "files": [
        {
            "_id": "string",
            "filename": "string",
            "originalname": "string",
            "mimetype": "string",
            "size": "number"
        }
    ],
    "subfolders": [
        {
            "_id": "string",
            "name": "string"
        }
    ]
}
```

### 刪除文件夾

```http
DELETE /api/folders/:folderId
Authorization: Bearer <token>
```

**響應**
```json
{
    "message": "文件夾刪除成功"
}
```

## 管理員相關

### 獲取系統統計

```http
GET /api/admin/stats
Authorization: Bearer <token>
```

**響應**
```json
{
    "totalUsers": "number",
    "totalFiles": "number",
    "totalFolders": "number",
    "totalStorage": "number",
    "systemStatus": {
        "cpuUsage": "number",
        "memoryUsage": "number",
        "totalMemory": "number",
        "freeMemory": "number"
    },
    "recentActivities": [
        {
            "_id": "string",
            "originalname": "string",
            "uploadedBy": "string",
            "createdAt": "string"
        }
    ]
}
```

### 獲取用戶列表

```http
GET /api/admin/users
Authorization: Bearer <token>
```

**響應**
```json
[
    {
        "_id": "string",
        "username": "string",
        "email": "string",
        "role": "string",
        "status": "string",
        "createdAt": "string"
    }
]
```

### 更新用戶狀態

```http
PUT /api/admin/users/:userId/status
Authorization: Bearer <token>
Content-Type: application/json

{
    "status": "string"        // 必填，'active' 或 'inactive'
}
```

**響應**
```json
{
    "message": "用戶狀態更新成功",
    "user": {
        "_id": "string",
        "username": "string",
        "status": "string"
    }
}
```

### 刪除用戶

```http
DELETE /api/admin/users/:userId
Authorization: Bearer <token>
```

**響應**
```json
{
    "message": "用戶刪除成功"
}
```

### 清除所有數據

```http
DELETE /api/admin/clear-all
Authorization: Bearer <token>
```

**響應**
```json
{
    "message": "所有數據已清除"
}
```

## 錯誤響應

所有 API 在發生錯誤時都會返回以下格式的響應：

```json
{
    "message": "string",      // 錯誤信息
    "error": "string"         // 可選，詳細錯誤信息
}
```

常見的 HTTP 狀態碼：
- 200: 請求成功
- 400: 請求參數錯誤
- 401: 未認證或認證失敗
- 403: 權限不足
- 404: 資源不存在
- 500: 服務器內部錯誤

## 注意事項

1. 所有需要認證的 API 都需要在請求頭中包含 `Authorization: Bearer <token>`
2. 文件上傳大小限制為 100MB
3. 管理員 API 需要管理員權限
4. 時間格式均使用 ISO 8601 標準
5. 所有 ID 均為 MongoDB ObjectId 