/**
 * 驗證文件夾名稱
 * @param {string} name - 文件夾名稱
 * @returns {boolean} - 是否有效
 */
const validateFolderName = (name) => {
    if (!name || typeof name !== 'string') {
        return false;
    }

    // 檢查長度
    if (name.length < 1 || name.length > 255) {
        return false;
    }

    // 檢查特殊字符
    const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
    if (invalidChars.test(name)) {
        return false;
    }

    // 檢查開頭和結尾的空格
    if (name.trim() !== name) {
        return false;
    }

    // 檢查連續的點
    if (/\.{2,}/.test(name)) {
        return false;
    }

    return true;
};

module.exports = {
    validateFolderName
}; 