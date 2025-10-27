const http = require("http");
const express = require("express");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const MAX_PLAYERS = 2;
const DELAY_BEFORE_QUIZ = 2000; // 2 seconds

const clients = {};
const games = {};

// --- MASTER QUESTION DATABASE ---
const allQuestions = {
    // --- JUNGLE PROFESSOR QUESTIONS ---
    'j_lion': { id: "j_lion", question: "This is a Lion. What is a group of lions called?", answer: "pride" },
    'j_rhino': { id: "j_rhino", question: "This is a Rhinoceros. What is its horn made of?", answer: "keratin" },
    'j_cheetah': { id: "j_cheetah", question: "This is a Cheetah. True or False: It is the fastest land animal.", answer: "true" },
    'j_elephant': { id: "j_elephant", question: "This is an Elephant. What is a baby elephant called?", answer: "calf" },
    'j_tiger': { id: "j_tiger", question: "This is a Tiger. Which is the largest tiger subspecies?", answer: "siberian" },
    'j_leopard': { id: "j_leopard", question: "This is a Leopard. Are its spots hollow rings (rosettes) or solid dots?", answer: "rosettes" },
    'j_jaguar': { id: "j_jaguar", question: "This is a Jaguar. On which two continents are jaguars naturally found?", answer: "america" },
    'j_buffalo': { id: "j_buffalo", question: "This is a Cape Buffalo. On which continent are they primarily found?", answer: "africa" },
    'j_oryx': { id: "j_oryx", question: "This is an Oryx. This antelope is adapted to live in what kind of environment?", answer: "desert" },
    'j_deer': { id: "j_deer", question: "This is a Deer. What are the bony growths on a male deer's head called?", answer: "antlers" },
    'j_snake': { id: "j_snake", question: "This is a Green Tree Python. Are they venomous?", answer: "no" },
    'j_turtle': { id: "j_turtle", question: "This is a Tortoise. Do tortoises typically live on land or in water?", answer: "land" },
    'j_ostrich': { id: "j_ostrich", question: "This is an Ostrich. It is the world's largest what?", answer: "bird" },
    'j_gorilla': { id: "j_gorilla", question: "This is a Gorilla. What is a group of gorillas called?", answer: "troop" },
    'j_eagle': { id: "j_eagle", question: "This is a Bald Eagle. It is the national bird of which country?", answer: "usa" },
    'j_chimp': { id: "j_chimp", question: "This is a Chimpanzee. Are they considered great apes?", answer: "yes" },
    'j_lemur': { id: "j_lemur", question: "This is a Lemur. To which island country are they native?", answer: "madagascar" },
    'j_giraffe': { id: "j_giraffe", question: "This is a Giraffe. What is the name for the horn-like bumps on its head?", answer: "ossicones" },
    'j_heron': { id: "j_heron", question: "This is a Heron. Do these birds typically hunt in groups or alone?", answer: "alone" },
    'j_toucan': { id: "j_toucan", question: "This is a Toucan (blank square). Is its large bill heavy or lightweight?", answer: "lightweight" },
    'j_macaw': { id: "j_macaw", question: "This is a Macaw (blank square). Are these parrots known for their intelligence?", answer: "yes" },
    'j_hippo': { id: "j_hippo", question: "This is a Hippopotamus. Do they spend most of their day in water or on land?", answer: "water" },
    'j_warthog': { id: "j_warthog", question: "This is a Warthog (blank square). What is its main defense mechanism?", answer: "tusks" },
    'j_hyena': { id: "j_hyena", question: "This is a Hyena. Is a hyena more closely related to a cat or a dog?", answer: "cat" },
    'j_crocodile': { id: "j_crocodile", question: "This is a Crocodile (blank square). Do they have a V-shaped or U-shaped snout?", answer: "v-shaped" },
    'j_komodo': { id: "j_komodo", question: "This is a Komodo Dragon (blank square). It is the world's largest what?", answer: "lizard" },
    'j_camel': { id: "j_camel", question: "This is a Camel. What is stored in its hump(s)?", answer: "fat" },
    'j_impala': { id: "j_impala", question: "This is an Impala. Are they known for their impressive jumping ability?", answer: "yes" },
    'j_python': { id: "j_python", question: "This is a Python. How do pythons kill their prey?", answer: "constriction" },
    'j_peacock': { id: "j_peacock", question: "This is a Peacock. Are the colorful tail feathers found on the male or female?", answer: "male" },

    // --- CITY TOUR QUESTIONS ---
    'c_moscow': { id: "c_moscow", question: "This is St. Basil's Cathedral. In which Russian city is it located?", answer: "moscow" },
    'c_giza': { id: "c_giza", question: "These are the Pyramids of Giza. In which country are they located?", answer: "egypt" },
    'c_sydney': { id: "c_sydney", question: "This is the Sydney Opera House. In which country is it located?", answer: "australia" },
    'c_rome': { id: "c_rome", question: "This is the Colosseum. In which Italian city would you find it?", answer: "rome" },
    'c_petra': { id: "c_petra", question: "This is Petra. In which country is this ancient city carved from rock?", answer: "jordan" },
    'c_hollywood': { id: "c_hollywood", question: "This is the Hollywood Sign. In which US state is it located?", answer: "california" },
    'c_liberty': { id: "c_liberty", question: "This is the Statue of Liberty. In which US city is it located?", answer: "new york" },
    'c_paris': { id: "c_paris", question: "This is the Eiffel Tower. In which country is it the most-visited monument?", answer: "france" },
    'c_brussels': { id: "c_brussels", question: "This is the Atomium. In which Belgian city was it built for the 1958 World's Fair?", answer: "brussels" },
    'c_rio': { id: "c_rio", question: "This is Christ the Redeemer. Which Brazilian city does it overlook?", answer: "rio de janeiro" },
    'c_washington': { id: "c_washington", question: "This is the White House. It is the official residence of the president of which country?", answer: "usa" },
    'c_rushmore': { id: "c_rushmore", question: "This is Mount Rushmore. Which US state is it in?", answer: "south dakota" },
    'c_london': { id: "c_london", question: "This is Tower Bridge. In which UK city is it located?", answer: "london" },
    'c_dubai': { id: "c_dubai", question: "This is the Burj Al Arab hotel. In which city in the UAE is it located?", answer: "dubai" },
    'c_beijing': { id: "c_beijing", question: "This is the Forbidden City. In which Chinese city is it located?", answer: "beijing" },
    'c_tajmahal': { id: "c_tajmahal", question: "This is the Taj Mahal. In which country is this famous mausoleum?", answer: "india" },
    'c_toronto': { id: "c_toronto", question: "This is the CN Tower. In which Canadian city is it located?", answer: "toronto" },
    'c_machu': { id: "c_machu", question: "This is Machu Picchu. In which South American country is it located?", answer: "peru" },
    'c_pisa': { id: "c_pisa", question: "This is the Leaning Tower of Pisa. In which country is it located?", answer: "italy" },
    'c_acropolis': { id: "c_acropolis", question: "This is the Acropolis. In which Greek city is it located?", answer: "athens" },
    'c_brandenburg': { id: "c_brandenburg", question: "This is the Brandenburg Gate. In which German city is it a famous landmark?", answer: "berlin" },
    'c_wall': { id: "c_wall", question: "This is the Great Wall. Which country is it in?", answer: "china" },
    'c_seattle': { id: "c_seattle", question: "This is the Space Needle. In which US city is it located?", answer: "seattle" },
};

