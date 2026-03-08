/**
 * Enemy classes (Geese, Crabs, Clams, Polar Bear)
 */

class Enemy {
    constructor(x, y, speed, type) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.type = type;
        this.width = 30; // Original sizes
        this.height = 20;
        this.animFrame = 1;
        this.frameCount = 0;
    }

    update() {
        this.x += this.speed;
        this.frameCount++;
        if (this.frameCount > 45) {
            this.animFrame = this.animFrame === 1 ? 2 : 1;
            this.frameCount = 0;
        }
    }

    getColor() {
        switch (this.type) {
            case 'goose': return '#f00';
            case 'crab': return '#ff0';
            case 'clam': return '#0f0';
            case 'bear': return '#444';
            default: return '#888';
        }
    }
}

class SnowGoose extends Enemy {
    constructor(x, y, speed) {
        super(x, y, speed, 'goose');
    }
}

class KingCrab extends Enemy {
    constructor(x, y, speed) {
        super(x, y, speed, 'crab');
        this.baseY = y;
        this.offset = 0;
    }

    update() {
        this.offset += 0.1;
        this.y = this.baseY + Math.sin(this.offset) * 4; // Bobbing suave
        this.x += this.speed;

        this.frameCount++;
        if (this.frameCount > 15) {
            this.animFrame = this.animFrame === 1 ? 2 : 1;
            this.frameCount = 0;
        }

        // Bate e volta nas bordas da tela
        if (this.x > 370) {
            this.x = 370;
            this.speed = -Math.abs(this.speed);
        } else if (this.x < 0) {
            this.x = 0;
            this.speed = Math.abs(this.speed);
        }
    }
}

class Clam extends Enemy {
    constructor(x, y, speed) {
        super(x, y, speed, 'clam');
        this.openTimer = Math.floor(Math.random() * 90); // Start at random open/close phase
        this.isOpen = false;
        this.animFrame = 1; // 1 = Fechada, 2 = Aberta
    }

    update() {
        this.x += this.speed;

        this.openTimer++;
        if (this.openTimer >= 90) { // 1.5s aberto/fechado a 60fps
            this.openTimer = 0;
            this.isOpen = !this.isOpen;
            this.animFrame = this.isOpen ? 2 : 1;
        }

        // Loop contínuo com a plataforma de gelo
        if (this.speed > 0 && this.x > 450) {
            this.x = -100;
        } else if (this.speed < 0 && this.x < -100) {
            this.x = 450;
        }
    }
}

class PolarBear extends Enemy {
    constructor(x, y, speed) {
        super(x, y, speed, 'bear');
        this.width = 62; // visual width at scale 2.0
        this.height = 28; // visual height at scale 2.0 (excluding transparent padding)
    }

    update(player) {
        // Inteligência Leve: Persegue o player de forma compassada (não teleguiado)
        if (player) {
            this.aiTimer = (this.aiTimer || 0) + 1;
            // O urso "avalia" a posição do player e muda a direção de tempos em tempos (a cada 90 frames / 1.5 seg)
            if (this.aiTimer >= 90) {
                this.aiTimer = 0;
                // Se o player estiver longe o suficiente pra justificar, ele vira
                if (player.x > this.x + 20 && this.speed < 0) {
                    this.speed = Math.abs(this.speed); // Vai pra direita
                } else if (player.x < this.x - 20 && this.speed > 0) {
                    this.speed = -Math.abs(this.speed); // Vai pra esquerda
                }
            }
        }

        this.x += this.speed;

        // Sistema de animação
        if (this.speed !== 0) {
            this.frameCount++;
            if (this.frameCount > 22) { // 22 matches the player's animation transition speed
                this.animFrame = this.animFrame === 1 ? 3 : 1;
                this.frameCount = 0;
            }
        } else {
            this.animFrame = 2; // Fixed on bear2 when stopped
        }

        // Limites de Borda (Patrol de Segurança)
        if (!this.isChasingOut) {
            if (this.x > 370) {
                this.x = 370;
                this.speed = -Math.abs(this.speed);
            } else if (this.x < 0) {
                this.x = 0;
                this.speed = Math.abs(this.speed);
            }
        }
    }
}

class EnemyManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.enemies = [];
        this.polarBear = null; // Urso polar gerenciado de forma separada
        this.spawnCounter = 0;
        this.nextSpawnTimer = 0;
    }

    spawn(levelNum, levelObj) {
        // Limitar quantidade de inimigos na tela
        let maxEnemies = 1;
        if (levelNum === 2) maxEnemies = 2;
        if (levelNum >= 3) maxEnemies = 3;

        // Sempre deixe o timer rolar pra não nascer tudo junto instantaneamente
        if (!this.nextSpawnTimer) {
            const minFrames = Math.max(120, 240 - levelNum * 5);
            const maxFrames = Math.max(240, 420 - levelNum * 10);
            this.nextSpawnTimer = Math.floor(Math.random() * (maxFrames - minFrames + 1)) + minFrames;
        }

        this.spawnCounter++;
        if (this.spawnCounter < this.nextSpawnTimer) return;

        // Reset pro próximo spawn se atingiu o tempo
        this.spawnCounter = 0;
        this.nextSpawnTimer = 0;

        // Verifica capacidade antes de spawnar
        if (this.enemies.length >= maxEnemies) return;

        const row = Math.floor(Math.random() * 4);
        const rowYs = [134, 173, 212, 251]; // Mesmas faixas das plataformas

        // Define tipos permitidos baseado no nível
        let availableTypes = ['goose'];
        if (levelNum >= 2) availableTypes.push('crab');
        if (levelNum >= 3) availableTypes.push('clam');

        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];

        if (type === 'goose') {
            const y = rowYs[row] - 25; // Voando acima do gelo
            let speed = 0.3;
            if (levelNum >= 3) speed = 1.5;
            if (levelNum >= 5) speed = 2.0;

            const direction = Math.random() > 0.5 ? 1 : -1;
            speed *= direction;
            const x = direction > 0 ? -50 : 450;
            this.enemies.push(new SnowGoose(x, y, speed));

        } else if (type === 'crab') {
            const y = rowYs[row] - 20; // Andando no gelo
            let speed = 0.8;
            if (levelNum >= 4) speed = 1.1;
            if (levelNum >= 6) speed = 1.4;

            const direction = Math.random() > 0.5 ? 1 : -1;
            speed *= direction;
            // Spawn já dentro da tela para começar a bater nas bordas
            const x = Math.random() > 0.5 ? 10 : 360;
            this.enemies.push(new KingCrab(x, y, speed));

        } else if (type === 'clam') {
            const y = rowYs[row] - 15; // Parada no gelo
            let platformSpeed = 1.0;
            if (levelObj && levelObj.rows[row]) {
                platformSpeed = levelObj.rows[row].direction * levelObj.rows[row].speed * levelObj.speedMult;
            }
            const x = Math.random() * 300 + 40; // Spawna dentro da tela
            this.enemies.push(new Clam(x, y, platformSpeed));
        }
    }

    update(levelNum, player, levelObj) {
        this.spawn(levelNum, levelObj);
        this.enemies.forEach(e => e.update());

        // Remove inimigos voados que saem da tela por muito (limite amplo por causa da Ostra e limites do slider)
        this.enemies = this.enemies.filter(e => e.x > -150 && e.x < 550);

        // Gerenciamento do Urso Polar
        if (levelNum >= 4) {
            if (!this.polarBear) {
                // O terceiro parâmetro (-1.5) é o controle de VELOCIDADE. Valores negativos movem para a esquerda inicialmente.
                // Ex: -1.0 para mais devagar, -2.5 para mais rápido.
                this.polarBear = new PolarBear(370, 62, -0.6); // Y=62 alinha com pés, velocidade 0.7
            }
            this.polarBear.update(player);
        } else {
            this.polarBear = null;
        }
    }

    draw(ctx) {
        let drawEnemy = (e) => {
            const facing = e.speed > 0 ? 'right' : 'left';
            let pSprite = null;

            if (e.type === 'bear') {
                pSprite = window.preRenderedSprites['bear' + e.animFrame + '_' + facing];
                if (pSprite) {
                    ctx.drawImage(pSprite, e.x, e.y - 18); // offset -18 ajusta o padding transparente do canvas 2.0
                }
                return;
            } else if (e.type === 'crab') {
                ctx.fillStyle = '#eb775b'; // Peach/Red
                ctx.fillRect(e.x + 8, e.y, 4, 8); // Left claw
                ctx.fillRect(e.x + 18, e.y, 4, 8); // Right claw
                ctx.fillRect(e.x + 4, e.y + 8, 22, 6); // Body
                // Legs toggle with animation
                ctx.fillRect(e.x + 8, e.y + 14, 4, e.animFrame === 1 ? 6 : 2);
                ctx.fillRect(e.x + 18, e.y + 14, 4, e.animFrame === 2 ? 6 : 2);
                return;
            } else if (e.type === 'clam') {
                ctx.fillStyle = '#e8d254'; // Yellow
                if (e.animFrame === 1) {
                    ctx.fillRect(e.x + 4, e.y + 8, 22, 10);
                } else {
                    ctx.fillRect(e.x + 4, e.y, 22, 8); // Top shell
                    ctx.fillRect(e.x + 4, e.y + 12, 22, 6); // Bottom shell
                }
                return;
            } else if (e.type === 'goose') {
                pSprite = window.preRenderedSprites['bird' + e.animFrame + '_' + facing];
            } else if (e.type === 'fish') {
                pSprite = window.preRenderedSprites['fish' + e.animFrame + '_' + facing];
            }

            if (pSprite) {
                ctx.drawImage(pSprite, e.x, e.y);
            }
        };

        this.enemies.forEach(drawEnemy);
        if (this.polarBear) {
            drawEnemy(this.polarBear);
        }
    }
}

window.SnowGoose = SnowGoose;
window.KingCrab = KingCrab;
window.EnemyManager = EnemyManager;
window.Enemy = Enemy;
