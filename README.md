# text-share
跨设备文本共享功能这是一个实时跨设备文本共享的网页应用，允许多个设备通过输入相同的6位房间号来共享和同步文本内容。功能特点🏠 房间管理: 自动生成6位数字房间号，或手动输入房间号加入📱 跨设备同步: 多个设备实时同步文本内容✨ 永久持久化: 房间数据通过系统占位设备（System Keeper）永久保留，除非用户主动销毁。🔄 自动重连: 浏览器关闭或断开后重开，可自动重新加入上次的房间。👥 设备状态: 显示当前房间内的在线设备及其状态（不包含占位系统设备）。💾 文本操作: 支持清空、复制、保存文本功能。💥 主动销毁: 用户可以主动永久删除整个房间及其所有数据。🎨 现代UI: 响应式设计，支持移动端和桌面端。文件结构share/text-share/
├── index.php       # 主页面 (包含前端HTML和JS引用)
├── style.css       # 样式文件
├── script.js       # 前端JavaScript逻辑
├── api.php         # 后端API接口 (PHP环境运行)
└── README.md       # 说明文档
使用方法访问页面: 打开 share/text-share/index.php创建/加入房间:点击"创建新房间"按钮，系统会自动生成房间号。在其他设备上输入房间号，点击"进入房间"。共享文本: 在任意设备上输入文本，其他设备会实时看到更新。持久化退出: 直接关闭浏览器或标签页，房间号会保留，下次打开将自动重连。主动离开: 点击"离开房间"按钮，只会从当前房间设备列表中移除，房间数据会保留。永久销毁: 点击"🔥 销毁房间"按钮，将永久删除房间及其所有数据。API接口创建房间POST api.php?action=create_room
返回: {"success": true, "room_code": "123456", "message": "房间创建成功"}加入房间POST api.php?action=join_room
Content-Type: application/json
Body: {"room_code": "123456"}
返回: {"success": true, "device_id": "xxx", "room_code": "123456", "text_content": "", "devices": {...}}更新文本POST api.php?action=update_text
Content-Type: application/json
Body: {"room_code": "123456", "device_id": "xxx", "text_content": "新文本"}
获取房间状态GET api.php?action=get_room_status&room_code=123456&device_id=xxx
离开房间 (仅从设备列表移除)POST api.php?action=leave_room
Content-Type: application/json
Body: {"room_code": "123456", "device_id": "xxx"}
【新增】销毁房间 (永久删除)POST api.php?action=destroy_room
Content-Type: application/json
Body: {"room_code": "123456"}
检查房间是否存在GET api.php?action=check_room&room_code=123456
技术实现前端: 原生HTML/CSS/JavaScript，使用 localStorage 实现永久持久化。后端: PHP，负责处理房间逻辑。同步机制: 轮询方式，每2秒检查一次更新。数据存储: 服务器本地JSON文件 (rooms.json)。房间管理: 引入系统占位设备（System Keeper）确保房间永久保留，房间删除仅通过用户主动销毁。注意事项部署环境: 本应用必须部署在支持 PHP 的服务器环境下运行。房间生命周期: 房间数据除非用户主动点击“销毁房间”，否则将永久保存。数据丢失: 销毁房间会永久删除所有文本内容，请谨慎操作。扩展功能建议添加用户昵称功能支持富文本编辑添加文件共享功能实现真正的WebSocket连接添加房间密码保护支持文本历史记录
