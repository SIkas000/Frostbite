/**
 * Main Game Controller for Frostbite Web Tribute
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants (Synced with frostbite.bas)
const CANVAS_WIDTH = 400; // Original internal resolution
const CANVAS_HEIGHT = 300;
const INITIAL_TEMP = 45;
const ONEUP_GOAL = 5000;
const DOOR_X = 276;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Sprites are now pre-rendered via sprites.js
let spritesLoaded = true; // Immediately true because they render synchronously

// Game State
const state = {
    score: 0,
    lives: 3,
    level: 1,
    gameOver: false,
    mode: 'playing', // 'playing', 'fishScore', 'drowning', 'freezing', 'levelEndIgloo', 'levelEndTemp'
    fishScorePending: 0,
    levelEndTimer: 0,
    iglooDisassembleTimer: 0,
    iglooDisassemblePiecesLeft: 0,
    levelBonusPointsPerPiece: 0,
    framesPerDegree: 5,
    input: {
        left: false,
        right: false,
        up: false,
        down: false,
        space: false
    }
};

// Objects
const player = new Player();
const level = new Level();
const enemyManager = new EnemyManager();

// Input Handling
window.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'ArrowLeft':  case 'KeyA': state.input.left = true; break;
        case 'ArrowRight': case 'KeyD': state.input.right = true; break;
        case 'ArrowUp':    case 'KeyW': state.input.up = true; break;
        case 'ArrowDown':  case 'KeyS': state.input.down = true; break;
        case 'Space': 
            if (!state.input.space) {
                level.reverseRows();
                state.input.space = true;
            }
            break;
    }
});

window.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'ArrowLeft':  case 'KeyA': state.input.left = false; break;
        case 'ArrowRight': case 'KeyD': state.input.right = false; break;
        case 'ArrowUp':    case 'KeyW': state.input.up = false; break;
        case 'ArrowDown':  case 'KeyS': state.input.down = false; break;
        case 'Space':      state.input.space = false; break;
    }
});

function handleDeath() {
    if (window.stopLoop) stopLoop('drowning');
    state.lives--;
    if (state.lives < 0) {
        state.gameOver = true;
        alert("GAME OVER!");
        location.reload();
    } else {
        player.reset();
        level.temperature = 45;
        level.resetPositions();
        enemyManager.reset();
    }
}
function updateHUD() {
    let scoreText = state.score >= 1000000 ? "FISHES" : `${state.score}`;
    
    // Cleaner look: just numbers like original Atari
    document.getElementById('score').innerText = scoreText;
    document.getElementById('temp').innerText = `${level.temperature}°`;
    document.getElementById('lives').innerText = `${state.lives}`;
    document.getElementById('level').innerText = `${state.level}`;
}

/**
 * Main Game Loop
 */
