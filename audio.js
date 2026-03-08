const sfx = {
    jump: new Audio('song/jump.ogg'),
    block: new Audio('song/block.ogg'),
    iglooblock: new Audio('song/iglooblock.ogg'),
    drowning: new Audio('song/drowning.ogg'),
    fish: new Audio('song/fish.ogg'),
    scorecount: new Audio('song/scorecount.ogg')
};

function playSound(name) {
    if (sfx[name]) {
        if (name === 'drowning') {
            sfx[name].volume = 1;
            sfx[name].currentTime = 0;
            sfx[name].play().catch(() => { });
            return;
        }
        // Clone node para sons que sobrepõem (pulos, blocos, contagem)
        const soundClone = sfx[name].cloneNode();
        soundClone.volume = 1;
        soundClone.play().catch(() => { });
    }
}

function startLoop(name) {
    if (sfx[name]) {
        sfx[name].loop = true;
        sfx[name].volume = 1;
        sfx[name].play().catch(() => { });
    }
}

function stopLoop(name) {
    if (sfx[name]) {
        sfx[name].pause();
        sfx[name].currentTime = 0;
    }
}

window.playSound = playSound;
window.startLoop = startLoop;
window.stopLoop = stopLoop;
window.isDrowningFinished = () => {
    return sfx.drowning.ended || sfx.drowning.paused;
};
