const http = require("http");
const express = require("express");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const MAX_PLAYERS = 2;
const QUESTIONS_PER_TURN = 3;
const DELAY_BEFORE_QUIZ = 2000; // 2000 milliseconds = 2 seconds

const clients = {};
const games = {};

const questionPool = [
    { id: "q1", question: "What is the largest land animal?", answer: "elephant" },
    { id: "q2", question: "Which bird is known for its beautiful tail feathers?", answer: "peacock" },
    { id: "q3", question: "What is the fastest animal on land?", answer: "cheetah" },
    { id: "q4", question: "What do bees primarily collect from flowers?", answer: "nectar" },
    { id: "q5", question: "Which planet is known as the Red Planet?", answer: "mars" },
    { id: "q6", question: "What is the main ingredient in guacamole?", answer: "avocado" },
    { id: "q7", question: "How many continents are there?", answer: "7" },
    { id: "q8", question: "What is the capital of Japan?", answer: "tokyo" },
    { id: "q9", question: "Which mammal can fly?", answer: "bat" }
];

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

wss.on("connection", (ws) => {
    const clientId = guid();
    clients[clientId] = { connection: ws };
    console.log(`Client connected: ${clientId}`);

    const connectPayload = { method: "connect", clientId: clientId };
    ws.send(JSON.stringify(connectPayload));

    ws.on("message", (message) => {
        console.log(`Received from client ${clientId}: ${message}`);
        const data = JSON.parse(message);

        if (data.method === "find_game") {
            let availableGame = Object.values(games).find(game => game.clients.length < MAX_PLAYERS && !game.state.status);
            if (availableGame) {
                console.log(`Game ${availableGame.id} found, adding player ${clientId}.`);
                const player = 'p' + (availableGame.clients.length + 1);
                availableGame.clients.push({ clientId: clientId, player: player });
                const joinPayload = { method: "join", gameId: availableGame.id, player: player };
                clients[clientId].connection.send(JSON.stringify(joinPayload));
                if (availableGame.clients.length === MAX_PLAYERS) {
                    console.log(`Game ${availableGame.id} is full. Starting game.`);
                    startGame(availableGame.id);
                }
            } else {
                const gameId = guid();
                console.log(`No available games. Creating new game ${gameId} for player ${clientId}.`);
                games[gameId] = {
                    id: gameId,
                    clients: [{ clientId: clientId, player: "p1" }],
                    state: {},
                };
                const joinPayload = { method: "join", gameId: gameId, player: "p1" };
                clients[clientId].connection.send(JSON.stringify(joinPayload));
            }
        }

        // --- CORRECTED 'play' METHOD WITH DELAY ---
        if (data.method === "play") {
            const { gameId, clientId } = data;
            const game = games[gameId];
            if (!game || game.state.status !== 'playing') return;
            const movingPlayer = game.clients.find(c => c.clientId === clientId);
            const currentPlayer = game.clients[game.state.currentPlayerIndex];
            if (!movingPlayer || !currentPlayer || movingPlayer.player !== currentPlayer.player) return;

            const diceRoll = Math.floor(Math.random() * 6) + 1;
            game.state[currentPlayer.player].steps += diceRoll;
            game.state.lastDiceRoll = { player: currentPlayer.player, roll: diceRoll };
            
            // 1. First, send an update to EVERYONE so they see the move.
            game.state.lastEvent = `Player ${currentPlayer.player.toUpperCase()} rolled a ${diceRoll}.`;
            broadcastUpdate(gameId);

            // 2. After a delay, start the quiz for the current player.
            setTimeout(() => {
                // Check if the game still exists (a player might have disconnected during the delay)
                if (!games[gameId]) return;

                const questionSet = shuffleArray([...questionPool]).slice(0, QUESTIONS_PER_TURN);
                game.state.status = 'answering_question';
                game.state.playerAnswering = currentPlayer.player;
                game.state.currentQuestionSet = questionSet;
                game.state.currentQuestionIndex = 0;
                
                const firstQuestion = game.state.currentQuestionSet[0];
                const askPayload = {
                    method: "ask_question",
                    question: firstQuestion.question,
                    playerAnswering: game.state.playerAnswering,
                    gameId: game.id,
                    questionNumber: 1,
                    totalQuestions: QUESTIONS_PER_TURN
                };

                // Send the question only to the player whose turn it is
                if(clients[clientId]) {
                    clients[clientId].connection.send(JSON.stringify(askPayload));
                }

                // Also update the event text for the other players to see
                game.state.lastEvent = `Player ${currentPlayer.player.toUpperCase()} is starting a quiz...`;
                broadcastUpdate(gameId);

            }, DELAY_BEFORE_QUIZ);
        }
        
        if (data.method === "submit_answer") {
            const { gameId, clientId, answer } = data;
            const game = games[gameId];
            if (!game || game.state.status !== 'answering_question') return;
            const clientPlayer = game.clients.find(c => c.clientId === clientId);
            if (clientPlayer && clientPlayer.player === game.state.playerAnswering) {
                const qIndex = game.state.currentQuestionIndex;
                const currentQuestion = game.state.currentQuestionSet[qIndex];
                const isCorrect = answer.toLowerCase().trim() === currentQuestion.answer.toLowerCase();
                game.state.answeredQuestions.push({
                    player: clientPlayer.player,
                    question: currentQuestion.question,
                    providedAnswer: answer,
                    correctAnswer: currentQuestion.answer,
                    wasCorrect: isCorrect
                });
                if (qIndex < game.state.currentQuestionSet.length - 1) {
                    game.state.currentQuestionIndex++;
                    const nextQuestion = game.state.currentQuestionSet[game.state.currentQuestionIndex];
                    const askPayload = {
                        method: "ask_question",
                        question: nextQuestion.question,
                        playerAnswering: game.state.playerAnswering,
                        gameId: game.id,
                        questionNumber: game.state.currentQuestionIndex + 1,
                        totalQuestions: QUESTIONS_PER_TURN
                    };
                    clients[clientId].connection.send(JSON.stringify(askPayload));
                } else {
                    game.state.lastEvent = `Player ${clientPlayer.player.toUpperCase()} finished the quiz!`;
                    game.state.status = 'playing';
                    game.state.playerAnswering = null;
                    game.state.currentQuestionSet = null;
                    game.state.currentQuestionIndex = null;
                    game.state.currentPlayerIndex = (game.state.currentPlayerIndex + 1) % game.clients.length;
                    broadcastUpdate(gameId);
                }
            }
        }
    });

    ws.on("close", () => {
        console.log(`Client disconnected: ${clientId}`);
        let gameToEnd = null;
        let gameIdToEnd = null;

        for (const gameId in games) {
            const game = games[gameId];
            const clientIndex = game.clients.findIndex(c => c.clientId === clientId);
            if (clientIndex !== -1) {
                gameToEnd = game;
                gameIdToEnd = gameId;
                break;
            }
        }

        if (gameToEnd) {
            console.log(`Player left game ${gameIdToEnd}. Ending game for all participants.`);
            
            const gameOverPayload = {
                method: "game_over",
                results: gameToEnd.state.answeredQuestions || []
            };

            gameToEnd.clients.forEach(client => {
                if (client.clientId !== clientId && clients[client.clientId]) {
                    clients[client.clientId].connection.send(JSON.stringify(gameOverPayload));
                }
            });

            delete games[gameIdToEnd];
        }

        delete clients[clientId];
    });
});

function startGame(gameId) {
    const game = games[gameId];
    if (!game) return;
    game.state = {
        status: 'playing',
        currentPlayerIndex: 0,
        lastDiceRoll: null,
        lastEvent: "The game has begun!",
        playerAnswering: null,
        currentQuestionSet: null,
        currentQuestionIndex: null,
        answeredQuestions: []
    };
    game.clients.forEach(client => {
        game.state[client.player] = { steps: 0 };
    });
    const startPayload = { method: "start", game: game };
    game.clients.forEach((client) => {
        clients[client.clientId].connection.send(JSON.stringify(startPayload));
    });
}

function broadcastUpdate(gameId) {
    const game = games[gameId];
    if (!game) return;
    const updatePayload = { method: "update", game: game };
    game.clients.forEach((client) => {
        if(clients[client.clientId]) {
            clients[client.clientId].connection.send(JSON.stringify(updatePayload));
        }
    });
}

function guid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

server.listen(9090, () => {
    console.log("Game Server is listening on port 9090");
});