const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const tempEl = document.getElementById('temp');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');

// Set internal resolution (Atari style)
canvas.width = 160;
canvas.height = 192;

const COLORS = {
    WATER: '#000088',
    ICE: '#FFFFFF',
    ICE_ACTIVE: '#00FFFF',
    PLAYER: '#FFCCCC',
    BEAR: '#FFFFFF',
    BIRD: '#FFFF00',
    IGLOO: '#FFFFFF',
    BANK: '#FFFFFF',
    BLACK: '#000000'
};

const STATE = {
    MENU: 0,
    PLAYING: 1,
    GAME_OVER: 2,
    WON: 3
};

let gameState = STATE.MENU;
let score = 0;
let temp = 45;
let lives = 3;
let lastTime = 0;
let tempTimer = 0;
let iglooBricks = 0;
let level = 1;
const MAX_IGLOO_BRICKS = 15;

// Player Settings
const player = {
    x: 80,
    y: 160,
    targetY: 160,
    width: 6,
    height: 8,
    speed: 2,
    row: 4, // 0: Bank, 1-4: Ice rows, 5: Home
    isJumping: false,
    jumpProgress: 0,
    dirX: 0,
    dirY: 0
};

// Ice Rows
const rows = [
    { y: 40, speed: 0.5, dir: 1, ice: [] },
    { y: 70, speed: -0.8, dir: -1, ice: [] },
    { y: 100, speed: 0.6, dir: 1, ice: [] },
    { y: 130, speed: -0.4, dir: -1, ice: [] }
];

function initIce() {
    rows.forEach(row => {
        row.ice = [];
        for (let i = 0; i < 4; i++) {
            row.ice.push({
                x: i * 50,
                width: 30,
                state: 0
            });
        }
    });
}

// Input Handling
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') {
        if (gameState === STATE.MENU || gameState === STATE.GAME_OVER) {
            startGame();
        } else if (gameState === STATE.WON) {
            startNextLevel();
        }
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

function startGame() {
    score = 0;
    temp = 45;
    lives = 3;
    level = 1;
    // Reset speeds
    rows[0].speed = 0.5;
    rows[1].speed = -0.8;
    rows[2].speed = 0.6;
    rows[3].speed = -0.4;
    startNextLevel();
}

function startNextLevel() {
    temp = 45;
    iglooBricks = 0;
    gameState = STATE.PLAYING;
    overlay.classList.add('hidden');
    initIce();
    enemies.length = 0;
    spawnEnemies();
    resetPlayerPosition();
}

function resetPlayerPosition() {
    player.x = 80;
    player.y = 160;
    player.targetY = 160;
    player.row = 4;
    player.isJumping = false;
}

// Enemies
const enemies = [];
const bear = { x: 0, y: 15, dir: 1, speed: 0.5, width: 10, height: 10 };

function spawnEnemies() {
    rows.forEach((row, i) => {
        if (Math.random() > 0.5) {
            enemies.push({
                row: i,
                x: Math.random() * canvas.width,
                speed: row.speed * 1.5,
                type: 'BIRD',
                width: 8,
                height: 4
            });
        }
    });
}

function update(dt) {
    if (gameState !== STATE.PLAYING) return;

    // Update Temperature
    tempTimer += dt;
    if (tempTimer > 2000) { // Every 2 seconds
        temp--;
        tempTimer = 0;
        if (temp <= 0) die();
    }

    // Update Ice
    rows.forEach(row => {
        row.ice.forEach(block => {
            block.x += row.speed;
            if (block.x > canvas.width) block.x = -block.width;
            if (block.x < -block.width) block.x = canvas.width;
        });
    });

    // Update Birds
    enemies.forEach((enemy, index) => {
        enemy.x += enemy.speed;
        if (enemy.x > canvas.width) enemy.x = -enemy.width;
        if (enemy.x < -enemy.width) enemy.x = canvas.width;

        // Collision with player
        if (!player.isJumping && player.row === enemy.row) {
            if (Math.abs(player.x - enemy.x) < 5) {
                die();
            }
        }
    });

    // Update Bear (on top bank)
    if (iglooBricks >= MAX_IGLOO_BRICKS / 2) {
        bear.x += bear.dir * bear.speed;
        if (bear.x > canvas.width - bear.width || bear.x < 0) bear.dir *= -1;

        // Collision with player on top bank
        if (!player.isJumping && player.row === -1) {
            if (Math.abs(player.x - bear.x) < 8) {
                die();
            }
        }
    }

    // Handle Movement
    if (!player.isJumping) {
        if (keys['ArrowUp'] || keys['KeyW']) jump(0, -1);
        else if (keys['ArrowDown'] || keys['KeyS']) jump(0, 1);
        else if (keys['ArrowLeft'] || keys['KeyA']) jump(-1, 0);
        else if (keys['ArrowRight'] || keys['KeyD']) jump(1, 0);
    }

    if (player.isJumping) {
        player.jumpProgress += 0.15; // Faster jump
        if (player.jumpProgress >= 1) {
            player.isJumping = false;
            player.jumpProgress = 0;
            checkLanding();
        }
    }

    // If on ice row, move with ice
    if (!player.isJumping && player.row >= 0 && player.row < 4) {
        player.x += rows[player.row].speed;
        // Check if fell in water
        if (player.x < 0 || player.x > canvas.width - player.width) {
            die();
        }
    }

    // Check if player entered igloo
    if (!player.isJumping && player.row === -1 && iglooBricks >= MAX_IGLOO_BRICKS) {
        if (Math.abs(player.x - 78) < 6) {
            win();
        }
    }

    updateHUD();
}

function jump(dx, dy) {
    player.isJumping = true;
    player.dirX = dx;
    player.dirY = dy;
}

