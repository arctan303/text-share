<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>跨设备文本共享</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <!-- 房间号输入界面 -->
        <div id="room-input-section" class="room-input-section">
            <div class="header">
                <h1>📝 跨设备文本共享</h1>
                <p>输入六位房间号，与其他人实时共享文本</p>
            </div>
            
            <div class="room-input-container">
                <div class="input-group">
                    <label for="room-code">房间号 (6位数字)</label>
                    <input type="text" id="room-code" maxlength="6" placeholder="输入房间号" pattern="[0-9]{6}">
                    <button id="join-room-btn" class="btn-primary">进入房间</button>
                </div>
                
                <div class="divider">
                    <span>或</span>
                </div>
                
                <div class="create-room">
                    <button id="create-room-btn" class="btn-secondary">创建新房间</button>
                </div>
            </div>
        </div>

        <!-- 文本编辑界面 -->
        <div id="text-editor-section" class="text-editor-section" style="display: none;">
            <div class="editor-header">
                <div class="room-info">
                    <span class="room-code-display">房间号: <span id="current-room-code"></span></span>
                    <span class="connection-status" id="connection-status">连接中...</span>
                </div>
                <div class="device-count">
                    <span id="device-count">设备数: 1</span>
                </div>
                <!-- 销毁按钮和离开按钮 -->
                <div class="action-buttons">
                    <button id="destroy-room-btn" class="btn-danger">🔥 销毁房间</button>
                    <button id="leave-room-btn" class="btn-secondary">离开房间</button>
                </div>
            </div>

            <div class="editor-container">
                <div class="toolbar">
                    <button id="clear-text-btn" class="btn-tool">清空文本</button>
                    <button id="copy-text-btn" class="btn-tool">复制文本</button>
                    <button id="save-text-btn" class="btn-tool">保存文本</button>
                </div>
                
                <textarea id="shared-text" placeholder="在这里输入文本，其他设备将实时看到..."></textarea>
                
                <div class="text-info">
                    <span id="text-length">字符数: 0</span>
                    <span id="last-update">最后更新: --</span>
                </div>
            </div>
        </div>

        <!-- 设备列表 -->
        <div id="device-list" class="device-list">
            <h3>在线设备</h3>
            <ul id="device-list-items"></ul>
        </div>
    </div>

    <!-- 通知提示 -->
    <div id="notification" class="notification"></div>

    <!-- 版本号 -->
    <script src="script.js?v=20251203"></script> 
</body>
</html>