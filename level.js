/**
 * Level and environment logic (Ice Floes, Igloo, Temperature)
 */

class Level {
    constructor() {
        this.rows = [];
        this.iglooSegments = 0;
        this.temperature = 45;
        this.lastTempUpdate = Date.now();
        this.isNight = false;

        this.initRows();
    }

    initRows() {
        // 4 rows of ice floes
        for (let i = 0; i < 4; i++) {
            const numBlocks = 3;
            const spacing = 110; // Distância entre o começo de uma plataforma e a próxima
            const blocks = [];

            // Organização em Comboio e Zig-Zag como no original
            // Linha 1 e 3 (Pares, movem esq) concentram-se na Direita da tela
            // Linha 2 e 4 (Ímpares, movem dir) concentram-se na Esquerda da tela
            const startX = (i % 2 === 0) ? 140 : 10;

            for (let j = 0; j < numBlocks; j++) {
                blocks.push({ x: startX + j * spacing });
            }

            this.rows.push({
                direction: i % 2 === 0 ? -1 : 1, // Pares (L1, L3) vão para a esquerda (-1), impares (L2, L4) para a direita (1)
                speed: 1.0, // Velocidade estática padronizada. O multiplicador de fase cuidará da velocidade final.
                y: 134 + i * 39, // Matching IceRowsDATA: 134, 173, 212, 251
                color: 'white', // Cor por fileira (Row State)
                blocks: blocks
            });
        }
    }

    resetPositions() {
        this.rows = [];
        this.initRows();
    }

    update(levelNum = 0.2) {
        // Platform speed increases with level
        let speedMult = 0.2; // Fase 1
        if (levelNum >= 2) speedMult = 0.3; // Fase 2-3
        if (levelNum >= 4) speedMult = 0.4; // Fase 4-6
        if (levelNum >= 7) speedMult = 0.5; // Fase 7+
        this.speedMult = speedMult; // Save for player logic

        // Move ice floes
        this.rows.forEach(row => {
            row.blocks.forEach(block => {
                block.x += row.direction * row.speed * speedMult;

                // Wrapping de forma suave mantendo a separação (distância) matemática intacta.
                if (block.x > 400) {
                    block.x -= 500;
                }
                else if (block.x < -100) {
                    block.x += 500;
                }
            });
        });

        // Update temperature (Original is 1 second interval)
        if (Date.now() - this.lastTempUpdate > 1000) {
            if (this.temperature > 0) this.temperature--;
            this.lastTempUpdate = Date.now();
        }
    }

    checkBlockCollision(player, state) {
        if (player.currentRow < 0 || player.currentRow > 3) {
            player.lastScoredRow = player.currentRow; // Reseta na margem
            return true;
        }

        const row = this.rows[player.currentRow];
        let onBlock = false;

        row.blocks.forEach(block => {
            const blockWidth = 60; // Original
            if (player.x + player.width > block.x && player.x < block.x + blockWidth) {
                onBlock = true;
            }
        });

        if (onBlock) {
            // Aplicar colisão lógicos (pulo por fileira) apenas 1 vez ao pousar
            if (player.lastScoredRow !== player.currentRow) {
                player.lastScoredRow = player.currentRow;

                // Sempre que encostar em uma nova plataforma, toca o som block.ogg
                if (window.playSound) playSound('block');

                // Apenas interage (muda cor e soma pontos) se a plataforma for branca
                if (row.color === 'white') {
                    row.color = 'blue';
                    this.iglooSegments = Math.min(16, this.iglooSegments + 1);
                    // Adicionar pontos baseados na fase (Max 9)
                    if (state && state.score !== undefined) {
                        state.score += Math.min(state.level, 9) * 10;
                    }

                    // Se TODAS as 4 fileiras ficaram azuis, redefinir todas para branco
                    const allBlue = this.rows.every(r => r.color === 'blue');
                    if (allBlue) {
                        this.rows.forEach(r => r.color = 'white');
                    }
                }
            }
        }

        return onBlock;
    }

