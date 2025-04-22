const mongoose = require('mongoose');
const User = require('./models/User');

async function initAdmin() {
    try {
        // 連接到數據庫
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/filedb');
        
        // 檢查是否已存在管理員帳戶
        const adminExists = await User.findOne({ username: 'admin' });
        
        if (!adminExists) {
            // 創建默認管理員帳戶
            const admin = new User({
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                status: 'active'
            });
            
            await admin.save();
            console.log('默認管理員帳戶創建成功');
        } else {
            console.log('管理員帳戶已存在');
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('初始化管理員帳戶失敗:', error);
        process.exit(1);
    }
}

// 執行初始化
initAdmin(); 