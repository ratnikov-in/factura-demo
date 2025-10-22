const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware для проверки JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    try {
      // Декодируем заголовок без проверки подписи
      const decodedHeader = jwt.decode(token, { complete: true, json: true }).header;

      let decoded;
      if (decodedHeader.alg === 'RS256' && decodedHeader.x5c) {
        // Извлекаем x5c и создаем публичный ключ
        const x5c = decodedHeader.x5c[0];
        const cert = `-----BEGIN CERTIFICATE-----\n${x5c}\n-----END CERTIFICATE-----`;
        const publicKey = crypto.createPublicKey(cert);
        decoded = jwt.verify(token, publicKey);
      }  else {
        return res.status(403).send("Not valid certificate");
      }

      req.user = decoded;
      next();
    } catch (err) {
      console.error('JWT verification failed:', err);
      return res.status(403).send(err);
    }
  } else {
    res.sendStatus(401);
  }
};

// Генерация 6-значного кода из AbsClientID
function generateSixDigitCode(clientId) {
  const hash = crypto.createHash('sha256').update(clientId).digest('hex');
  const numericHash = parseInt(hash.substring(0, 8), 16);
  return (numericHash % 1000000).toString().padStart(6, '0');
}

// API endpoint для получения ссылки
app.get('/api/get-link', authenticateJWT, (req, res) => {
  try {
    const clientId = req.user.absClientID.trim();
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const link = `${baseUrl}/code?clientId=${encodeURIComponent(clientId)}`;

    res.json({ 
      url: link 
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
            }
            .code { 
                font-size: 3rem; 
                font-weight: bold; 
                color: #333; 
                letter-spacing: 0.5rem;
                margin: 1rem 0;
            }
            .label {
                color: #666;
                font-size: 1.2rem;
            }
        </style>
    </head>
    <body>
        <div class="code-container">
            <div class="label">Ваш код авторизации:</div>
            <div class="label">Ваш код приведи друга:</div>
            <div class="code">${code}</div>
            <div style="color: #999; font-size: 0.9rem;">Код действителен в течение 10 минут</div>
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
            code { 
                background: #f4f4f4; 
                padding: 0.5rem; 
                border-radius: 3px; 
                display: block; 
                overflow-x: auto;
                margin: 1rem 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>JWT Code Generator API</h1>
            <p>Используйте endpoint <strong>/api/get-link</strong> с JWT токеном в заголовке Authorization</p>
            <p>Пример использования:</p>
            <code>
curl -H "Authorization: Bearer your.jwt.token.here" https://your-app.onrender.com/api/get-link
            </code>
            <p>Формат JWT токена должен содержать поле <strong>absClientID</strong> в payload</p>
        </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})