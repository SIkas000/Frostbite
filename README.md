# Frostbite Web Tribute

A playable clone of the 1983 Atari 2600 classic **Frostbite**, built for the web using HTML5 Canvas and Vanilla JavaScript.

## Features
- **Faithful Mechanics:** All original movement, scoring, and enemy behaviors.
- **Pixel Perfect:** 4x scaled pixel art with `image-rendering: pixelated`.
- **Dynamic Physics:** Curved jumping just like the original.
- **Progressive Difficulty:** Day/Night cycles and increasing enemy speed.

## Controls
- **Arrow Keys / WASD:** Move Frostbite Bailey.
- **Space:** Reverse the direction of the ice floes (costs 1 igloo block).

## Technical Stack
- HTML5 Canvas
- Vanilla JavaScript
- Plain CSS

## Project Structure
- `index.html`: Main entry point.
- `style.css`: Visual styling and layout.
- `game.js`: Core game loop and state.
- `player.js`: Player logic and physics.
- `enemies.js`: Enemy AI and spawning.
- `physics.js`: Shared collision and physics utilities.
- `level.js`: Ice floes, Igloo, and level state.
