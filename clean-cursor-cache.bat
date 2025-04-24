@echo off
echo 正在清理 Cursor 緩存...

:: 停止 Cursor 進程
taskkill /F /IM "Cursor.exe" 2>nul

:: 清理緩存目錄
set CURSOR_CACHE=%LOCALAPPDATA%\Cursor\Cache
set CURSOR_GPUCACHE=%LOCALAPPDATA%\Cursor\GPUCache
set CURSOR_SESSION=%LOCALAPPDATA%\Cursor\Session Storage
set CURSOR_LOCALSTORAGE=%LOCALAPPDATA%\Cursor\Local Storage

:: 刪除緩存文件
if exist "%CURSOR_CACHE%" (
    rd /s /q "%CURSOR_CACHE%"
    echo 已清理 Cache 目錄
)

if exist "%CURSOR_GPUCACHE%" (
    rd /s /q "%CURSOR_GPUCACHE%"
    echo 已清理 GPUCache 目錄
)

if exist "%CURSOR_SESSION%" (
    rd /s /q "%CURSOR_SESSION%"
    echo 已清理 Session Storage 目錄
)

if exist "%CURSOR_LOCALSTORAGE%" (
    rd /s /q "%CURSOR_LOCALSTORAGE%"
    echo 已清理 Local Storage 目錄
)

:: 清理工作區緩存
if exist ".cursor" (
    rd /s /q ".cursor"
    echo 已清理工作區 .cursor 目錄
)

echo 緩存清理完成！
echo 請重新啟動 Cursor 以應用更改。
pause 