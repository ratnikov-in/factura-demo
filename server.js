const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Секретный ключ для проверки JWT (в реальном приложении хранить в env переменных)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

app.use(express.json());
app.use(cors());

// Функция для генерации 6-значного кода из AbsClientID
function generateSixDigitCode(clientId) {
    if (!clientId) return '000000';
    
    // Удаляем пробелы и дефисы
    const cleanId = clientId.toString().replace(/[-\s]/g, '');
    
    // Создаем хеш используя простой алгоритм
    let hash = 0;
    for (let i = 0; i < cleanId.length; i++) {
        const char = cleanId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    // Берем абсолютное значение и последние 6 цифр
    return Math.abs(hash % 1000000).toString().padStart(6, '0');
}

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Токен отсутствует' });
    }

    try {
        // Проверяем и декодируем JWT токен
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('JWT ошибка:', error.message);
        return res.status(403).json({ error: 'Неверный или просроченный токен' });
    }
}

// Главная страница с формой для тестирования
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>JWT Decoder App</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                }
                
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 2rem;
                    text-align: center;
                }
                
                .header h1 {
                    font-size: 2.5rem;
                    margin-bottom: 0.5rem;
                }
                
                .header p {
                    opacity: 0.9;
                    font-size: 1.1rem;
                }
                
                .content {
                    padding: 2rem;
                }
                
                .form-group {
                    margin-bottom: 1.5rem;
                }
                
                label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                    color: #555;
                }
                
                textarea {
                    width: 100%;
                    height: 120px;
                    padding: 12px;
                    border: 2px solid #e1e5e9;
                    border-radius: 8px;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    resize: vertical;
                    transition: border-color 0.3s;
                }
                
                textarea:focus {
                    outline: none;
                    border-color: #667eea;
                }
                
                .btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    display: inline-block;
                }
                
                .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
                }
                
                .btn:active {
                    transform: translateY(0);
                }
                
                .result {
                    margin-top: 2rem;
                    padding: 1.5rem;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border-left: 4px solid #667eea;
                    display: none;
                }
                
                .code-display {
                    text-align: center;
                    margin: 1.5rem 0;
                }
                
                .code {
                    font-size: 3rem;
                    font-weight: bold;
                    color: #28a745;
                    letter-spacing: 0.8rem;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
                    margin: 1rem 0;
                    padding: 1rem;
                    background: white;
                    border-radius: 10px;
                    border: 2px dashed #28a745;
                }
                
                .info-box {
                    background: #e7f3ff;
                    border-left: 4px solid #2196F3;
                    padding: 1rem;
                    margin: 1rem 0;
                    border-radius: 4px;
                }
                
                .error {
                    background: #ffe7e7;
                    border-left: 4px solid #f44336;
                    padding: 1rem;
                    margin: 1rem 0;
                    border-radius: 4px;
                    display: none;
                }
                
                pre {
                    background: #2d2d2d;
                    color: #f8f8f2;
                    padding: 1rem;
                    border-radius: 8px;
                    overflow-x: auto;
                    margin: 1rem 0;
                }
                
                .instructions {
                    background: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 1rem;
                    margin: 1.5rem 0;
                    border-radius: 4px;
                }
                
                @media (max-width: 768px) {
                    .header h1 {
                        font-size: 2rem;
                    }
                    
                    .code {
                        font-size: 2rem;
                        letter-spacing: 0.5rem;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 JWT Decoder</h1>
                    <p>Декодируйте JWT токен и получите 6-значный код</p>
                </div>
                
                <div class="content">
                    <div class="instructions">
                        <h3>📋 Инструкция по использованию:</h3>
                        <p>1. Вставьте ваш JWT токен в поле ниже</p>
                        <p>2. Нажмите "Декодировать токен"</p>
                        <p>3. Получите 6-значный код на основе AbsClientID</p>
                    </div>
                    
                    <div class="form-group">
                        <label for="jwtToken">JWT Токен:</label>
                        <textarea 
                            id="jwtToken" 
                            placeholder="Введите ваш JWT токен здесь..."
                        ></textarea>
                    </div>
                    
                    <button class="btn" onclick="decodeToken()">
                        🔍 Декодировать токен
                    </button>
                    
                    <div id="error" class="error"></div>
                    
                    <div id="result" class="result">
                        <h3>✅ Результат декодирования:</h3>
                        <div class="code-display">
                            <p>Ваш 6-значный код:</p>
                            <div id="code" class="code"></div>
                            <p><small>Код действителен в течение 5 минут</small></p>
                        </div>
                        
                        <div class="info-box">
                            <h4>📊 Информация из токена:</h4>
                            <div id="tokenInfo"></div>
                        </div>
                    </div>
                    
                    <div class="info-box">
                        <h4>🔧 API Endpoint:</h4>
                        <p><strong>POST /api/verify</strong></p>
                        <p>Отправьте JWT токен в заголовке Authorization:</p>
                        <pre>Authorization: Bearer YOUR_JWT_TOKEN_HERE</pre>
                    </div>
                </div>
            </div>

            <script>
                function decodeToken() {
                    const tokenInput = document.getElementById('jwtToken').value.trim();
                    const resultDiv = document.getElementById('result');
                    const errorDiv = document.getElementById('error');
                    const codeDiv = document.getElementById('code');
                    const tokenInfoDiv = document.getElementById('tokenInfo');
                    
                    // Скрываем предыдущие результаты
                    resultDiv.style.display = 'none';
                    errorDiv.style.display = 'none';
                    
                    if (!tokenInput) {
                        showError('Пожалуйста, введите JWT токен');
                        return;
                    }
                    
                    // Показываем загрузку
                    codeDiv.textContent = '...';
                    resultDiv.style.display = 'block';
                    
                    fetch('/api/verify', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + tokenInput,
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(response => {
                        if (!response.ok) {
                            return response.json().then(err => {
                                throw new Error(err.error || 'Ошибка сервера');
                            });
                        }
                        return response.json();
                    })
                }
                
                function showError(message) {
                    const errorDiv = document.getElementById('error');
                    errorDiv.textContent = message;
                    errorDiv.style.display = 'block';
                }
                
                // Пример JWT токена для тестирования
                document.getElementById('jwtToken').value = 
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
                    'eyJwYXlsb2FkIjp7IkFic0NsaWVudElEIjoiYjY5NmIyNjAtMDNlYy00NmI3LTg1NWEtYmIyYWIzZGExOTc2IiwiY2FsbFBvaW50VHlwZSI6Ilx1MDQxZlx1MDQzMFx1MDQzNlx1MDQzOFx1MDQzYlx1MDQzOCIsInByb2R1Y3RJRCI6IkFDX2FjY291bnQiLCJzdWIiOiJzdHJpbmciLCJmcmFtZUNhbGxQb2ludE5hbWUiOiJzdHJpbmcifSwiaGVhZGVyIjp7ImFsZyI6IkhTMjU2IiwidHlwIjoiSldUIn0sInNpZ25hdHVyZSI6eyJzdWIiOiJzdHJpbmcifX0.' +
                    'fake_signature_for_demonstration_only';
            </script>
        </body>
        </html>
    `);
});

// API endpoint для проверки JWT токена
app.post('/api/verify', authenticateToken, (req, res) => {
    try {
        const decodedToken = req.user;
        
        // Проверяем структуру токена
        if (!decodedToken.payload || !decodedToken.payload.AbsClientID) {
            return res.status(400).json({ 
                error: 'Неверная структура токена: отсутствует payload.AbsClientID' 
            });
        }

        const absClientID = decodedToken.payload.AbsClientID;
        const sixDigitCode = generateSixDigitCode(absClientID);

        // Возвращаем JSON с кодом и декодированными данными
        res.json({
            success: true,
            code: sixDigitCode,
            decoded: decodedToken,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Ошибка обработки токена:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера при обработке токена' 
        });
    }
});

// Эндпоинт для генерации тестового JWT (для демонстрации)
app.get('/api/test-token', (req, res) => {
    const testPayload = {
        header: {
            alg: "HS256",
            typ: "JWT"
        },
        payload: {
            AbsClientID: "b696b260-03ec-46b7-855a-bb2ab3da1976",
            callPointType: "Профиль",
            productID: "AC_account",
            sub: "string",
            frameCallPointName: "string"
        },
        signature: {
            sub: "string"
        }
    };
    
    const testToken = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '1h' });
    
    res.json({
        token: testToken,
        payload: testPayload
    });
});

// Обработка несуществующих маршрутов
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📧 API Endpoint: http://localhost:${PORT}/api/verify`);
    console.log(`🔗 Тестовый токен: http://localhost:${PORT}/api/test-token`);
});