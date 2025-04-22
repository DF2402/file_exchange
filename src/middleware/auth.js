const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: '未提供認證令牌' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        console.log('JWT 解碼結果:', decoded);

        // 從數據庫獲取完整的用戶信息
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: '用戶不存在' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('認證錯誤:', error);
        res.status(401).json({ message: '無效的認證令牌' });
    }
};

module.exports = authMiddleware; 