    draw(ctx) {
        // Draw water (Original color _RGB32(0, 27, 141))
        ctx.fillStyle = this.isNight ? '#000033' : '#001b8d';
        ctx.fillRect(0, 95, 400, 205);

        // Draw sky
        ctx.fillStyle = this.isNight ? '#000000' : '#303fc8';
        ctx.fillRect(0, 0, 400, 24);

        // Draw sunset / aurora lines (depth perception)
        if (!this.isNight) {
            ctx.fillStyle = '#cf608c'; ctx.fillRect(0, 24, 400, 3); // Pink
            ctx.fillStyle = '#d87440'; ctx.fillRect(0, 27, 400, 3); // Orange
            ctx.fillStyle = '#e3aa3e'; ctx.fillRect(0, 30, 400, 3); // Gold
            ctx.fillStyle = '#e3d142'; ctx.fillRect(0, 33, 400, 3); // Yellow
        } else {
            ctx.fillStyle = '#111'; ctx.fillRect(0, 24, 400, 3);
            ctx.fillStyle = '#222'; ctx.fillRect(0, 27, 400, 3);
            ctx.fillStyle = '#333'; ctx.fillRect(0, 30, 400, 3);
            ctx.fillStyle = '#444'; ctx.fillRect(0, 33, 400, 3);
        }

        // Draw shore (Snow ground)
        ctx.fillStyle = this.isNight ? '#4a4a4a' : '#dfdfdf';
        ctx.fillRect(0, 36, 400, 59);

        // Draw igloo base
        this.drawIgloo(ctx);

        // Draw ice floes (Procedurally exactly like QB64)
        this.rows.forEach(row => {
            const color = row.color === 'white' ? '#ffffff' : '#3e8be3ff'; // Light blue for touched row
            ctx.fillStyle = color;
            row.blocks.forEach(block => {
                // 3D Isometric slant drawing for blocks
                for (let j = -8; j <= 8; j++) {
                    const slant = Math.floor(j * 1.5); // Slant shape "/"
                    ctx.fillRect(block.x + slant, row.y - j, 60, 1);
                }
            });
        });
    }

    drawIgloo(ctx) {
        if (this.iglooSegments === 0) return;

        // Original IglooBlockColor = _RGB32(136, 136, 136)
        ctx.fillStyle = '#888888';

        // Drawing segments based on SUB DrawIgloo logic
        const segments = [
            { x: 232, y: 57, w: 32, h: -9 }, { x: 264, y: 57, w: 32, h: -9 }, { x: 296, y: 57, w: 32, h: -9 }, { x: 328, y: 57, w: 32, h: -9 },
            { x: 328, y: 48, w: 32, h: -9 }, { x: 296, y: 48, w: 32, h: -9 }, { x: 264, y: 48, w: 32, h: -9 }, { x: 232, y: 48, w: 32, h: -9 },
            { x: 232, y: 39, w: 32, h: -9 }, { x: 264, y: 39, w: 32, h: -9 }, { x: 296, y: 39, w: 32, h: -9 }, { x: 328, y: 39, w: 32, h: -9 },
            { x: 248, y: 31, w: 49, h: -9 }, { x: 297, y: 31, w: 49, h: -9 }, { x: 265, y: 25, w: 65, h: -9 }
        ];

        for (let i = 0; i < Math.min(this.iglooSegments, 15); i++) {
            const s = segments[i];
            ctx.fillRect(s.x, s.y + s.h, s.w, Math.abs(s.h));
        }

        // Door (16th segment)
        if (this.iglooSegments === 16) {
            ctx.fillStyle = (this.isNight && (Date.now() % 400 < 200)) ? '#d98645' : '#000000';
            ctx.fillRect(276, 41, 35, 16);
            ctx.fillRect(281, 38, 25, 5);
        }
    }

    reverseRows() {
        if (this.iglooSegments >= 1) {
            // Only decrement cost if igloo is NOT fully complete (16)
            if (this.iglooSegments < 16) {
                this.iglooSegments--;
            }
            this.rows.forEach(row => row.direction *= -1);
        }
    }

    checkGoal(player, input) {
        if (this.iglooSegments === 16 && player.currentRow === -1) {
            // DoorX = 276. Hero must be within door range.
            if (player.x + player.width > 281 && player.x < 311) {
                // Só entra no iglu se apertar pra cima
                if (input && input.up) {
                    return true;
                }
            }
        }
        return false;
    }

}

window.Level = Level;
