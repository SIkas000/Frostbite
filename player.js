/**
 * Player Class for Frostbite Bailey
 */

class Player {
    constructor() {
        this.width = 30; // Original internal size
        this.height = 36;
        this.reset();

        this.speed = 0.4; // 10% slower movement (was 1.62)
        this.jumpDuration = 95; // 10% slower jump time (was 30)
    }

    reset() {
        this.x = 100;
        this.y = 90 - this.height; // Movido 15 pixels para cima (95 - 15)
        this.vx = 0;
        this.vy = 0;
        this.isJumping = false;
        this.jumpFrame = 0;
        this.currentRow = -1;
        this.facing = 'right';
        this.animFrame = 1;
        this.frameCount = 0;
        this.isGrabbed = false;
        this.isEnteringIgloo = false;
        this.iglooEntered = false;
        this.isDrowning = false;
        this.drownTimer = 0;
        this.drownFinished = false;
        this.isFreezing = false;
        this.freezeTimer = 0;
        this.freezeFinished = false;
        this.isChased = false;
        this.chaseFinished = false;
    }

    startFreezing() {
        this.isFreezing = true;
        this.freezeTimer = 180; // Duração: 3 segundos a 60fps
        this.freezeFinished = false;
        if (window.playSound) playSound('drowning');
    }

    updateFreezing() {
        this.freezeTimer--;
        if (this.freezeTimer <= 0) {
            this.freezeFinished = true;
        }
    }

    startBearChase(bear) {
        this.isChased = true;
        this.chaseFinished = false;
        this.isJumping = false; // Stop jumping logic
        this.chaseDelay = 25; // Aguarda frações de segundo para o jogador realmente "pousar/encostar" antes de iniciar a corrida
        
        // Direção oposta ao urso
        this.chaseDirection = (this.x >= bear.x) ? 1 : -1;
        this.facing = this.chaseDirection === 1 ? 'right' : 'left';
        
        // Redução da velocidade em mais de 35% (antes 2.5)
        this.vx = this.chaseDirection * 1.6; 
        
        if (window.playSound) playSound('jump');
    }

    updateBearChase(bear) {
        if (this.chaseDelay > 0) {
            this.chaseDelay--;
            if (bear) bear.speed = 0; // O urso para encarando o player
            return; // Espera finalizar o pequeno delay
        }

        this.x += this.vx;
        
        // Animação de corrida um pouco adaptada pra nova velocidade
        this.frameCount++;
        if (this.frameCount > 8) {
            this.animFrame = this.animFrame === 1 ? 3 : 1;
            this.frameCount = 0;
        }
        
        if (bear) {
            // Velocidade do urso reduzida em >35% (antes 2.1)
            bear.speed = this.chaseDirection * 1.35; 
            bear.isChasingOut = true;
        }

        // Verifica se fugiu totalmente da tela
        if ((this.chaseDirection === -1 && this.x < -this.width) || 
            (this.chaseDirection === 1 && this.x > 400)) {
            this.chaseFinished = true;
        }
    }

    startDrowning() {
        this.isDrowning = true;
        this.drownTimer = 300; // Duração: 5 segundos a 60fps (era 1 segundo)
        this.drownFinished = false;
        this.drownY = this.y;
        if (window.playSound) playSound('drowning');
    }

    updateDrowning() {
        this.drownTimer--;
        // Ele permanece na mesma posição Y onde morreu enquanto some pixel a pixel
        if (this.drownTimer <= 0) {
            this.drownFinished = true;
        }
    }

    jumpIntoIgloo() {
        if (this.isJumping) return;
        if (window.playSound) playSound('jump');
        this.isJumping = true;
        this.isEnteringIgloo = true;
        this.jumpFrame = 0;
        this.startRow = this.currentRow;
        this.targetRow = this.currentRow;
        this.startY = this.y;
        this.targetY = this.y; // Pula e cai no mesmo lugar, apenas imitando a entrada
    }