function gameLoop() {
    if (state.gameOver) return;

    // Clear Screen
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (state.mode === 'playing') {
        // Update
        player.update(state.input, level);
        level.update(state.level);
        enemyManager.update(state.level, player, level);
        
        if (level.checkGoal(player, state.input)) {
            if (!player.isEnteringIgloo) {
                player.jumpIntoIgloo();
            }
        }

        // Só processa vitória quando a animação de pulo retornar 'true'
        if (player.iglooEntered) {
            state.mode = 'levelEndIgloo';
            let levelCap9 = Math.min(state.level, 9);
            // Bônus de entrada é dividido pelas 16 peças do iglu (160 / 16 = 10 por nível)
            state.levelBonusPointsPerPiece = levelCap9 * 10;
            state.iglooDisassembleTimer = 0;
            state.iglooDisassemblePiecesLeft = 16;
            
            state.tempBonusPoints = 10 * state.level;
            state.levelEndTimer = 0;
        }

        if (!player.isJumping) {
            const onSolidGround = level.checkBlockCollision(player, state);
            if (!onSolidGround) {
                state.mode = 'drowning';
                player.startDrowning();
            }
        }

        // Check Enemy Collisions + Fish Collection
        if (!player.isJumping && state.mode === 'playing') {
            for (let i = enemyManager.enemies.length - 1; i >= 0; i--) {
                let enemy = enemyManager.enemies[i];
                if (Physics.checkCollision(player, enemy)) {
                    if (enemy.type === 'fish') {
                        if (window.playSound) playSound('fish');
                        // Collect fish: pause and score gradually (~1.6 sec = 100 frames at 2 pts)
                        state.mode = 'fishScore';
                        state.fishScorePending = 200;
                        enemyManager.enemies.splice(i, 1);
                    } else if (enemy.type === 'clam' && !enemy.isOpen) {
                        // Ostra fechada é segura
                        continue;
                    } else {
                        // Tocou em Goose, Crab, ou Clam Aberta -> Perde a vida se afogando na mesma hora
                        state.mode = 'drowning';
                        player.startDrowning();
                    }
                }
            }

            // Check Polar Bear Collision
            // Somente verifica colisão se o jogador estiver de fato pousado na mesma linha (costa terrestre: -1)
            if (enemyManager.polarBear && player.currentRow === -1 && Physics.checkCollision(player, enemyManager.polarBear)) {
                state.mode = 'bearChase';
                player.startBearChase(enemyManager.polarBear);
            }
        }

        if (level.temperature <= 0 && state.mode === 'playing') {
            state.mode = 'freezing';
            player.startFreezing();
        }
    } else if (state.mode === 'fishScore') {
        // Increment score gradually
        state.fishScorePending -= 2;
        state.score += 2;
        if (state.fishScorePending % 8 === 0) {
            if (window.playSound) playSound('scorecount');
        }
        if (state.fishScorePending <= 0) {
            state.mode = 'playing';
        }
    } else if (state.mode === 'drowning') {
        player.updateDrowning();
        // O jogo pausa totalmente (plataformas e inimigos congelam no frame atual)
        if (player.drownFinished && (window.isDrowningFinished ? isDrowningFinished() : true)) {
            handleDeath();
            state.mode = 'playing';
        }
    } else if (state.mode === 'freezing') {
        player.updateFreezing();
        // O jogo pausa totalmente (plataformas e inimigos congelam no frame atual)
        if (player.freezeFinished && (window.isDrowningFinished ? isDrowningFinished() : true)) {
            handleDeath();
            state.mode = 'playing';
        }
    } else if (state.mode === 'bearChase') {
        player.updateBearChase(enemyManager.polarBear);
        // O jogo pausa o resto, mas o urso continua correndo atrás
        if (enemyManager.polarBear) {
            enemyManager.polarBear.x += enemyManager.polarBear.speed;
            enemyManager.polarBear.frameCount++;
            if (enemyManager.polarBear.frameCount > 8) {
                enemyManager.polarBear.animFrame = enemyManager.polarBear.animFrame === 1 ? 3 : 1;
                enemyManager.polarBear.frameCount = 0;
            }
        }
        if (player.chaseFinished) {
            handleDeath();
            state.mode = 'playing';
        }
    } else if (state.mode === 'levelEndIgloo') {
        state.iglooDisassembleTimer++;
        // 6 segundos pra 16 peças a 60 fps ≈ 22.5 frames por peça
        if (state.iglooDisassembleTimer >= 22) {
            state.iglooDisassembleTimer = 0;
            if (state.iglooDisassemblePiecesLeft > 0) {
                state.iglooDisassemblePiecesLeft--;
                level.iglooSegments--; // Remove a peça desenhada
                state.score += state.levelBonusPointsPerPiece;
                if (window.playSound) playSound('iglooblock');
            } else {
                state.mode = 'levelEndTemp';
                state.levelEndTimer = 0;
                // Calcula quantos frames leva para abaixar 1 grau, espalhando num total de 240 frames (4 segundos).
                state.framesPerDegree = Math.max(1, Math.floor(240 / Math.max(1, level.temperature)));
            }
        }
    } else if (state.mode === 'levelEndTemp') {
        state.levelEndTimer++;
        if (state.levelEndTimer >= state.framesPerDegree) { // Drena espalhado linearmente nos 4s
            state.levelEndTimer = 0;
            if (level.temperature > 0) {
                level.temperature--;
                state.score += state.tempBonusPoints;
                if (window.playSound) playSound('scorecount');
            } else {
                // Fim da contagem, avança fase
                state.level++;
                level.temperature = INITIAL_TEMP;
                level.iglooSegments = 0;
                level.rows.forEach(r => r.color = 'white'); 
                level.isNight = (state.level - 1) % 8 >= 4; 
                player.reset();
                state.mode = 'playing';
            }
        }
    }

    // Check Extra Life
    if (state.score >= (state.lastLifeThreshold || 5000)) {
        if (state.lives < 9) state.lives++;
        state.lastLifeThreshold = (state.lastLifeThreshold || 5000) + 5000;
    }

    // Draw
    if (spritesLoaded) {
        level.draw(ctx);
        enemyManager.draw(ctx);
        if ((state.mode !== 'levelEndIgloo' && state.mode !== 'levelEndTemp') || !player.iglooEntered) {
            player.draw(ctx);
        }
    }

    updateHUD();

    requestAnimationFrame(gameLoop);
}

// Start Game
gameLoop();