function checkLanding() {
    // Determine new position/row
    if (player.dirY !== 0) {
        player.row += player.dirY;
        if (player.row < -1) player.row = -1;
        if (player.row > 4) player.row = 4;
    } else {
        player.x += player.dirX * 30;
    }

    // Calculate actual Y based on row
    if (player.row === 4) player.targetY = 160; // Start bank
    else if (player.row === -1) player.targetY = 15; // Home bank (igloo)
    else player.targetY = rows[player.row].y;

    player.y = player.targetY;

    // Check landing on ice
    if (player.row >= 0 && player.row < 4) {
        let landed = false;
        rows[player.row].ice.forEach(block => {
            if (player.x + player.width / 2 > block.x && player.x + player.width / 2 < block.x + block.width) {
                landed = true;
                if (block.state < 3) {
                    block.state++;
                    iglooBricks++;
                    score += 10;
                }
            }
        });
        if (!landed) die();
    }
}

function die() {
    lives--;
    if (lives < 0) {
        gameState = STATE.GAME_OVER;
        overlay.classList.remove('hidden');
        overlayTitle.innerText = "GAME OVER";
        overlayMsg.innerText = "PRESSIONE ESPAÇO PARA TENTAR";
    } else {
        resetPlayerPosition();
        temp = 45;
        level = 1; // Reset level on game over? Usually Frostbite resets from level 1.
    }
}

function win() {
    gameState = STATE.WON;
    overlay.classList.remove('hidden');
    overlayTitle.innerText = "NÍVEL " + level + " CONCLUÍDO!";
    overlayMsg.innerText = "PRESSIONE ESPAÇO PARA O PRÓXIMO NÍVEL";
    score += temp * 100;
    level++;
    // Speed up rows
    rows.forEach(row => row.speed *= 1.2);
}

function updateHUD() {
    scoreEl.innerText = score.toString().padStart(6, '0');
    tempEl.innerText = temp;
    livesEl.innerText = lives;
}

function draw() {
    ctx.fillStyle = COLORS.WATER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Water Animation (waves)
    ctx.strokeStyle = '#0000AA';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
        const wy = 30 + (i * 15) + (Date.now() / 100) % 15;
        if (wy < 160) {
            ctx.beginPath();
            ctx.moveTo(0, wy);
            ctx.lineTo(canvas.width, wy);
            ctx.stroke();
        }
    }

    // Draw Banks
    ctx.fillStyle = COLORS.BANK;
    ctx.fillRect(0, 0, canvas.width, 30); // Top
    ctx.fillRect(0, 160, canvas.width, 32); // Bottom

    // Draw Igloo progress
    drawIgloo();

    // Draw Ice
    rows.forEach(row => {
        row.ice.forEach(block => {
            const colors = [COLORS.ICE, '#BBEBFF', '#77DDFF', COLORS.ICE_ACTIVE];
            ctx.fillStyle = colors[block.state];
            ctx.fillRect(block.x, row.y, block.width, 10);

            // Texture detail
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(block.x, row.y + 8, block.width, 2);
        });
    });

    // Draw Birds
    enemies.forEach(enemy => {
        ctx.fillStyle = COLORS.BIRD;
        ctx.fillRect(enemy.x, rows[enemy.row].y + 2, enemy.width, enemy.height);
        // Wing animation
        const wingY = Math.sin(Date.now() / 100) * 2;
        ctx.fillRect(enemy.x + 2, rows[enemy.row].y + 2 + wingY, 4, 1);
    });

    // Draw Bear
    if (iglooBricks >= MAX_IGLOO_BRICKS / 2) {
        ctx.fillStyle = COLORS.BEAR;
        ctx.fillRect(bear.x, bear.y, bear.width, bear.height);
        // Bear detail
        ctx.fillStyle = COLORS.BLACK;
        ctx.fillRect(bear.x + (bear.dir > 0 ? 7 : 2), bear.y + 2, 1, 1); // Eye
    }

    // Draw Player
    const jumpOffset = player.isJumping ? Math.sin(player.jumpProgress * Math.PI) * 10 : 0;
    ctx.fillStyle = COLORS.PLAYER;
    ctx.fillRect(player.x, player.y - jumpOffset - player.height, player.width, player.height);

    // Draw Player Head/Eyes (simplified)
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(player.x + 1, player.y - jumpOffset - player.height + 1, 1, 1);
    ctx.fillRect(player.x + 4, player.y - jumpOffset - player.height + 1, 1, 1);

    requestAnimationFrame(gameLoop);
}

function drawIgloo() {
    const x = 70;
    const y = 5;
    const width = 20;
    const height = 15;

    ctx.strokeStyle = COLORS.BLACK;
    ctx.lineWidth = 1;

    // Base
    if (iglooBricks > 0) {
        ctx.fillStyle = COLORS.IGLOO;
        // Draw layers based on bricks
        const layers = Math.min(iglooBricks, MAX_IGLOO_BRICKS);
        for (let i = 0; i < layers; i++) {
            const lx = x + (i % 5) * 4;
            const ly = y + Math.floor(i / 5) * 4;
            ctx.fillRect(lx, 20 - ly, 4, 4);
            ctx.strokeRect(lx, 20 - ly, 4, 4);
        }
    }

    // Doorway opening
    if (iglooBricks >= MAX_IGLOO_BRICKS) {
        ctx.fillStyle = COLORS.BLACK;
        ctx.fillRect(78, 15, 4, 6);
    }
}

function gameLoop(time) {
    const dt = time - lastTime;
    lastTime = time;

    update(dt);
    draw();
}

requestAnimationFrame(gameLoop);
initIce();
updateHUD();
