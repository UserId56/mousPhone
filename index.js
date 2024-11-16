const WebSocket = require('ws');
const robot = require("robotjs");
const https = require("https");
const fs = require("fs");
const path = require("path");

const HOST = "0.0.0.0"; // Доступ по любому IP
const HTTP_PORT = 3000;
const WSS_PORT = 8080;
const screenSize = robot.getScreenSize();
const screenWidth = screenSize.width;
console.log(screenWidth)
const screenHeight = screenSize.height;
console.log(screenHeight)
let sensitivity = 0.5;
console.log("Размер экрана:");
console.log("Высота: " + screenSize.height);
console.log("Ширина: " + screenSize.width);
let SyncX = 50, SyncY = 50, SyncZ = 50, Sync = false

// Чтение SSL сертификата и ключа
const options = {
    key: fs.readFileSync('private-key.pem'),
    cert: fs.readFileSync('cert.pem')
};

// Путь к файлу index.html
const filePath = path.join(__dirname, "index.html");

// Создаем HTTPS сервер для раздачи HTML страницы
const serverHTTPS = https.createServer(options, (req, res) => {
    if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        fs.readFile(filePath, "utf8", (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end("Ошибка сервера");
            } else {
                res.end(data);
            }
        });
    } else {
        res.writeHead(404);
        res.end("Страница не найдена");
    }
});

// Запуск HTTPS сервера
serverHTTPS.listen(HTTP_PORT, HOST, () => {
    console.log(`HTTPS сервер запущен на https://${HOST}:${HTTP_PORT}`);
});

// Создаем WebSocket сервер с использованием HTTPS сервера
const wss = new WebSocket.Server({ server: serverHTTPS });

wss.on('connection', (socket) => {
    console.log('Новое WebSocket подключение (WSS)');

    socket.on('message', (message) => {
        let data = JSON.parse(message);

        switch (data.type) {
            case 'move':
                // let mouse = robot.getMousePos();
                // Вычисляем новые координаты мыши
                // const MousX = mouse.x + ()
                data.x = parseFloat(data.x);
                data.y = parseFloat(data.y);
                data.x = (data.y <= SyncY) ? data.x * -1 : data.x
                // let CofY = (data.y <= SyncY) ? data.y * 2.25 : data.y
                let CofY = data.y - SyncY
                // console.log('cofY ', CofY)
                const mouseX = Math.min(
                    Math.max(screenWidth / 2 + (data.x / 20) * (screenWidth / 2) * sensitivity, 0),
                    screenWidth
                );
                const mouseY = Math.min(
                    Math.max(screenHeight / 2 - (CofY / 10) * (screenHeight / 2) * sensitivity, 0),
                    screenHeight
                );

                // Перемещаем мышь
                if (Sync) {
                    robot.moveMouseSmooth(mouseX, mouseY, sensitivity);
                }
                console.log(`Получено сообщение: ${message}`);
                break;
            case 'click':
                robot.mouseToggle(data.event, data.button)
                // robot.mouseToggle("down" | "up", "left" | "right")
                break;
            case 'sync':
                robot.moveMouse(screenWidth / 2, screenHeight / 2)
                Sync = true;
                SyncX = parseFloat(data.x);
                SyncZ = parseFloat(data.z);
                SyncY = parseFloat(data.y);
                console.log(SyncX, SyncZ, SyncY);
                break;
            case 'disconnect':
                Sync = false;
                break;
            case 'speed':
                sensitivity = data.value
                break;
            case 'test':
                // console.log(`Получено сообщение: ${message}`);
                break;
            default:
                break;
        }


        // socket.send('Привет от сервера через WSS!');
    });

    socket.on('close', () => {
        console.log('Подключение WebSocket закрыто');
    });
});

// Пример использования robotjs (перемещение мыши через 5 секунд)
// setTimeout(() => {
//     robot.moveMouseSmooth(0, 0, 1);
// }, 5000);

console.log(`WebSocket сервер (WSS) слушает соединения на порту ${HTTP_PORT}`);
