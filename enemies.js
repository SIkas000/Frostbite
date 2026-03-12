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

    update(dt) {
        this.x += this.speed * dt;
        this.frameCount += dt;
        if (this.frameCount > 45) {
            this.animFrame = this.animFrame === 1 ? 2 : 1;
            this.frameCount = 0;
        }
    }

    getColor() {
        switch (this.type) {
            case 'goose': return '#f00';
            case 'crab': return '#ff0';
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

class Fish extends Enemy {
    constructor(x, y, speed) {
        super(x, y, speed, 'fish');
    }
}

class KingCrab extends Enemy {
    constructor(x, y, speed) {
        super(x, y, speed, 'crab');
    }

    update(dt) {
        this.x += this.speed * dt;

        this.frameCount += dt;
        if (this.frameCount > 15) {
            this.animFrame = this.animFrame === 1 ? 2 : 1;
            this.frameCount = 0;
        }
    }
}

class PolarBear extends Enemy {
    constructor(x, y, speed) {
        super(x, y, speed, 'bear');
        this.width = 62; // visual width at scale 2.0
        this.height = 28; // visual height at scale 2.0 (excluding transparent padding)
    }

    update(player, dt) {
        // Inteligência Leve: Persegue o player de forma compassada (não teleguiado)
        if (player) {
            this.aiTimer = (this.aiTimer || 0) + dt;
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

        this.x += this.speed * dt;

        // Sistema de animação
        if (this.speed !== 0) {
            this.frameCount += dt;
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
        
        // Fish specifics
        this.fishTimer = 0;
        this.setNextFishSpawn(1);
    }

    setNextCrabSpawn(levelNum) {
        let minDelay = 300 - (levelNum * 15);
        let maxDelay = 600 - (levelNum * 20);
        if (minDelay < 60) minDelay = 60;
        if (maxDelay < 120) maxDelay = 120;
        this.crabSpawnDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        this.crabTimer = 0;
    }

    setNextFishSpawn(levelNum) {
        let minDelay = 200 - (levelNum * 10);
        let maxDelay = 400 - (levelNum * 15);
        if (minDelay < 60) minDelay = 60;
        if (maxDelay < 120) maxDelay = 120;
        this.fishSpawnDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        this.fishTimer = 0;
    }

    getSpawnSafety(rowNum, defaultDirection) {
        const rowYs = [134, 173, 212, 251];
        
        // Verifica qualquer entidade que esteja atuando fisicamente na mesma fileira atual (Y aproximado)
        let entities = this.enemies.filter(e => Math.abs((e.y + 15) - rowYs[rowNum]) <= 25);

        if (entities.length === 0) {
            return { safe: true, direction: defaultDirection };
        }

        // Força obrigatoriamente a direção de quem já está na fileira (para não nascer de frente um para o outro)
        let direction = entities[0].speed > 0 ? 1 : -1;
        let safe = true;

        entities.forEach(e => {
            // O novo elemento só pode aparecer se TODOS os outros da fileira estiverem do meio pra frente da tela
            if (direction === 1 && e.x < 180) safe = false; 
            if (direction === -1 && e.x > 220) safe = false;
        });

        return { safe: safe, direction: direction };
    }

    spawn(levelNum, levelObj, dt) {
        // Limitar a quantidade de triggers do spawn padrao
        let maxEnemies = 1;
        if (levelNum === 2) maxEnemies = 2;
        if (levelNum >= 3) maxEnemies = 3;

        // O bird tem que aparecer em menos de 2s quando a fase começa.
        if (!this.nextSpawnTimer) {
            if (this.enemies.length === 0) {
                // Menos de 2s para o primeiro spawn da fase (30 a 110 frames)
                this.nextSpawnTimer = Math.floor(Math.random() * 80) + 30;
            } else {
                const minFrames = Math.max(120, 240 - levelNum * 5);
                const maxFrames = Math.max(240, 420 - levelNum * 10);
                this.nextSpawnTimer = Math.floor(Math.random() * (maxFrames - minFrames + 1)) + minFrames;
            }
        }

        this.spawnCounter += (dt || 1);
        if (this.spawnCounter < this.nextSpawnTimer) return;

        this.spawnCounter = 0;
        this.nextSpawnTimer = 0;

        if (this.enemies.length >= maxEnemies) return;

        let availableTypes = ['goose'];
        // ostra removida

        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        const rowYs = [134, 173, 212, 251];

        if (type === 'goose') {
            // "Pode ter momentos que eles vao aparecer em duas, uma, três ou quatro fileiras"
            const numRows = Math.floor(Math.random() * 4) + 1; // 1 to 4 fileiras ao mesmo tempo
            let rows = [0, 1, 2, 3];
            rows.sort(() => Math.random() - 0.5);
            rows = rows.slice(0, numRows);
            
            rows.forEach(r => {
                let defaultDirection = Math.random() > 0.5 ? 1 : -1;
                let safety = this.getSpawnSafety(r, defaultDirection);
                
                // Se não é seguro nascer porque a via está entupida ou no começo, aborta este ganso específico e tenta noutra.
                if (!safety.safe) return;
                
                const y = rowYs[r] - 25;
                const direction = safety.direction; // Respeita a direção universal do trânsito na fileira
                
                // Bird velocity is based on platform + 0.2, capped at level 5
                let cappedLevel = Math.min(levelNum, 5);
                let platSpd = 0.2; // Level 1 mult
                if (cappedLevel >= 2) platSpd = 0.4;
                if (cappedLevel >= 4) platSpd = 0.5;

                let speed = platSpd + 0.2;
                speed *= direction;
                const x = direction > 0 ? -50 : 450;
                this.enemies.push(new SnowGoose(x, y, speed));
            });
        }
    }

    spawnCrab(levelNum, levelObj) {
        const rowOptions = [0, 2]; // "apenas fileiras pares de caranguejos" - (visual 1 e 3)
        const rowNum = rowOptions[Math.floor(Math.random() * rowOptions.length)];
        const rowYs = [134, 173, 212, 251];

        // "velocidade da plataforma contudo com -0.3"
        let platSpeed = 1.0;
        if (levelObj && levelObj.rows[rowNum]) {
            platSpeed = Math.abs(levelObj.rows[rowNum].speed * levelObj.speedMult);
        }
        let speed = platSpeed - 0.3;
        if (speed < 0.1) speed = 0.1;

        let defaultDirection = Math.random() > 0.5 ? 1 : -1;
        let safety = this.getSpawnSafety(rowNum, defaultDirection);
        
        if (!safety.safe) return; // Se a rua está cheia, o caranguejo não nasce. Ele tentará de novo no próximo frame.

        const direction = safety.direction;
        speed *= direction;
        const x = direction > 0 ? -50 : 450;
        this.enemies.push(new KingCrab(x, rowYs[rowNum] - 20, speed));
    }

    spawnFishGroup(levelNum, specificRow = -1) {
        const rowYs = [134, 173, 212, 251];
        const rowNum = specificRow === -1 ? Math.floor(Math.random() * 4) : specificRow;
        const y = rowYs[rowNum] - 10;

        // Velocidade baseada na plataforma + 0.2 (travada na fase 5), igual ao bird
        let cappedLevel = Math.min(levelNum, 5);
        let platSpd = 0.2; // Nível 1 base
        if (cappedLevel >= 2) platSpd = 0.4;
        if (cappedLevel >= 4) platSpd = 0.5;
        
        let speed = platSpd + 0.2;

        let defaultDirection = Math.random() > 0.5 ? 1 : -1;
        let safety = this.getSpawnSafety(rowNum, defaultDirection);
        
        if (!safety.safe) return; // Aborta e tenta fazer o cardume na próxima rodada

        const direction = safety.direction;
        speed *= direction;
        
        const startX = direction > 0 ? -50 : 450;
        const fishCount = Math.floor(Math.random() * 3) + 2; // "podem varia entre 2 até 4" peixes

        for (let i = 0; i < fishCount; i++) {
            const xOffset = direction > 0 ? -(i * 45) : (i * 45);
            this.enemies.push(new Fish(startX + xOffset, y, speed));
        }
    }

    update(levelNum, player, levelObj, fishCollected, dt) {
        this.spawn(levelNum, levelObj, dt);
        
        // Caranguejos começam apenas na Fase 3
        if (levelNum >= 3) {
            let hasCrab = this.enemies.some(e => e.type === 'crab');
            if (!hasCrab) {
                this.crabTimer += dt;
                if (this.crabTimer >= this.crabSpawnDelay) {
                    this.spawnCrab(levelNum, levelObj);
                }
            }
        }

        // Cardume de Peixes normal aparece a partir da Fase 2 ("obrigatoriamente em algum momento")
        // Mas pára se o player atingiu o limite de 12 (!fishCollected < 12)
        if (levelNum >= 2 && fishCollected < 12) {
            let hasFish = this.enemies.some(e => e.type === 'fish');
            if (!hasFish) {
                this.fishTimer += dt;
                if (this.fishTimer >= this.fishSpawnDelay) {
                    this.spawnFishGroup(levelNum);
                }
            }
        }
        // Salvar variáveis de estado antes de filtrar e atualizar os inimigos
        let hadCrab = this.enemies.some(e => e.type === 'crab');
        let hadFish = this.enemies.some(e => e.type === 'fish');

        // Loop principal que faz os inimigos andarem
        this.enemies.forEach(e => e.update(dt));

        // Validar e remover inimigos que saíram da tela
        const keptEnemies = [];
        const offScreenEnemies = [];

        for (let i = 0; i < this.enemies.length; i++) {
            let e = this.enemies[i];
            // Se ainda está visível/na margem segura
            if (e.x > -150 && e.x < 550) {
                keptEnemies.push(e);
            } else {
                offScreenEnemies.push(e);
            }
        }

        this.enemies = keptEnemies;

        // Regra de Substituição do Peixe (Somente a partir da Fase 6)
        if (levelNum >= 6) {
            // Conta em quais rows atuais temos inimigos removidos
            // Para poder substituí-los antes de nascerem como pássaros de novo
            offScreenEnemies.forEach(deadEnemy => {
                // Acha a fileira aproximada em que este inimigo estava
                const rowYs = [134, 173, 212, 251];
                let rowNum = rowYs.findIndex(ry => Math.abs(deadEnemy.y + (deadEnemy.type === 'bear' ? 0 : 25) - ry) <= 30);
                if (rowNum === -1) rowNum = Math.floor(Math.random() * 4); // Fallback

                // 30% de chance do inimigo que sumiu ser substituído por um peixe
                // Podendo engatilhar em múltiplas fileiras de uma vez, se mais de 1 inimigo sumir
                if (Math.random() < 0.3 && fishCollected < 12) {
                    this.spawnFishGroup(levelNum, rowNum); // Na Fase 6, se substituir chama logo um cardume pra aquela row
                }
            });
        }
        
        let stillHasCrab = this.enemies.some(e => e.type === 'crab');
        if (hadCrab && !stillHasCrab) {
            this.setNextCrabSpawn(levelNum);
        }

        let stillHasFish = this.enemies.some(e => e.type === 'fish');
        if (hadFish && !stillHasFish) {
            this.setNextFishSpawn(levelNum);
        }
        
        // Gerenciamento do Urso Polar
        if (levelNum >= 4) {
            if (!this.polarBear) {
                // O terceiro parâmetro (-1.5) é o controle de VELOCIDADE. Valores negativos movem para a esquerda inicialmente.
                // Ex: -1.0 para mais devagar, -2.5 para mais rápido.
                this.polarBear = new PolarBear(370, 62, -0.6); // Y=62 alinha com pés, velocidade 0.7
            }
            this.polarBear.update(player, dt);
        } else {
            this.polarBear = null;
        }
    }

    draw(ctx) {
        let drawEnemy = (e) => {
            const facing = e.speed > 0 ? 'right' : 'left';
            let pSprite = null;

            if (e.type === 'bear') {
                const nightSuffix = (typeof level !== 'undefined' && level.isNight) ? '_night' : '';
                pSprite = window.preRenderedSprites['bear' + e.animFrame + '_' + facing + nightSuffix];
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