    update(input, level) {
        if (!this.isJumping) {
            // Horizontal movement
            if (!this.isGrabbed && input.left) {
                this.vx = -this.speed;
                this.facing = 'left';
                this.frameCount++;
            }
            else if (!this.isGrabbed && input.right) {
                this.vx = this.speed;
                this.facing = 'right';
                this.frameCount++;
            }
            else {
                this.vx = 0; // Para de se mover no eixo X
                if (!this.isGrabbed) {
                    this.animFrame = 1; // Volta para a pose inicial
                    this.frameCount = 0; // Garante que ao voltar a andar, comece do zero
                }
            }

            if (this.frameCount > 22) {
                this.animFrame = this.animFrame === 1 ? 2 : 1;
                this.frameCount = 0;
            }

            // Row snapping logic (if on a row, follow its movement)
            if (this.currentRow >= 0 && this.currentRow < 4) {
                const row = level.rows[this.currentRow];
                this.x += row.direction * row.speed * (level.speedMult || 1);
            }

            // Start Jump
            if (!this.isGrabbed && (input.up || input.down)) {
                const nextRow = input.up ? this.currentRow - 1 : this.currentRow + 1;
                if (nextRow >= -1 && nextRow <= 3) {
                    if (window.playSound) playSound('jump');
                    this.isJumping = true;
                    this.jumpFrame = 0;
                    this.startRow = this.currentRow;
                    this.targetRow = nextRow;
                    this.startY = this.y;
                    this.targetY = this.getTargetY(this.targetRow);
                }
            }
        } else {
            // Mid-air influence
            if (!this.isEnteringIgloo) {
                if (input.left) this.vx = -this.speed;
                else if (input.right) this.vx = this.speed;
                else this.vx = 0; // Parar de andar na horizontal se soltar o botão no ar
            } else {
                this.vx = 0; // Fica travado no eixo X enquanto faz a animação de entrar
            }

            this.jumpFrame++;
            const progress = this.jumpFrame / this.jumpDuration;

            const jumpHeight = 40;
            this.y = this.startY + (this.targetY - this.startY) * progress - Math.sin(progress * Math.PI) * jumpHeight;

            if (this.jumpFrame >= this.jumpDuration) {
                this.isJumping = false;
                this.currentRow = this.targetRow;
                this.y = this.targetY;
                if (this.isEnteringIgloo) {
                    this.iglooEntered = true; // Avisa o gameLoop que a animação acabou
                }
            }
        }

        this.x += this.vx;

        // Screen boundaries
        if (this.x < 0) this.x = 0;
        if (this.x > 400 - this.width) this.x = 400 - this.width;
    }

    getTargetY(row) {
        if (row === -1) return 80 - this.height; // Shore movido 15px acima da borda
        // Matching IceRowsDATA: 134, 173, 212, 251
        const rowYs = [134, 173, 212, 251];
        return rowYs[row] - this.height + 6;
    }

    draw(ctx) {
        if (this.iglooEntered) return; // Não desenha o player depois de entrar no iglu

        if (this.isDrowning) {
            ctx.save();
            let progress = 1 - (this.drownTimer / 300); // 0.0 a 1.0 (5 segundos)

            // Alternar lado a cada 1.2 segundos (72 frames)
            let currentFacing = (Math.floor(this.drownTimer / 72) % 2 === 0) ? 'left' : 'right';

            let yOffset = Math.floor(this.height * progress);
            let visibleHeight = this.height - yOffset;

            let spriteName = 'hero4_' + currentFacing;
            let pSprite = window.preRenderedSprites ? window.preRenderedSprites[spriteName] : null;

            if (pSprite && visibleHeight > 0) {
                ctx.drawImage(pSprite, 0, 0, this.width, visibleHeight, this.x, this.drownY + yOffset, this.width, visibleHeight);
            } else if (visibleHeight > 0) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(this.x, this.drownY + yOffset, this.width, visibleHeight);
            }

            ctx.restore();
            return;
        }

        if (this.isFreezing) {
            let progress = 1 - (this.freezeTimer / 180); // 0.0 a 1.0

            // Alternar lado a cada 1.2 segundos (72 frames)
            let currentFacing = (Math.floor(this.freezeTimer / 72) % 2 === 0) ? 'left' : 'right';

            let normalSpriteName = 'hero4_' + currentFacing;
            let frozenSpriteName = normalSpriteName + '_frozen';

            let normalSprite = window.preRenderedSprites ? window.preRenderedSprites[normalSpriteName] : null;
            let frozenSprite = window.preRenderedSprites ? window.preRenderedSprites[frozenSpriteName] : null;

            if (normalSprite && frozenSprite) {
                ctx.save();
                // Transição de cor (Normal para Frozen) mas sem desaparecer
                ctx.globalAlpha = 1 - progress;
                ctx.drawImage(normalSprite, this.x, this.y);

                ctx.globalAlpha = progress;
                ctx.drawImage(frozenSprite, this.x, this.y);
                ctx.restore();
            } else {
                ctx.fillStyle = progress > 0.5 ? '#1949a8' : '#fff';
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
            return;
        }

        let spriteName = 'hero' + this.animFrame + '_' + this.facing;

        // Se estiver pulando (e não entrando no iglu)
        if (this.isJumping && !this.isEnteringIgloo) {
            // Usa hero3 nos primeiros 1.2 segundos (72 frames), depois hero1
            if (this.jumpFrame < 72) {
                spriteName = 'hero3_' + this.facing;
            } else {
                spriteName = 'hero1_' + this.facing;
            }
        }

        let pSprite = window.preRenderedSprites ? window.preRenderedSprites[spriteName] : null;

        if (pSprite) {
            ctx.drawImage(pSprite, this.x, this.y);
        } else {
            // Fallback drawing if sprites.js failed
            ctx.fillStyle = '#fff';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

window.Player = Player;
