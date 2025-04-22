// 等待 MongoDB 完全啟動
sleep(5000);

// 切換到 admin 數據庫
db = db.getSiblingDB('admin');

// 創建 root 用戶（如果不存在）
if (!db.getUser('admin')) {
  db.createUser({
    user: 'admin',
    pwd: 'admin123456',
    roles: [
      {
        role: 'root',
        db: 'admin'
      }
    ]
  });
}

// 切換到應用數據庫
db = db.getSiblingDB('filedb');

// 創建應用程序用戶
db.createUser({
  user: 'app_user',
  pwd: 'app123456',
  roles: [
    {
      role: 'readWrite',
      db: 'filedb'
    }
  ]
});

// 創建必要的集合
db.createCollection('users');
db.createCollection('files');

// 創建索引
db.users.createIndex({ "username": 1 }, { unique: true });
db.files.createIndex({ "uploadedBy": 1 });
db.files.createIndex({ "folderPath": 1 });

// 創建初始管理員用戶
db.users.insertOne({
  username: 'admin',
  password: '$2a$10$X7UrE2J5Q5Q5Q5Q5Q5Q5QO5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q', // 密碼：admin123456
  role: 'admin',
  createdAt: new Date(),
  status: 'active'
}); 