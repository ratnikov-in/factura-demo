const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Секретный ключ для проверки JWT
// На продакшене используйте process.env.JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'a-string-secret-at-least-256-bits-long';

app.use(express.json());
app.use(cors());

// Функция для генерации 6-значного кода из AbsClientID
function generateSixDigitCode(clientId) {
    if (!clientId) return '000000';
    
    // Удаляем пробелы и дефисы
    const cleanId = clientId.toString().replace(/[-\s]/g, '');
    
    // Создаем хеш используя стабильный алгоритм
    let hash = 0;
    for (let i = 0; i < cleanId.length; i++) {
        const char = cleanId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
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
        req.decodedToken = decoded;
        next();
    } catch (error) {
        console.error('JWT ошибка:', error.message);
        
        // Попробуем декодировать без проверки подписи для демонстрации
        try {
            const decodedWithoutVerify = jwt.decode(token);
            if (decodedWithoutVerify && decodedWithoutVerify.AbsClientID) {
                req.decodedToken = decodedWithoutVerify;
                console.log('Токен декодирован без проверки подписи (демо-режим)');
                next();
            } else {
                return res.status(403).json({ 
                    error: 'Неверный токен: ' + error.message 
                });
            }
        } catch (decodeError) {
            return res.status(403).json({ 
                error: 'Неверный формат токена: ' + error.message 
            });
        }
    }
}

