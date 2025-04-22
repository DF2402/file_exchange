const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Folder = require('../models/Folder');
const File = require('../models/File');

// 獲取文件夾列表
router.get('/list', auth, async (req, res) => {
    try {
        const folders = await Folder.find({
            $or: [
                { createdBy: req.user._id },
                { sharedWith: req.user._id },
                { isPublic: true }
            ]
        });
        res.json(folders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 創建文件夾
router.post('/create', auth, async (req, res) => {
    try {
        const folder = new Folder({
            name: req.body.name,
            originalName: req.body.name,
            createdBy: req.user._id,
            parentFolder: req.body.parentFolder || null,
            path: req.body.parentFolder ? 
                `${req.body.parentFolder}/${req.body.name}` : 
                req.body.name
        });

        await folder.save();

        // 如果指定了父文件夾，更新父文件夾的子文件夾列表
        if (req.body.parentFolder) {
            await Folder.findByIdAndUpdate(
                req.body.parentFolder,
                { $push: { subfolders: folder._id } }
            );
        }

        res.status(201).json(folder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 獲取文件夾詳情
router.get('/:id', auth, async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id)
            .populate('files')
            .populate('subfolders')
            .populate('createdBy', 'username')
            .populate('sharedWith', 'username');

        if (!folder) {
            return res.status(404).json({ message: '文件夾不存在' });
        }

        // 檢查權限
        if (!folder.isPublic && 
            folder.createdBy._id.toString() !== req.user._id.toString() && 
            !folder.sharedWith.some(user => user._id.toString() === req.user._id.toString()) &&
            req.user.role !== 'admin'
        ) {
            return res.status(403).json({ message: '沒有權限訪問此文件夾' });
        }

        res.json(folder);
    } catch (error) {
        console.error('獲取文件夾詳情錯誤:', error);
        res.status(500).json({ message: error.message });
    }
});

// 共享文件夾
router.post('/:id/share', auth, async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id);
        if (!folder) {
            return res.status(404).json({ message: '文件夾不存在' });
        }

        if (folder.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: '只有文件夾創建者可以共享文件夾' });
        }

        folder.sharedWith = [...new Set([...folder.sharedWith, ...req.body.userIds])];
        await folder.save();

        res.json(folder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 刪除文件夾
router.delete('/:id', auth, async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id);
        if (!folder) {
            return res.status(404).json({ message: '文件夾不存在' });
        }

        if (folder.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: '只有文件夾創建者可以刪除文件夾' });
        }

        // 遞歸刪除子文件夾
        const deleteSubfolders = async (folderId) => {
            const subfolders = await Folder.find({ parentFolder: folderId });
            for (const subfolder of subfolders) {
                await deleteSubfolders(subfolder._id);
                await subfolder.deleteOne();
            }
        };

        await deleteSubfolders(folder._id);

        // 更新父文件夾的子文件夾列表
        if (folder.parentFolder) {
            await Folder.findByIdAndUpdate(
                folder.parentFolder,
                { $pull: { subfolders: folder._id } }
            );
        }

        // 刪除文件夾中的所有文件
        await File.deleteMany({ parentFolder: folder._id });

        await folder.deleteOne();
        res.json({ message: '文件夾已刪除' });
    } catch (error) {
        console.error('刪除文件夾錯誤:', error);
        res.status(500).json({ message: error.message });
    }
});

// 移動文件夾到另一個文件夾
router.put('/:id/move', auth, async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id);
        if (!folder) {
            return res.status(404).json({ message: '文件夾不存在' });
        }

        if (folder.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: '只有文件夾創建者可以移動文件夾' });
        }

        const oldParentFolder = folder.parentFolder;
        folder.parentFolder = req.body.folderId;
        folder.path = req.body.folderId ? 
            `${req.body.folderId}/${folder.name}` : 
            folder.name;
        await folder.save();

        // 更新舊父文件夾的子文件夾列表
        if (oldParentFolder) {
            await Folder.findByIdAndUpdate(
                oldParentFolder,
                { $pull: { subfolders: folder._id } }
            );
        }

        // 更新新父文件夾的子文件夾列表
        if (req.body.folderId) {
            await Folder.findByIdAndUpdate(
                req.body.folderId,
                { $push: { subfolders: folder._id } }
            );
        }

        res.json(folder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 