const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Секретный ключ для проверки JWT
const SECRET_KEY = 'a-string-secret-at-least-256-bits-long';

// Функция для генерации 6-значного кода из UUID
function generateCode(uuid) {
    // Преобразуем UUID в число
    const hash = uuid.split('-').map(part => parseInt(part, 16)).reduce((acc, val) => acc + val, 0);
    // Получаем 6-значное число
    return (hash % 999999).toString().padStart(6, '0');
}

app.post('/api/validate', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ message: 'Токен отсутствует' });
    }

    try {
        // Проверяем JWT
        const decoded = jwt.verify(authHeader, SECRET_KEY);
        
        // Проверяем структуру payload
        if (!decoded.payload || !decoded.payload.AbsClientID) {
            return res.status(400).json({ message: 'Неверный формат payload' });
        }

        // Генерируем код
        const code = generateCode(decoded.payload.AbsClientID);
        
        res.json({ code });

    } catch (error) {
        res.status(401).json({ message: 'Недействительный токен' });
    }
});

app.listen(3000, () => {
    console.log('Сервер запущен на порту 3000');
});