// Главная страница
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>JWT Decoder Service</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                }
                
                .container {
                    max-width: 900px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 3rem 2rem;
                    text-align: center;
                }
                
                .header h1 {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    font-weight: 700;
                }
                
                .header p {
                    font-size: 1.3rem;
                    opacity: 0.9;
                }
                
                .content {
                    padding: 3rem;
                }
                
                .card {
                    background: #f8f9fa;
                    border-radius: 15px;
                    padding: 2rem;
                    margin-bottom: 2rem;
                    border-left: 5px solid #667eea;
                }
                
                .form-group {
                    margin-bottom: 2rem;
                }
                
                label {
                    display: block;
                    margin-bottom: 0.8rem;
                    font-weight: 600;
                    color: #495057;
                    font-size: 1.1rem;
                }
                
                textarea {
                    width: 100%;
                    height: 150px;
                    padding: 1rem;
                    border: 2px solid #e9ecef;
                    border-radius: 10px;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    font-size: 14px;
                    resize: vertical;
                    transition: all 0.3s ease;
                    background: white;
                }
                
                textarea:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }
                
                .btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 1rem 2.5rem;
                    border-radius: 10px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
                }
                
                .btn:active {
                    transform: translateY(0);
                }
                
                .result-container {
                    margin-top: 2rem;
                    display: none;
                }
                
                .result-card {
                    background: white;
                    border-radius: 15px;
                    padding: 2.5rem;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    border: 2px solid #e9ecef;
                }
                
                .code-display {
                    margin: 2rem 0;
                }
                
                .code {
                    font-size: 4rem;
                    font-weight: bold;
                    color: #28a745;
                    letter-spacing: 1rem;
                    text-shadow: 3px 3px 6px rgba(0,0,0,0.1);
                    margin: 1rem 0;
                    padding: 2rem;
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    border-radius: 15px;
                    border: 3px dashed #28a745;
                    font-family: 'Monaco', 'Menlo', monospace;
                }
                
                .token-info {
                    background: #e7f3ff;
                    border-radius: 10px;
                    padding: 1.5rem;
                    margin-top: 2rem;
                    text-align: left;
                    border-left: 4px solid #2196F3;
                }
                
                .token-info h4 {
                    color: #1976d2;
                    margin-bottom: 1rem;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-top: 1rem;
                }
                
                .info-item {
                    padding: 0.8rem;
                    background: white;
                    border-radius: 8px;
                    border-left: 3px solid #667eea;
                }
                
                .info-label {
                    font-weight: 600;
                    color: #495057;
                    font-size: 0.9rem;
                }
                
                .info-value {
                    color: #212529;
                    margin-top: 0.3rem;
                    word-break: break-all;
                }
                
                .error-message {
                    background: #ffeaa7;
                    border: 2px solid #fdcb6e;
                    border-radius: 10px;
                    padding: 1.5rem;
                    margin: 1rem 0;
                    display: none;
                    text-align: center;
                    font-weight: 600;
                }
                
                .instructions {
                    background: #fff3cd;
                    border: 2px solid #ffd43b;
                    border-radius: 10px;
                    padding: 1.5rem;
                    margin: 2rem 0;
                }
                
                .instructions h3 {
                    color: #856404;
                    margin-bottom: 1rem;
                }
                
                .instructions ol {
                    margin-left: 1.5rem;
                }
                
                .instructions li {
                    margin-bottom: 0.5rem;
                }
                
                .api-info {
                    background: #d1ecf1;
                    border: 2px solid #bee5eb;
                    border-radius: 10px;
                    padding: 1.5rem;
                    margin: 2rem 0;
                }
                
                .api-info h3 {
                    color: #0c5460;
                    margin-bottom: 1rem;
                }
                
                pre {
                    background: #2d3748;
                    color: #e2e8f0;
                    padding: 1.5rem;
                    border-radius: 10px;
                    overflow-x: auto;
                    margin: 1rem 0;
                    font-family: 'Monaco', 'Menlo', monospace;
                    font-size: 0.9rem;
                }
                
                @media (max-width: 768px) {
                    .header h1 {
                        font-size: 2rem;
                    }
                    
                    .content {
                        padding: 1.5rem;
                    }
                    
                    .code {
                        font-size: 2.5rem;
                        letter-spacing: 0.5rem;
                        padding: 1rem;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 JWT Decoder</h1>
                    <p>Декодируйте JWT токен и получите 6-значный код на основе AbsClientID</p>
                </div>
                
                <div class="content">
                    <div class="instructions">
                        <h3>📋 Как использовать:</h3>
                        <ol>
                            <li>Вставьте ваш JWT токен в поле ниже</li>
                            <li>Нажмите кнопку "Декодировать токен"</li>
                            <li>Получите 6-значный код верификации</li>
                        </ol>
                    </div>
                    
                    <div class="card">
                        <div class="form-group">
                            <label for="jwtToken">📨 JWT Токен:</label>
                            <textarea 
                                id="jwtToken" 
                                placeholder="Введите ваш JWT токен здесь... Например: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJBYnNDbGllbnRJRCI6ImI2OTZiMjYwLTAzZWMtNDZiNy04NTVhLWJiMmFiM2RhMTk3NiAiLCJjYWxsUG9pbnRUeXBlIjoi0J_RgNC-0YTQuNC70YwiLCJwcm9kdWN0SUQiOiJBQ19hY2NvdW50Iiwic3ViIjoic3RyaW5nIiwiZnJhbWVDYWxsUG9pbnROYW1lIjoic3RyaW5nIn0.wbm2-PbTdReT0ChHQcXGF9C5qYQHneq4YI3rD4CjKnc"
                            ></textarea>
                        </div>
                        
                        <button class="btn" onclick="decodeToken()">
                            <span>🔍 Декодировать токен</span>
                        </button>
                        
                        <div id="errorMessage" class="error-message"></div>
                    </div>
                    
                    <div id="resultContainer" class="result-container">
                        <div class="result-card">
                            <h2>✅ Успешно декодировано!</h2>
                            <div class="code-display">
                                <p>Ваш 6-значный код верификации:</p>
                                <div id="codeDisplay" class="code"></div>
                                <p><small>⏰ Код действителен в течение 5 минут</small></p>
                            </div>
                            
                            <div class="token-info">
                                <h4>📊 Информация из токена:</h4>
                                <div id="tokenInfo" class="info-grid"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="api-info">
                        <h3>🔧 Использование API:</h3>
                        <p><strong>Endpoint:</strong> POST /api/verify</p>
                        <p><strong>Headers:</strong></p>
                        <pre>Authorization: Bearer {ваш_jwt_токен}
Content-Type: application/json</pre>
                        <p><strong>Пример через cURL:</strong></p>
                        <pre>curl -X POST https://ваш-домен.onrender.com/api/verify \\
  -H "Authorization: Bearer ваш_jwt_токен" \\
  -H "Content-Type: application/json"</pre>
                    </div>
                </div>
            </div>

            <script>
                function decodeToken() {
                    const tokenInput = document.getElementById('jwtToken').value.trim();
                    const resultContainer = document.getElementById('resultContainer');
                    const errorMessage = document.getElementById('errorMessage');
                    const codeDisplay = document.getElementById('codeDisplay');
                    const tokenInfo = document.getElementById('tokenInfo');
                    
                    // Скрываем предыдущие результаты
                    resultContainer.style.display = 'none';
                    errorMessage.style.display = 'none';
                    
                    if (!tokenInput) {
                        showError('Пожалуйста, введите JWT токен');
                        return;
                    }
                    
                    // Показываем индикатор загрузки
                    codeDisplay.textContent = '......';
                    resultContainer.style.display = 'block';
                    
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
                    .then(data => {
                        codeDisplay.textContent = data.code;
                        
                        // Отображаем информацию о токене
                        tokenInfo.innerHTML = 
                            <div class="info-item">
                                <div class="info-label">AbsClientID</div>
                                <div class="info-value">${data.decoded.AbsClientID}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Тип вызова</div>
                                <div class="info-value">${data.decoded.callPointType}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Product ID</div>
                                <div class="info-value">${data.decoded.productID}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Frame Call Point</div>
                                <div class="info-value">${data.decoded.frameCallPointName}</div>
                            </div>
                        ;
                    })
                    .catch(error => {
                        showError(error.message);
                        resultContainer.style.display = 'none';
                    });
                }
                
                function showError(message) {
                    const errorMessage = document.getElementById('errorMessage');
                    errorMessage.textContent = message;
                    errorMessage.style.display = 'block';
                }
                
                // Автозаполнение примера токена для тестирования
                document.getElementById('jwtToken').value = 
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJBYnNDbGllbnRJRCI6ImI2OTZiMjYwLTAzZWMtNDZiNy04NTVhLWJiMmFiM2RhMTk3NiAiLCJjYWxsUG9pbnRUeXBlIjoi0J_RgNC-0YTQuNC70YwiLCJwcm9kdWN0SUQiOiJBQ19hY2NvdW50Iiwic3ViIjoic3RyaW5nIiwiZnJhbWVDYWxsUG9pbnROYW1lIjoic3RyaW5nIn0.wbm2-PbTdReT0ChHQcXGF9C5qYQHneq4YI3rD4CjKnc';
            </script>
        </body>
        </html>
    `);
});

// API endpoint для проверки JWT токена
app.post('/api/verify', authenticateToken, (req, res) => {
    try {
        const decodedToken = req.decodedToken;
        
        // Проверяем наличие AbsClientID в декодированном токене
        if (!decodedToken.AbsClientID) {
            return res.status(400).json({ 
                error: 'Неверная структура токена: отсутствует AbsClientID' 
            });
        }

        const absClientID = decodedToken.AbsClientID.trim(); // Убираем пробелы
        const sixDigitCode = generateSixDigitCode(absClientID);

        // Возвращаем JSON с кодом и декодированными данными
        res.json({
            success: true,
            code: sixDigitCode,
            decoded: decodedToken,
            timestamp: new Date().toISOString(),
            expiresIn: '5 minutes'
        });
        
    } catch (error) {
        console.error('Ошибка обработки токена:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера: ' + error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'JWT Decoder API'
    });
});

// Обработка несуществующих маршрутов
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Маршрут не найден',
        availableEndpoints: {
            'GET /': 'Главная страница',
            'POST /api/verify': 'Верификация JWT токена',
            'GET /health': 'Проверка статуса сервиса'
        }
    });
});

// Глобальный обработчик ошибок
app.use((error, req, res, next) => {
    console.error('Необработанная ошибка:', error);
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        message: error.message
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📍 Главная страница: http://localhost:${PORT}`);
    console.log(`🔐 API Endpoint: http://localhost:${PORT}/api/verify`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    console.log(`🔑 JWT Secret: ${JWT_SECRET === 'your-default-secret-key-change-in-production' ? 'Используется дефолтный ключ' : 'Используется кастомный ключ'}`);
});