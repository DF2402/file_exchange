const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 创建新用户
    const user = new User({ username, password });
    await user.save();

    res.status(201).json({ message: '注册成功' });
  } catch (error) {
    res.status(500).json({ message: '注册失败', error: error.message });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('登入嘗試:', { username });

    // 查找用户
    const user = await User.findOne({ username });
    console.log('查找用戶結果:', user ? '找到用戶' : '用戶不存在');
    
    if (!user) {
      console.log('用戶不存在:', username);
      return res.status(401).json({ message: '用戶名或密碼錯誤' });
    }

    // 验证密码
    console.log('開始驗證密碼...');
    const isMatch = await user.comparePassword(password);
    console.log('密碼驗證結果:', isMatch);
    
    if (!isMatch) {
      console.log('密碼不匹配:', username);
      return res.status(401).json({ message: '用戶名或密碼錯誤' });
    }

    // 生成JWT令牌
    console.log('生成 JWT 令牌...');
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );

    console.log('登入成功:', username, '角色:', user.role);
    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({ message: '登入失敗', error: error.message });
  }
});

module.exports = router;