// --- GAME BOARD MAP ---
// Maps every outer square to a question ID for each game type.
const questionPositions = {
    // Bottom Row (Left to Right, 6 squares)
    1: { jungle: 'j_lion', city: 'c_moscow' },
    2: { jungle: 'j_rhino', city: 'c_giza' },
    3: { jungle: 'j_cheetah', city: 'c_sydney' },
    4: { jungle: 'j_elephant', city: 'c_rome' },
    5: { jungle: 'j_tiger', city: 'c_petra' },
    6: { jungle: 'j_leopard', city: 'c_hollywood' },

    // Left Side (Bottom to Top, 5 squares)
    7: { jungle: 'j_buffalo', city: 'c_pisa' },
    8: { jungle: 'j_snake', city: 'c_paris' },
    9: { jungle: 'j_turtle', city: 'c_washington' },
    10: { jungle: 'j_ostrich', city: 'c_brussels' },
    11: { jungle: 'j_macaw', city: 'c_rushmore' },

    // Top Row (Left to Right, 6 squares)
    12: { jungle: 'j_crocodile', city: 'c_toronto' },
    13: { jungle: 'j_giraffe', city: 'c_tajmahal' },
    14: { jungle: 'j_jaguar', city: 'c_wall' },
    15: { jungle: 'j_hyena', city: 'c_beijing' },
    16: { jungle: 'j_warthog', city: 'c_seattle' },
    17: { jungle: 'j_komodo', city: 'c_dubai' },

    // Right Side (Top to Bottom, 5 squares)
    18: { jungle: 'j_oryx', city: 'c_acropolis' },
    19: { jungle: 'j_gorilla', city: 'c_london' },
    20: { jungle: 'j_eagle', city: 'c_brandenburg' },
    21: { jungle: 'j_chimp', city: 'c_machu' },
    22: { jungle: 'j_heron', city: 'c_liberty' },

    // --- INNER PATH ---
    // (You have 12 squares on the inner path, total 34 per board)
    23: { jungle: 'j_deer', city: 'c_rio' },
    24: { jungle: 'j_camel', city: 'c_sydney' },
    25: { jungle: 'j_impala', city: 'c_petra' },
    26: { jungle: 'j_python', city: 'c_hollywood' },
    27: { jungle: 'j_peacock', city: 'c_pisa' },
    28: { jungle: 'j_toucan', city: 'c_paris' },
    29: { jungle: 'j_hippo', city: 'c_washington' },
    30: { jungle: 'j_lion', city: 'c_brussels' },
    31: { jungle: 'j_rhino', city: 'c_rushmore' },
    32: { jungle: 'j_cheetah', city: 'c_toronto' },
    33: { jungle: 'j_elephant', city: 'c_tajmahal' },
    34: { jungle: 'j_tiger', city: 'c_wall' },
};


