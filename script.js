class TextShareApp {
    constructor() {
        this.currentRoomCode = null;
        this.deviceId = null;
        this.isConnected = false;
        this.pollingInterval = null;
        this.lastTextContent = '';
        this.lastUpdateTime = null;


        this.STORAGE_ROOM_KEY = 'ts_room_code';
        this.STORAGE_DEVICE_KEY = 'ts_device_id';
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.tryAutoReconnect();
    }

    saveState() {
        if (this.currentRoomCode && this.deviceId) {
            localStorage.setItem(this.STORAGE_ROOM_KEY, this.currentRoomCode);
            localStorage.setItem(this.STORAGE_DEVICE_KEY, this.deviceId);
        }
    }

    loadState() {
        const roomCode = localStorage.getItem(this.STORAGE_ROOM_KEY);
        const deviceId = localStorage.getItem(this.STORAGE_DEVICE_KEY);
        return { roomCode, deviceId };
    }

    clearState() {
        localStorage.removeItem(this.STORAGE_ROOM_KEY);
        localStorage.removeItem(this.STORAGE_DEVICE_KEY);
    }

    async tryAutoReconnect() {
        const savedState = this.loadState();
        
        if (savedState.roomCode) {
            this.currentRoomCode = savedState.roomCode;

            document.getElementById('room-code').value = this.currentRoomCode;
            
            this.showNotification('正在尝试自动重新加入房间...', 'info');
            
            console.log('tryAutoReconnect: 尝试重新加入房间:', this.currentRoomCode);

            try {
                const response = await fetch('api.php?action=join_room', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ room_code: this.currentRoomCode })
                });

                const result = await response.json();

                if (result.success) {
                    this.deviceId = result.device_id;
                    this.lastTextContent = result.text_content || '';
                    
                    this.saveState();

                    document.getElementById('current-room-code').textContent = result.room_code;
                    document.getElementById('shared-text').value = this.lastTextContent;
                    this.updateTextInfo();
                    this.updateDeviceList(result.devices);
                    
                    this.showTextEditor();
                    this.startPolling();
                    this.updateConnectionStatus(true);
                    this.showNotification(`成功重新加入房间: ${this.currentRoomCode}`, 'success');
                    console.log('tryAutoReconnect: 成功重新加入，已显示编辑器。');
                    return;
                } else {
                    throw new Error(result.message);
                }

            } catch (error) {
                console.error('tryAutoReconnect: 重新加入失败:', error.message);
                this.showNotification(`自动重连失败: ${error.message}`, 'error');
                this.clearState();
            }
        }

        this.showRoomInput();
        console.log('tryAutoReconnect: 显示房间输入界面。');
    }

    bindEvents() {
        document.getElementById('join-room-btn').addEventListener('click', () => this.joinRoom());
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('room-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinRoom();
            }
        });
        
        document.getElementById('shared-text').addEventListener('input', (e) => this.onTextChange(e));
        document.getElementById('clear-text-btn').addEventListener('click', () => this.clearText());
        document.getElementById('copy-text-btn').addEventListener('click', () => this.copyText());
        document.getElementById('save-text-btn').addEventListener('click', () => this.saveText());
        
        document.getElementById('leave-room-btn').addEventListener('click', () => this.leaveRoom(false, true)); 
        document.getElementById('destroy-room-btn').addEventListener('click', () => this.destroyRoom());
        
        document.getElementById('room-code').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
        
        window.addEventListener('beforeunload', () => {
            if (this.currentRoomCode && this.deviceId) {
                this.leaveRoom(true, false); 
            }
        });
    }
    
    showRoomInput() {
        document.getElementById('room-input-section').style.display = 'block';
        document.getElementById('text-editor-section').style.display = 'none';
        document.getElementById('device-list').style.display = 'none';
        document.getElementById('room-code').value = '';
    }
    
    showTextEditor() {
        document.getElementById('room-input-section').style.display = 'none';
        document.getElementById('text-editor-section').style.display = 'block';
        document.getElementById('device-list').style.display = 'block';
    }
    
    async createRoom() {
        try {
            const response = await fetch('api.php?action=create_room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentRoomCode = result.room_code;
                document.getElementById('room-code').value = result.room_code;
                await this.joinRoom();
                this.showNotification('房间创建成功！', 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this.showNotification('创建房间失败: ' + error.message, 'error');
        }
    }
    
    async joinRoom() {
        const roomCode = document.getElementById('room-code').value.trim();
        
        if (!roomCode || roomCode.length !== 6) {
            this.showNotification('请输入6位数字房间号', 'error');
            return;
        }
        
        try {
            const response = await fetch('api.php?action=join_room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    room_code: roomCode
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentRoomCode = result.room_code;
                this.deviceId = result.device_id;
                this.lastTextContent = result.text_content || '';
                
                this.saveState();

                document.getElementById('current-room-code').textContent = result.room_code;
                document.getElementById('shared-text').value = this.lastTextContent;
                this.updateTextInfo();
                this.updateDeviceList(result.devices);
                
                this.showTextEditor();
                this.startPolling();
                this.updateConnectionStatus(true);
                this.showNotification('成功加入房间！', 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this.showNotification('加入房间失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 离开房间。
     * @param {boolean} isUnloading - 是否在页面卸载前调用。
     * @param {boolean} isUserInitiated - 是否是用户主动点击按钮退出。
     */
    async leaveRoom(isUnloading = false, isUserInitiated = false) {
        if (!this.currentRoomCode || !this.deviceId) {
            return;
        }
        
        try {
            const fetchPromise = fetch('api.php?action=leave_room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    room_code: this.currentRoomCode,
                    device_id: this.deviceId
                })
            });

            if (isUnloading) {
                fetchPromise.catch(error => console.error('卸载前离开房间失败:', error));
            } else {
                await fetchPromise;
            }

        } catch (error) {
            console.error('离开房间失败:', error);
        } finally {
            this.stopPolling();
            this.currentRoomCode = null;
            this.deviceId = null;
            this.isConnected = false;

            if (isUserInitiated) { 
                this.clearState(); 
                this.showNotification('已离开房间，房间信息已清除', 'info');
            }
            
            if (!isUnloading) {
                this.showRoomInput();
                this.updateConnectionStatus(false);
                if (!isUserInitiated) { 
                    this.showNotification('已断开连接', 'info');
                }
            }
        }
    }
    
    /**
     * 销毁房间。
     */
    async destroyRoom() {
        if (!this.currentRoomCode) {
            this.showNotification('当前未加入任何房间', 'info');
            return;
        }

        const confirmDestroy = window.confirm(`警告：您确定要永久销毁房间 ${this.currentRoomCode} 吗？所有连接将被中断，房间数据将丢失。`);
        
        if (!confirmDestroy) {
            return;
        }
        
        this.showNotification('正在销毁房间...', 'info');

        try {
            const response = await fetch('api.php?action=destroy_room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    room_code: this.currentRoomCode
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.stopPolling();
                this.clearState();
                this.currentRoomCode = null;
                this.deviceId = null;
                this.isConnected = false;
                this.showRoomInput();
                this.updateConnectionStatus(false);
                this.showNotification(`房间 ${this.currentRoomCode} 已被永久销毁！`, 'error');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('销毁房间失败:', error);
            this.showNotification('销毁房间失败: ' + error.message, 'error');
        }
    }

    startPolling() {
        this.stopPolling();
        
        this.pollingInterval = setInterval(async () => {
            await this.checkRoomStatus();
        }, 2000);
    }
    
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
    
    /**
     * 检查房间状态。
     * 仅用于轮询。
     * @returns {boolean} - 房间状态是否有效。
     */
    async checkRoomStatus() {
        if (!this.currentRoomCode || !this.deviceId) {
            return false;
        }
        
        try {
            const response = await fetch(`api.php?action=get_room_status&room_code=${this.currentRoomCode}&device_id=${this.deviceId}`);
            const result = await response.json();
            
            if (result.success) {
                if (result.text_content !== this.lastTextContent) {
                    this.lastTextContent = result.text_content;
                    document.getElementById('shared-text').value = result.text_content;
                    this.updateTextInfo();
                    this.lastUpdateTime = result.last_update;
                }
                
                this.updateDeviceList(result.devices);
                this.updateConnectionStatus(true);
                
                return true;
            } else {
                this.updateConnectionStatus(false);
                
                if (result.message.includes('不存在') || result.message.includes('未加入')) {
                    this.clearState();
                    
                    this.showNotification('房间已不存在或连接已失效，请重新加入', 'error');
                    this.currentRoomCode = null;
                    this.deviceId = null;
                    this.stopPolling();
                    this.showRoomInput(); 
                }
                
                return false;
            }
        } catch (error) {
            this.updateConnectionStatus(false);
            return false;
        }
    }
    
    async onTextChange(event) {
        const newText = event.target.value;
        
        clearTimeout(this.textChangeTimeout);
        this.textChangeTimeout = setTimeout(async () => {
            await this.updateText(newText);
        }, 500);
        
        this.updateTextInfo();
    }
    
    async updateText(textContent) {
        if (!this.currentRoomCode || !this.deviceId) {
            return;
        }
        
        try {
            const response = await fetch('api.php?action=update_text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    room_code: this.currentRoomCode,
                    device_id: this.deviceId,
                    text_content: textContent
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.lastTextContent = textContent;
                this.lastUpdateTime = result.timestamp;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('更新文本失败:', error);
            this.showNotification('文本同步失败', 'error');
        }
    }
    
    updateDeviceList(devices) {
        const deviceList = document.getElementById('device-list-items');
        deviceList.innerHTML = '';
        
        const deviceCount = Object.keys(devices).length;
        document.getElementById('device-count').textContent = `设备数: ${deviceCount}`;
        
        Object.values(devices).forEach(device => {
            const isSelf = device.id === this.deviceId;
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <span class="device-status"></span>
                    <span>设备 ${device.id.substring(0, 8)} ${isSelf ? '(你)' : ''}</span>
                </div>
                <div>
                    <small>${this.formatTime(device.last_seen)}</small>
                </div>
            `;
            if (isSelf) {
                li.style.borderColor = '#ffc107';
            }

            deviceList.appendChild(li);
        });
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        this.isConnected = connected;
        
        if (connected) {
            statusElement.textContent = '已连接';
            statusElement.className = 'connection-status';
        } else {
            statusElement.textContent = '连接断开';
            statusElement.className = 'connection-status disconnected';
        }
    }
    
    updateTextInfo() {
        const textLength = document.getElementById('shared-text').value.length;
        document.getElementById('text-length').textContent = `字符数: ${textLength}`;
        
        if (this.lastUpdateTime) {
            document.getElementById('last-update').textContent = 
                `最后更新: ${this.formatTime(this.lastUpdateTime)}`;
        }
    }
    

    clearText() {
        document.getElementById('shared-text').value = '';
        this.onTextChange({ target: { value: '' } });
        this.showNotification('文本已清空！', 'info');
    }
    
    async copyText() {
        const text = document.getElementById('shared-text').value;
        if (text) {
            try {
                await navigator.clipboard.writeText(text);
                this.showNotification('文本已复制到剪贴板', 'success');
            } catch (error) {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showNotification('文本已复制到剪贴板', 'success');
            }
        } else {
            this.showNotification('没有文本可复制', 'info');
        }
    }
    
    saveText() {
        const text = document.getElementById('shared-text').value;
        if (text) {
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `text-share-${this.currentRoomCode}-${Date.now()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showNotification('文本已保存', 'success');
        } else {
            this.showNotification('没有文本可保存', 'info');
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    formatTime(timestamp) {
        const now = Math.floor(Date.now() / 1000);
        const diff = now - timestamp;
        
        if (diff < 60) {
            return '刚刚';
        } else if (diff < 3600) {
            return `${Math.floor(diff / 60)}分钟前`;
        } else {
            return new Date(timestamp * 1000).toLocaleTimeString();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TextShareApp();
});