const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Функция для генерации 6-значного кода из AbsClientID
function generateSixDigitCode(clientId) {
    // Удаляем пробелы и дефисы
    const cleanId = clientId.replace(/[-\s]/g, '');
    
    // Создаем хеш используя простой алгоритм
    let hash = 0;
    for (let i = 0; i < cleanId.length; i++) {
        const char = cleanId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Преобразовываем в 32-битное целое число
    }

    // Берем абсолютное значение и последние 6 цифр
    return Math.abs(hash % 1000000).toString().padStart(6, '0');
}

// API endpoint
app.post('/api/verify', (req, res) => {
    try {
        const token = req.body;
        
        // Проверяем структуру токена
        if (!token.payload || !token.payload.AbsClientID) {
            return res.status(400).json({ error: 'Invalid token structure' });
        }

        const absClientID = token.payload.AbsClientID;
        const sixDigitCode = generateSixDigitCode(absClientID);

        // Отправляем HTML страницу с кодом
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Verification Code</title>
                <meta charset="utf-8">
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        height: 100vh; 
                        margin: 0; 
                        background-color: #f0f0f0;
                    }
                    .code-container {
                        background: white;
                        padding: 2rem;
                        border-radius: 10px;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                        text-align: center;
                    }
                    .code {
                        font-size: 2rem;
                        font-weight: bold;
                        color: #333;
                        letter-spacing: 0.5rem;
                        margin: 1rem 0;
                    }
                </style>
            </head>
            <body>
                <div class="code-container">
                    <h2>Ваш код верификации:</h2>
                    <div class="code">${sixDigitCode}</div>
                    <p>Код действителен в течение 5 минут</p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Старт сервера
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});