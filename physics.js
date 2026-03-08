/**
 * Physics and Utility Functions for Frostbite Web Tribute
 */

const Physics = {
    /**
     * Simple AABB Collision Detection
     */
    checkCollision: function(rect1, rect2) {
        // Encolher Hitbox (Margem interna / Inset) para não dar contato por "vento" ou área sobrando.
        const shrinkX1 = 6;
        const shrinkX2 = 6;
        const shrinkY = 4;
        
        return rect1.x + shrinkX1 < rect2.x + rect2.width - shrinkX2 &&
               rect1.x + rect1.width - shrinkX1 > rect2.x + shrinkX2 &&
               rect1.y + shrinkY < rect2.y + rect2.height - shrinkY &&
               rect1.y + rect1.height - shrinkY > rect2.y + shrinkY;
    },

    /**
     * Map value from one range to another
     */
    map: function(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    },

    /**
     * Clamp value between min and max
     */
    clamp: function(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
};

window.Physics = Physics;
