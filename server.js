const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Секретный ключ для проверки JWT (должен совпадать с ключом подписи)
const JWT_SECRET = 'your-secret-key-here';

// Хранилище для связи кодов и AbsClientID (в реальном приложении используйте БД)
const codeStorage = new Map();
const CODE_EXPIRY_TIME = 10 * 60 * 1000; // 10 минут

// Middleware для проверки JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.sendStatus(403);
    }
  } else {
    res.sendStatus(401);
  }
};

// Генерация 6-значного кода из AbsClientID
function generateSixDigitCode(clientId) {
  const hash = crypto.createHash('sha256').update(clientId).digest('hex');
  const numericHash = parseInt(hash.substring(0, 8), 16);
  const code = (numericHash % 1000000).toString().padStart(6, '0');
  
  // Сохраняем связь кода с clientId
  codeStorage.set(code, {
    clientId: clientId,
    timestamp: Date.now()
  });
  
  return code;
}

// Получение AbsClientID по коду
function getClientIdByCode(code) {
  const storedData = codeStorage.get(code);
  
  if (!storedData) {
    return null;
  }
  
  // Проверяем не истек ли срок действия кода
  if (Date.now() - storedData.timestamp > CODE_EXPIRY_TIME) {
    codeStorage.delete(code); // Удаляем просроченный код
    return null;
  }
  
  return storedData.clientId;
}

// Очистка просроченных кодов каждые 5 минут
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of codeStorage.entries()) {
    if (now - data.timestamp > CODE_EXPIRY_TIME) {
      codeStorage.delete(code);
    }
  }
  console.log(`Cleaned expired codes. Current storage size: ${codeStorage.size}`);
}, 60 * 60 * 1000);

app.use(express.json());

// API endpoint для получения ссылки
app.get('/api/get-link', authenticateJWT, (req, res) => {
  try {
    const clientId = req.user.absClientID.trim();
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const link = `${baseUrl}/code?clientId=${encodeURIComponent(clientId)}`;
    
    res.json({ 
      success: true,
      link: link 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Новый API endpoint для получения AbsClientID по коду
app.post('/api/get-clientid', (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid code format. Must be 6 digits.'
      });
    }
    
    const clientId = getClientIdByCode(code);
    
    if (!clientId) {
      return res.status(404).json({
        success: false,
        error: 'Code not found or expired'
      });
    }
    
    res.json({
      success: true,
      clientId: clientId
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Альтернативный GET endpoint для получения AbsClientID
app.get('/api/get-clientid/:code', (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid code format. Must be 6 digits.'
      });
    }
    
    const clientId = getClientIdByCode(code);
    
    if (!clientId) {
      return res.status(404).json({
        success: false,
        error: 'Code not found or expired'
      });
    }
    
    res.json({
      success: true,
      clientId: clientId
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Страница с 6-значным кодом
app.get('/code', (req, res) => {
  const clientId = req.query.clientId;
  
  if (!clientId) {
    return res.status(400).send('Missing clientId parameter');
  }

  const code = generateSixDigitCode(clientId);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Authorization Code</title>
        <meta charset="utf-8">
        <style>
            body { 
                font-family: Arial, sans-serif; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0; 
                background-color: #f5f5f5;
            }
            .code-container { 
                text-align: center; 
                padding: 2rem; 
                background: white; 
                border-radius: 10px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 500px;
                width: 90%;
            }
            .code { 
                font-size: 3rem; 
                font-weight: bold; 
                color: #333; 
                letter-spacing: 0.5rem;
                margin: 1rem 0;
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 5px;
                border: 2px dashed #dee2e6;
            }
            .label {
                color: #666;
                font-size: 1.2rem;
                margin-bottom: 1rem;
            }
            .api-info {
                margin-top: 2rem;
                padding: 1rem;
                background: #e9ecef;
                border-radius: 5px;
                text-align: left;
            }
            .api-info h3 {
                margin-top: 0;
                color: #495057;
            }
            code {
                background: #495057;
                color: white;
                padding: 0.5rem;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
                display: block;
                overflow-x: auto;
                margin: 0.5rem 0;
            }
        </style>
    </head>
    <body>
        <div class="code-container">
            <div class="label">Ваш код "Пригласи друга":</div>
            <div class="code">${code}</div>
            <div style="color: #999; font-size: 0.9rem; margin-bottom: 1rem;">
                Код действителен в течение 10 минут
            </div>
        </div>
    </body>
    </html>
  `);
});

// Корневая страница
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>JWT Code Generator</title>
        <meta charset="utf-8">
        <style>
            body { 
                font-family: Arial, sans-serif; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 2rem; 
                background-color: #f5f5f5;
            }
            .container { 
                background: white; 
                padding: 2rem; 
                border-radius: 10px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .endpoint {
                background: #f8f9fa;
                padding: 1.5rem;
                margin: 1rem 0;
                border-radius: 5px;
                border-left: 4px solid #007bff;
            }
            .endpoint h3 {
                margin-top: 0;
                color: #007bff;
            }
            code { 
                background: #495057; 
                color: white;
                padding: 0.5rem; 
                border-radius: 3px; 
                display: block; 
                overflow-x: auto;
                margin: 0.5rem 0;
                font-family: 'Courier New', monospace;
            }
            .method {
                display: inline-block;
                background: #28a745;
                color: white;
                padding: 0.25rem 0.5rem;
                border-radius: 3px;
                font-weight: bold;
                margin-right: 0.5rem;
            }
            .method.get { background: #28a745; }
            .method.post { background: #007bff; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>JWT Code Generator API</h1>
            
            <div class="endpoint">
                <h3><span class="method get">GET</span> /api/get-link</h3>
                <p>Получить ссылку с кодом авторизации (требуется JWT токен)</p>
                <code>
curl -H "Authorization: Bearer your.jwt.token.here" https://factura-demo.onrender.com/api/get-link
                </code>
            </div>
            
            <div class="endpoint">
                <h3><span class="method post">POST</span> /api/get-clientid</h3>
                <p>Получить AbsClientID по 6-значному коду</p>
                <code>
curl -X POST -H "Content-Type: application/json" -d '{"code":"123456"}' https://factura-demo.onrender.com/api/get-clientid
                </code>
            </div>
            
            <div class="endpoint">
                <h3><span class="method get">GET</span> /api/get-clientid/:code</h3>
                <p>Получить AbsClientID по 6-значному коду (GET вариант)</p>
                <code>
curl https://factura-demo.com/api/get-clientid/123456
                </code>
            </div>
            
            <p>Формат JWT токена должен содержать поле <strong>AbsClientID</strong> в payload</p>
        </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Code storage cleanup interval: 5 minutes`);
});