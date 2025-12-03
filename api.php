<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$rooms_file = 'rooms.json';
$rooms = [];

define('SYSTEM_KEEPER_ID', 'SYSTEM_KEEPER');

if (file_exists($rooms_file)) {
    $rooms = json_decode(file_get_contents($rooms_file), true) ?: [];
}

function cleanExpiredRooms($rooms) {
    return $rooms;
}

function saveRooms($rooms) {
    global $rooms_file;
    file_put_contents($rooms_file, json_encode($rooms, JSON_PRETTY_PRINT));
}

function generateRoomCode() {
    return str_pad(rand(100000, 999999), 6, '0', STR_PAD_LEFT);
}

function getClientIP() {
    $ip_keys = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];
    foreach ($ip_keys as $key) {
        if (array_key_exists($key, $_SERVER) === true) {
            foreach (explode(',', $_SERVER[$key]) as $ip) {
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                    return $ip;
                }
            }
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'create_room':
            if ($method !== 'POST') {
                throw new Exception('Method not allowed');
            }
            
            do {
                $room_code = generateRoomCode();
            } while (isset($rooms[$room_code]));
            
            $rooms = cleanExpiredRooms($rooms);
            
            $rooms[$room_code] = [
                'code' => $room_code,
                'created_at' => time(),
                'last_activity' => time(),
                'text_content' => '',
                'devices' => [
                    SYSTEM_KEEPER_ID => [
                        'id' => SYSTEM_KEEPER_ID,
                        'ip' => 'System',
                        'user_agent' => 'Keeper',
                        'joined_at' => time(),
                        'last_seen' => time()
                    ]
                ],
                'creator_ip' => getClientIP()
            ];
            
            saveRooms($rooms);
            
            echo json_encode([
                'success' => true,
                'room_code' => $room_code,
                'message' => '房间创建成功'
            ]);
            break;
            
        case 'join_room':
            if ($method !== 'POST') {
                throw new Exception('Method not allowed');
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            $room_code = $input['room_code'] ?? '';
            
            if (empty($room_code) || !preg_match('/^\d{6}$/', $room_code)) {
                throw new Exception('房间号格式不正确');
            }
            
            $rooms = cleanExpiredRooms($rooms);
            
            if (!isset($rooms[$room_code])) {
                throw new Exception('房间不存在');
            }
            
            $device_id = uniqid(); 
            $device_info = [
                'id' => $device_id,
                'ip' => getClientIP(),
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                'joined_at' => time(),
                'last_seen' => time()
            ];
            
            $rooms[$room_code]['devices'][$device_id] = $device_info;
            $rooms[$room_code]['devices'][SYSTEM_KEEPER_ID]['last_seen'] = time(); 
            $rooms[$room_code]['last_activity'] = time();
            
            saveRooms($rooms);
            
            echo json_encode([
                'success' => true,
                'device_id' => $device_id,
                'room_code' => $room_code,
                'text_content' => $rooms[$room_code]['text_content'],
                'devices' => array_filter($rooms[$room_code]['devices'], function($device) {
                    return $device['id'] !== SYSTEM_KEEPER_ID;
                }),
                'message' => '成功加入房间'
            ]);
            break;
            
        case 'update_text':
            if ($method !== 'POST') {
                throw new Exception('Method not allowed');
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            $room_code = $input['room_code'] ?? '';
            $device_id = $input['device_id'] ?? '';
            $text_content = $input['text_content'] ?? '';
            
            if (empty($room_code) || empty($device_id)) {
                throw new Exception('缺少必要参数');
            }
            
            $rooms = cleanExpiredRooms($rooms);
            
            if (!isset($rooms[$room_code])) {
                throw new Exception('房间不存在');
            }
            
            if ($device_id === SYSTEM_KEEPER_ID) {
                 throw new Exception('非法设备ID');
            }

            if (!isset($rooms[$room_code]['devices'][$device_id])) {
                throw new Exception('设备未加入房间');
            }
            
            $rooms[$room_code]['text_content'] = $text_content;
            $rooms[$room_code]['last_activity'] = time();
            $rooms[$room_code]['devices'][$device_id]['last_seen'] = time();
            $rooms[$room_code]['devices'][SYSTEM_KEEPER_ID]['last_seen'] = time(); // 保持占位设备活跃
            
            saveRooms($rooms);
            
            echo json_encode([
                'success' => true,
                'message' => '文本更新成功',
                'timestamp' => time()
            ]);
            break;
            
        case 'get_room_status':
            if ($method !== 'GET') {
                throw new Exception('Method not allowed');
            }
            
            $room_code = $_GET['room_code'] ?? '';
            $device_id = $_GET['device_id'] ?? '';
            
            if (empty($room_code) || empty($device_id)) {
                throw new Exception('缺少必要参数');
            }
            
            $rooms = cleanExpiredRooms($rooms);
            
            if (!isset($rooms[$room_code])) {
                throw new Exception('房间不存在');
            }
            
            if ($device_id === SYSTEM_KEEPER_ID) {
                 throw new Exception('非法设备ID');
            }

            if (!isset($rooms[$room_code]['devices'][$device_id])) {
                throw new Exception('设备未加入房间');
            }
            
            $rooms[$room_code]['devices'][$device_id]['last_seen'] = time();
            $rooms[$room_code]['devices'][SYSTEM_KEEPER_ID]['last_seen'] = time(); 
            $rooms[$room_code]['last_activity'] = time();
            saveRooms($rooms);
            
            echo json_encode([
                'success' => true,
                'text_content' => $rooms[$room_code]['text_content'],
                'devices' => array_filter($rooms[$room_code]['devices'], function($device) {
                    return $device['id'] !== SYSTEM_KEEPER_ID;
                }),
                'last_update' => $rooms[$room_code]['last_activity']
            ]);
            break;
            
        case 'leave_room':
            if ($method !== 'POST') {
                throw new Exception('Method not allowed');
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            $room_code = $input['room_code'] ?? '';
            $device_id = $input['device_id'] ?? '';
            
            if (empty($room_code) || empty($device_id)) {
                throw new Exception('缺少必要参数');
            }
            
            if (isset($rooms[$room_code]['devices'][$device_id]) && $device_id !== SYSTEM_KEEPER_ID) {
                unset($rooms[$room_code]['devices'][$device_id]);
                $rooms[$room_code]['last_activity'] = time();
                
                saveRooms($rooms);
            }
            
            echo json_encode([
                'success' => true,
                'message' => '已离开房间'
            ]);
            break;
            
        case 'destroy_room':
            if ($method !== 'POST') {
                throw new Exception('Method not allowed');
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            $room_code = $input['room_code'] ?? '';
            
            if (empty($room_code)) {
                throw new Exception('缺少房间号');
            }
            
            if (isset($rooms[$room_code])) {
                unset($rooms[$room_code]);
                saveRooms($rooms);
                
                echo json_encode([
                    'success' => true,
                    'message' => '房间已成功销毁'
                ]);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => '房间不存在'
                ]);
            }
            break;

        case 'check_room':
            if ($method !== 'GET') {
                throw new Exception('Method not allowed');
            }
            
            $room_code = $_GET['room_code'] ?? '';
            
            if (empty($room_code) || !preg_match('/^\d{6}$/', $room_code)) {
                throw new Exception('房间号格式不正确');
            }
            
            $rooms = cleanExpiredRooms($rooms);
            
            $device_count = isset($rooms[$room_code]) ? count($rooms[$room_code]['devices']) : 0;
            if (isset($rooms[$room_code])) {
                $device_count = max(0, $device_count - 1); 
            }

            echo json_encode([
                'success' => true,
                'exists' => isset($rooms[$room_code]),
                'device_count' => $device_count
            ]);
            break;
            
        default:
            throw new Exception('未知操作');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>