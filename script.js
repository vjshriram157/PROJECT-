const ws = new WebSocket('wss://quizgame-production-fbc7.up.railway.app');
ws.onopen = function() {
    ws.send(JSON.stringify({ type: "request_positions" }));
};

let playerId;
let playerPositions = {};
let timer;
let timeLeft = 6;

// Mario and Luigi GIFs for pairwise assignment
const playerGifs = {
    mario: 'assets/mario.gif',
    luigi: 'assets/luigi.gif'
};

// Background Music
const bgMusic = document.getElementById("background-music");
bgMusic.volume = 0.5;

// Create the board
const board = document.getElementById("board");
for (let i = 1; i <= 100; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.id = `cell-${i}`;

    const cellNumber = document.createElement("span");
    cellNumber.classList.add("cell-number");
    cellNumber.innerText = i;

    cell.appendChild(cellNumber);
    board.appendChild(cell);
}

// Handle WebSocket messages
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "player_id") {
        playerId = data.id;

        // Pairwise assignment: Odd = Mario, Even = Luigi
        const characterName = (playerId % 2 === 1) ? "Mario" : "Luigi";
        document.getElementById("player").innerText = `Player id: ${characterName}`;

    } 
    else if (data.type === "question") {
        loadQuestion(data.question);
    } 
    else if (data.type === "update") {
        playerPositions = data.positions;
        updateBoard();
    } 
    else if (data.type === "winner") {
        alert(`Player ${characterName} wins!`);
        bgMusic.pause(); 
        location.reload();
    }
};
ws.onerror = function(error) {
    console.error('WebSocket Error:', error);
};
ws.onclose = function() {
    console.log('WebSocket connection closed.');
};
// Load a new question
function loadQuestion(questionData) {
    document.getElementById("question").innerText = questionData.question;
    const optionsDiv = document.getElementById("options");
    optionsDiv.innerHTML = "";

    questionData.options.forEach((option) => {
        const button = document.createElement("button");
        button.classList.add("option");
        button.innerText = option;
        button.onclick = () => sendAnswer(option, questionData.correct);
        optionsDiv.appendChild(button);
    });

    startTimer();
}

// Start the timer
function startTimer() {
    timeLeft = 6;
    document.getElementById("timer").innerText = `Time Left: ${timeLeft}`;
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById("timer").innerText = `Time Left: ${timeLeft}`;
        if (timeLeft <= 0) clearInterval(timer);
    }, 1000);
}

// Send answer to server
function sendAnswer(selected, correct) {
    clearInterval(timer);
    ws.send(JSON.stringify({ type: "answer", answer: selected, timeLeft }));
}

// Update the board
function updateBoard() {
    document.querySelectorAll(".player").forEach((el) => el.remove());

    for (let p in playerPositions) {
        const pos = playerPositions[p];
        const piece = document.createElement("div");
        piece.classList.add("player");

        // Pairwise assignment: Odd = Mario, Even = Luigi
        const gif = (p % 2 === 1) ? playerGifs.mario : playerGifs.luigi;
        piece.style.backgroundImage = `url('${gif}')`;
        piece.style.backgroundSize = 'cover';
        piece.style.width = '30px';
        piece.style.height = '30px';
        document.getElementById(`cell-${pos}`).appendChild(piece);
    }
}

updateBoard();

// Style for board numbers
const style = document.createElement("style");
style.innerHTML = `
    .cell {
        position: relative;
    }
    .cell-number {
        position: absolute;
        top: 2px;
        right: 4px;
        font-size: x-small;
        font-weight: bold;
        color: white;
    }
`;
document.head.appendChild(style);

// Handle background music toggle
window.addEventListener("load", () => {
    const soundToggle = document.getElementById("sound-toggle");
    const soundIcon = document.getElementById("sound-icon");

    document.body.addEventListener("click", () => {
        if (bgMusic.paused) {
            bgMusic.play().catch((error) => console.log("Autoplay error:", error));
        }
    }, { once: true });

    soundToggle.addEventListener("click", () => {
        if (bgMusic.paused) {
            bgMusic.play();
            soundIcon.src = "assets/speaker.png";
        } else {
            bgMusic.pause();
            soundIcon.src = "assets/mute.png";
        }
    });
});
