const WebSocket = require("ws");
const fs = require("fs");


// Load questions from a JSON file
const questions = JSON.parse(fs.readFileSync("questions.json", "utf8"));

const PORT = process.env.PORT || 5000;

// Create the HTTP server
const server = require('http').createServer();
const wss = new WebSocket.Server({ server });

let players = {}; // Store connected players
let waitingPlayers = []; // Queue for waiting players
let games = {}; // Active games with player pairs
let positions = {}; // Player positions per game

console.log("Server started. Waiting for players...");

wss.on("connection", (ws) => {
    waitingPlayers.push(ws);

    if (waitingPlayers.length % 2 === 0) {
        startGame();
    }

    ws.on("message", (message) => {
        const data = JSON.parse(message);

        // Find the game this player is in
        let gameId = findGameId(ws);

        if (!gameId) return;

        if (data.type === "answer") {
            let playerId = getPlayerId(gameId, ws);
            let timeLeft = data.timeLeft;

            if (!games[gameId].questions[playerId] || games[gameId].questions[playerId].length === 0) {
                ws.send(JSON.stringify({ type: "error", message: "No more questions available." }));
                return;
            }

            let correctAnswer = games[gameId].questions[playerId][0].correct;

            if (data.answer === correctAnswer) {
                positions[gameId][playerId] += timeLeft; // Move based on time left
            }

            if (positions[gameId][playerId] >= 100) {
                broadcast(gameId, { type: "winner", player: playerId });
                endGame(gameId);
            } else {
                broadcast(gameId, { type: "update", positions: positions[gameId] });

                // Send next question
                games[gameId].questions[playerId].shift();
                if (games[gameId].questions[playerId].length > 0) {
                    ws.send(JSON.stringify({ type: "question", question: games[gameId].questions[playerId][0] }));
                }
            }
        }

        if (data.type === "request_positions") {
            if (positions[gameId]) {
                ws.send(JSON.stringify({ type: "update", positions: positions[gameId] }));
            }
        }
    });

    ws.on("close", () => {
        let gameId = findGameId(ws);

        if (gameId) {
            endGame(gameId);
        } else {
            waitingPlayers = waitingPlayers.filter((player) => player !== ws);
        }
        console.log("Player disconnected.");
    });
});

function startGame() {
    const player1 = waitingPlayers.shift();
    const player2 = waitingPlayers.shift();
    const gameId = `game_${Date.now()}`;

    games[gameId] = {
        players: { 1: player1, 2: player2 },
        questions: {
            1: [...questions].sort(() => Math.random() - 0.5),
            2: [...questions].sort(() => Math.random() - 0.5),
        },
    };

    positions[gameId] = { 1: 1, 2: 1 };

    console.log(`Starting ${gameId} with Player 1 and Player 2`);

    player1.send(JSON.stringify({ type: "player_id", id: 1 }));
    player2.send(JSON.stringify({ type: "player_id", id: 2 }));

    player1.send(JSON.stringify({ type: "question", question: games[gameId].questions[1][0] }));
    player2.send(JSON.stringify({ type: "question", question: games[gameId].questions[2][0] }));

    broadcast(gameId, { type: "update", positions: positions[gameId] });
}

function broadcast(gameId, data) {
    Object.values(games[gameId].players).forEach((player) => {
        player.send(JSON.stringify(data));
    });
}

function findGameId(ws) {
    for (let gameId in games) {
        if (Object.values(games[gameId].players).includes(ws)) {
            return gameId;
        }
    }
    return null;
}

function getPlayerId(gameId, ws) {
    return Object.keys(games[gameId].players).find(
        (id) => games[gameId].players[id] === ws
    );
}

function endGame(gameId) {
    console.log(`${gameId} ended.`);
    Object.values(games[gameId].players).forEach((player) => {
        player.send(JSON.stringify({ type: "game_end", message: "Game over!" }));
        player.close();
    });

    delete games[gameId];
    delete positions[gameId];
}
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});