// --- GAME ENGINE LOGIC (UNCHANGED) ---

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
            const gameType = data.gameType;
            if (!gameType || (gameType !== 'jungle' && gameType !== 'city')) {
                console.log(`Invalid gameType received: ${gameType}`);
                return;
            }
            
            let availableGame = Object.values(games).find(game => 
                game.gameType === gameType && 
                game.clients.length < MAX_PLAYERS && 
                game.state.status !== 'full'
            );

            if (availableGame) {
                console.log(`Game ${availableGame.id} (${gameType}) found, adding player ${clientId}.`);
                const player = 'p' + (availableGame.clients.length + 1);
                availableGame.clients.push({ clientId: clientId, player: player });
                
                const joinPayload = { method: "join", gameId: availableGame.id, player: player };
                clients[clientId].connection.send(JSON.stringify(joinPayload));
                
                if (availableGame.clients.length === MAX_PLAYERS) {
                    availableGame.state.status = 'full';
                    console.log(`Game ${availableGame.id} is full. Starting game.`);
                    startGame(availableGame.id);
                }
            } else {
                console.log(`No available ${gameType} games. Creating new game for player ${clientId}.`);
                const gameId = guid();
                games[gameId] = {
                    id: gameId,
                    gameType: gameType,
                    clients: [{ clientId: clientId, player: "p1" }],
                    state: {},
                };
                const joinPayload = { method: "join", gameId: gameId, player: "p1" };
                clients[clientId].connection.send(JSON.stringify(joinPayload));
            }
        }

        if (data.method === "play") {
            const { gameId, clientId } = data;
            const game = games[gameId];
            if (!game || game.state.status !== 'playing') return;
            const movingPlayer = game.clients.find(c => c.clientId === clientId);
            const currentPlayer = game.clients[game.state.currentPlayerIndex];
            if (!movingPlayer || !currentPlayer || movingPlayer.player !== currentPlayer.player) return;

            const diceRoll = Math.floor(Math.random() * 6) + 1;
            game.state[currentPlayer.player].steps += diceRoll;
            // Use modulo to wrap around the 34 squares
            const newSteps = game.state[currentPlayer.player].steps % 34 === 0 ? 34 : game.state[currentPlayer.player].steps % 34;
            
            game.state.lastDiceRoll = { player: currentPlayer.player, roll: diceRoll };
            game.state.lastEvent = `Player ${currentPlayer.player.toUpperCase()} rolled a ${diceRoll}.`;
            
            broadcastUpdate(gameId);

            const positionData = questionPositions[newSteps];

            if (positionData) {
                setTimeout(() => {
                    if (!games[gameId]) return;

                    const gameType = game.gameType;
                    const questionId = positionData[gameType];
                    const questionData = allQuestions[questionId];

                    if (!questionData) {
                        console.log(`Error: Question ID ${questionId} not found for square ${newSteps}.`);
                        game.state.currentPlayerIndex = (game.state.currentPlayerIndex + 1) % game.clients.length;
                        broadcastUpdate(gameId);
                        return;
                    }

                    game.state.status = 'answering_question';
                    game.state.playerAnswering = currentPlayer.player;
                    game.state.currentQuestion = { id: questionData.id, question: questionData.question };

                    const askPayload = {
                        method: "ask_question",
                        question: questionData.question,
                        playerAnswering: game.state.playerAnswering,
                        gameId: game.id,
                        questionNumber: 1,
                        totalQuestions: 1,
                    };
                    
                    if (clients[clientId]) {
                        clients[clientId].connection.send(JSON.stringify(askPayload));
                    }
                    
                    game.state.lastEvent = `Player ${currentPlayer.player.toUpperCase()} landed on a question square!`;
                    broadcastUpdate(gameId);

                }, DELAY_BEFORE_QUIZ);
            } else {
                game.state.currentPlayerIndex = (game.state.currentPlayerIndex + 1) % game.clients.length;
            }
        }
        
        if (data.method === "submit_answer") {
            const { gameId, clientId, answer } = data;
            const game = games[gameId];
            if (!game || game.state.status !== 'answering_question') return;
            const clientPlayer = game.clients.find(c => c.clientId === clientId);
            if (clientPlayer && clientPlayer.player === game.state.playerAnswering) {
                const currentQuestion = allQuestions[game.state.currentQuestion.id];
                const isCorrect = answer.toLowerCase().trim() === currentQuestion.answer.toLowerCase();

                game.state.answeredQuestions.push({
                    player: clientPlayer.player,
                    question: currentQuestion.question,
                    providedAnswer: answer,
                    correctAnswer: currentQuestion.answer,
                    wasCorrect: isCorrect
                });
                
                if(isCorrect) {
                    game.state.lastEvent = `Player ${clientPlayer.player.toUpperCase()} answered correctly!`;
                } else {
                    game.state.lastEvent = `Player ${clientPlayer.player.toUpperCase()} was incorrect. The answer was: ${currentQuestion.answer}.`;
                }

                game.state.currentPlayerIndex = (game.state.currentPlayerIndex + 1) % game.clients.length;
                game.state.status = 'playing';
                game.state.playerAnswering = null;
                game.state.currentQuestion = null;

                broadcastUpdate(gameId);
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
                results: gameToEnd.state.answeredQuestions || [],
                gameType: gameToEnd.gameType
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
        currentQuestion: null,
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