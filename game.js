/**
 * Neon Snake - Game Logic & Sound Effects
 */

// --- Web Audio API Synth Sound Manager ---
class AudioManager {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playEat() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playGoldEat() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.06);
        osc.frequency.setValueAtTime(900, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);
        
        osc.start(now);
        osc.stop(now + 0.2);
    }

    playDie() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Lower dramatic synth tone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.6);
        
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        
        osc.start(now);
        osc.stop(now + 0.6);
    }

    playPause() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(450, now + 0.06);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        osc.start(now);
        osc.stop(now + 0.12);
    }
}

// --- Particle Explosion System ---
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        // Random velocity vector
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.radius = Math.random() * 3 + 1.5;
        this.color = color;
        this.alpha = 1.0;
        this.decay = Math.random() * 0.02 + 0.015;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- Game Logic ---
document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    
    const startScreen = document.getElementById("start-screen");
    const pauseScreen = document.getElementById("pause-screen");
    const gameOverScreen = document.getElementById("game-over-screen");
    
    const startBtn = document.getElementById("start-btn");
    const resumeBtn = document.getElementById("resume-btn");
    const restartBtn = document.getElementById("restart-btn");
    
    const currentScoreEl = document.getElementById("current-score");
    const highScoreEl = document.getElementById("high-score");
    const finalScoreEl = document.getElementById("final-score");
    const newHighScoreBanner = document.getElementById("new-high-score-banner");
    
    const wallWrapCheckbox = document.getElementById("wall-wrap");
    const wrapStatusText = document.getElementById("wrap-status");
    const difficultyGroup = document.getElementById("difficulty-group");
    
    // Virtual D-pad controls
    const ctrlUp = document.getElementById("ctrl-up");
    const ctrlDown = document.getElementById("ctrl-down");
    const ctrlLeft = document.getElementById("ctrl-left");
    const ctrlRight = document.getElementById("ctrl-right");

    const audio = new AudioManager();

    // Game Configuration
    const GRID_SIZE = 20; // Size of each cell in pixels
    const COLS = canvas.width / GRID_SIZE; // 30 columns
    const ROWS = canvas.height / GRID_SIZE; // 30 rows

    // Speeds in milliseconds per tick
    const DIFFICULTIES = {
        easy: 110,
        medium: 75,
        hard: 50
    };

    // State Variables
    let currentDifficulty = "medium";
    let wrapWalls = false;
    let gameState = "START"; // START, PLAYING, PAUSED, GAMEOVER
    
    let snake = [];
    let dx = 1; // Start moving right
    let dy = 0;
    let nextDx = dx;
    let nextDy = dy;
    let changingDirection = false;
    
    let food = { x: 0, y: 0 };
    let goldFood = null; // { x: 0, y: 0, timer: 0, maxTimer: 5000 }
    
    let score = 0;
    let highScore = parseInt(localStorage.getItem("neon-snake-high-score")) || 0;
    highScoreEl.textContent = formatScore(highScore);

    let particles = [];
    let lastTickTime = 0;
    let animationFrameId = null;

    // Special effects
    let rainbowMode = false;
    let rainbowTimer = 0;

    // Initialize Menu Click Listeners
    difficultyGroup.addEventListener("click", (e) => {
        if (e.target.tagName === "BUTTON") {
            Array.from(difficultyGroup.children).forEach(btn => btn.classList.remove("active"));
            e.target.classList.add("active");
            currentDifficulty = e.target.dataset.value;
        }
    });

    wallWrapCheckbox.addEventListener("change", (e) => {
        wrapWalls = e.target.checked;
        wrapStatusText.textContent = wrapWalls ? "穿牆開啟 (無限)" : "穿牆關閉 (阻擋)";
    });

    startBtn.addEventListener("click", () => {
        audio.init();
        startGame();
    });

    resumeBtn.addEventListener("click", () => {
        togglePause();
    });

    restartBtn.addEventListener("click", () => {
        startGame();
    });

    // Touch D-Pad Events
    ctrlUp.addEventListener("touchstart", (e) => { e.preventDefault(); changeDirection(0, -1); });
    ctrlDown.addEventListener("touchstart", (e) => { e.preventDefault(); changeDirection(0, 1); });
    ctrlLeft.addEventListener("touchstart", (e) => { e.preventDefault(); changeDirection(-1, 0); });
    ctrlRight.addEventListener("touchstart", (e) => { e.preventDefault(); changeDirection(1, 0); });

    ctrlUp.addEventListener("mousedown", () => changeDirection(0, -1));
    ctrlDown.addEventListener("mousedown", () => changeDirection(0, 1));
    ctrlLeft.addEventListener("mousedown", () => changeDirection(-1, 0));
    ctrlRight.addEventListener("mousedown", () => changeDirection(1, 0));

    // Keyboard Events
    window.addEventListener("keydown", handleKeydown);

    // Prevent arrow key & space scrolling
    window.addEventListener("keydown", (e) => {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
            e.preventDefault();
        }
    }, { passive: false });

    // Format scores into 3-digit strings (e.g. 008, 142)
    function formatScore(val) {
        return String(val).padStart(3, '0');
    }

    // Initialize/Start game variables
    function startGame() {
        // Hide screens
        startScreen.classList.remove("active");
        pauseScreen.classList.remove("active");
        gameOverScreen.classList.remove("active");
        newHighScoreBanner.classList.add("hidden");

        // Reset state variables
        score = 0;
        currentScoreEl.textContent = formatScore(score);
        
        // Initial snake setup: starting in center moving right, length 4
        const startX = Math.floor(COLS / 2);
        const startY = Math.floor(ROWS / 2);
        snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
            { x: startX - 3, y: startY }
        ];

        dx = 1;
        dy = 0;
        nextDx = 1;
        nextDy = 0;
        changingDirection = false;
        particles = [];
        goldFood = null;
        rainbowMode = false;
        rainbowTimer = 0;

        spawnFood();

        gameState = "PLAYING";
        lastTickTime = performance.now();
        
        // Start main animation loop
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    // Main game loop (Syncs ticks with requestAnimationFrame)
    function gameLoop(timestamp) {
        if (gameState !== "PLAYING" && gameState !== "PAUSED") return;

        // Render particles and food at maximum monitor frame rate (for smoothness)
        renderFrame();

        if (gameState === "PLAYING") {
            const timeDiff = timestamp - lastTickTime;
            // Get speed duration based on current difficulty
            let tickDelay = DIFFICULTIES[currentDifficulty];
            
            // Speed up slightly when in rainbow/overload mode
            if (rainbowMode) {
                tickDelay = Math.floor(tickDelay * 0.85);
            }

            if (timeDiff >= tickDelay) {
                tick();
                lastTickTime = timestamp;
            }
        }

        animationFrameId = requestAnimationFrame(gameLoop);
    }

    // Game single physics tick
    function tick() {
        changingDirection = false;
        dx = nextDx;
        dy = nextDy;

        // Calculate new head position
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };

        // Handle wall collisions / wraps
        if (wrapWalls) {
            if (head.x >= COLS) head.x = 0;
            if (head.x < 0) head.x = COLS - 1;
            if (head.y >= ROWS) head.y = 0;
            if (head.y < 0) head.y = ROWS - 1;
        } else {
            if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
                endGame();
                return;
            }
        }

        // Check self-collision
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                endGame();
                return;
            }
        }

        // Add new head segment
        snake.unshift(head);

        // Check eating regular food
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            currentScoreEl.textContent = formatScore(score);
            
            createExplosion(
                food.x * GRID_SIZE + GRID_SIZE / 2,
                food.y * GRID_SIZE + GRID_SIZE / 2,
                "#00f0ff", // cyan sparks
                15
            );
            
            audio.playEat();
            spawnFood();
            
            // Randomly trigger gold food spawning (15% chance, if no gold food active)
            if (!goldFood && Math.random() < 0.15) {
                spawnGoldFood();
            }
        } 
        // Check eating gold food
        else if (goldFood && head.x === goldFood.x && head.y === goldFood.y) {
            score += 30;
            currentScoreEl.textContent = formatScore(score);
            
            // Trigger Rainbow speed mode
            rainbowMode = true;
            rainbowTimer = 40; // ticks remaining of boost
            
            createExplosion(
                goldFood.x * GRID_SIZE + GRID_SIZE / 2,
                goldFood.y * GRID_SIZE + GRID_SIZE / 2,
                "#ffd166", // yellow gold sparks
                30
            );
            
            audio.playGoldEat();
            goldFood = null;
        } 
        else {
            // Remove tail segment if food wasn't eaten
            snake.pop();
        }

        // Handle Gold Food timer ticking
        if (goldFood) {
            goldFood.timer -= DIFFICULTIES[currentDifficulty];
            if (goldFood.timer <= 0) {
                // Decay burst effect on expire
                createExplosion(
                    goldFood.x * GRID_SIZE + GRID_SIZE / 2,
                    goldFood.y * GRID_SIZE + GRID_SIZE / 2,
                    "rgba(255, 209, 102, 0.4)",
                    8
                );
                goldFood = null;
            }
        }

        // Rainbow mode countdown
        if (rainbowMode) {
            rainbowTimer--;
            if (rainbowTimer <= 0) {
                rainbowMode = false;
            }
        }
    }

    // Handles key inputs
    function handleKeydown(e) {
        // Space bar for Pause / Resume
        if (e.code === "Space") {
            if (gameState === "PLAYING" || gameState === "PAUSED") {
                togglePause();
            } else if (gameState === "START" || gameState === "GAMEOVER") {
                startGame();
            }
            return;
        }

        if (gameState !== "PLAYING") return;

        switch (e.code) {
            case "ArrowUp":
            case "KeyW":
                changeDirection(0, -1);
                break;
            case "ArrowDown":
            case "KeyS":
                changeDirection(0, 1);
                break;
            case "ArrowLeft":
            case "KeyA":
                changeDirection(-1, 0);
                break;
            case "ArrowRight":
            case "KeyD":
                changeDirection(1, 0);
                break;
        }
    }

    // Direction changes safety check
    function changeDirection(newDx, newDy) {
        if (changingDirection) return;

        // Block 180 degree instant flips (e.g. left to right)
        if (newDx !== 0 && dx !== 0) return;
        if (newDy !== 0 && dy !== 0) return;

        nextDx = newDx;
        nextDy = newDy;
        changingDirection = true;
    }

    // Spawns standard food
    function spawnFood() {
        let spawned = false;
        while (!spawned) {
            const rx = Math.floor(Math.random() * COLS);
            const ry = Math.floor(Math.random() * ROWS);
            
            // Check if coordinates overlap with snake body
            const collision = snake.some(segment => segment.x === rx && segment.y === ry);
            if (!collision) {
                food = { x: rx, y: ry };
                spawned = true;
            }
        }
    }

    // Spawns premium golden food
    function spawnGoldFood() {
        let spawned = false;
        let attempts = 0;
        while (!spawned && attempts < 100) {
            attempts++;
            const rx = Math.floor(Math.random() * COLS);
            const ry = Math.floor(Math.random() * ROWS);
            
            // Make sure not overlapping snake or regular food
            const collision = snake.some(segment => segment.x === rx && segment.y === ry) ||
                              (food.x === rx && food.y === ry);
            
            if (!collision) {
                goldFood = {
                    x: rx,
                    y: ry,
                    timer: 5000, // 5 seconds duration
                    maxTimer: 5000
                };
                spawned = true;
            }
        }
    }

    // Creates particle explosion list
    function createExplosion(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    // Handle pausing game
    function togglePause() {
        if (gameState === "PLAYING") {
            gameState = "PAUSED";
            pauseScreen.classList.add("active");
            audio.playPause();
        } else if (gameState === "PAUSED") {
            gameState = "PLAYING";
            pauseScreen.classList.remove("active");
            lastTickTime = performance.now();
            audio.playPause();
        }
    }

    // Handles game over sequence
    function endGame() {
        gameState = "GAMEOVER";
        audio.playDie();
        
        finalScoreEl.textContent = score;
        gameOverScreen.classList.add("active");

        // Save High Scores
        if (score > highScore) {
            highScore = score;
            localStorage.setItem("neon-snake-high-score", highScore);
            highScoreEl.textContent = formatScore(highScore);
            newHighScoreBanner.classList.remove("hidden");
        }
        
        // Clean frame animation loops
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
    }

    // --- CANVAS RENDERING METHODS ---
    function renderFrame() {
        // 1. Clear Screen
        ctx.fillStyle = "#070714";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Draw Subtle Grid Pattern
        drawGridPattern();

        // 3. Update & Draw Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].alpha <= 0) {
                particles.splice(i, 1);
            } else {
                particles[i].draw(ctx);
            }
        }

        // 4. Draw Regular Food
        drawFood();

        // 5. Draw Gold Food (with circular countdown)
        drawGoldFood();

        // 6. Draw Glowing Snake
        drawSnake();
    }

    function drawGridPattern() {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
        ctx.lineWidth = 1;
        
        // Draw vertical grid lines
        for (let i = 1; i < COLS; i++) {
            ctx.beginPath();
            ctx.moveTo(i * GRID_SIZE, 0);
            ctx.lineTo(i * GRID_SIZE, canvas.height);
            ctx.stroke();
        }

        // Draw horizontal grid lines
        for (let i = 1; i < ROWS; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * GRID_SIZE);
            ctx.lineTo(canvas.width, i * GRID_SIZE);
            ctx.stroke();
        }
        
        // Add cyber border glow effect around canvas inner edge
        ctx.strokeStyle = rainbowMode ? "rgba(255, 209, 102, 0.2)" : "rgba(0, 240, 255, 0.15)";
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    }

    function drawFood() {
        ctx.save();
        const centerX = food.x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = food.y * GRID_SIZE + GRID_SIZE / 2;
        const radius = GRID_SIZE / 2 - 3;
        
        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00f0ff";
        
        // Dynamic pulse radius scaling
        const pulse = 1 + Math.sin(performance.now() * 0.01) * 0.1;

        ctx.fillStyle = "#00f0ff";
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Inner glowing core
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    function drawGoldFood() {
        if (!goldFood) return;
        
        ctx.save();
        const centerX = goldFood.x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = goldFood.y * GRID_SIZE + GRID_SIZE / 2;
        const radius = GRID_SIZE / 2 - 2;

        // Glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#ffd166";
        
        // Flashing frequency rate
        const pulse = 1 + Math.sin(performance.now() * 0.02) * 0.15;

        // Draw Golden Diamond Food Core
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius * pulse);
        ctx.lineTo(centerX + radius * pulse, centerY);
        ctx.lineTo(centerX, centerY + radius * pulse);
        ctx.lineTo(centerX - radius * pulse, centerY);
        ctx.closePath();
        ctx.fill();

        // Inner shining white diamond
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius * 0.4);
        ctx.lineTo(centerX + radius * 0.4, centerY);
        ctx.lineTo(centerX, centerY + radius * 0.4);
        ctx.lineTo(centerX - radius * 0.4, centerY);
        ctx.closePath();
        ctx.fill();

        // Draw Countdown Ring (Decreasing circle arc around food)
        ctx.strokeStyle = "rgba(255, 209, 102, 0.6)";
        ctx.lineWidth = 2;
        const percent = goldFood.timer / goldFood.maxTimer;
        ctx.beginPath();
        ctx.arc(centerX, centerY, GRID_SIZE - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * percent);
        ctx.stroke();

        ctx.restore();
    }

    function drawSnake() {
        for (let i = 0; i < snake.length; i++) {
            const segment = snake[i];
            const px = segment.x * GRID_SIZE;
            const py = segment.y * GRID_SIZE;

            ctx.save();

            // Establish color gradient styling from head (pink) to tail (cyan)
            let color = "";
            let glow = "";
            
            if (rainbowMode) {
                // Gold/Rainbow overload color shift
                const hue = (performance.now() * 0.2 + i * 15) % 360;
                color = `hsl(${hue}, 90%, 65%)`;
                glow = `hsl(${hue}, 90%, 55%)`;
            } else {
                // Dynamic Pink to Cyan gradient based on index ratio
                const ratio = i / Math.max(1, snake.length - 1);
                
                // Color interpolation: pink (#ff007f) to cyan (#00f0ff)
                const r = Math.floor(255 - ratio * 255);
                const g = Math.floor(0 + ratio * 240);
                const b = Math.floor(127 + ratio * 128);
                color = `rgb(${r}, ${g}, ${b})`;
                glow = color;
            }

            ctx.shadowBlur = i === 0 ? 15 : 8;
            ctx.shadowColor = glow;
            ctx.fillStyle = color;

            // Rounded block style for snake segments
            const isHead = i === 0;
            const size = isHead ? GRID_SIZE - 1 : GRID_SIZE - 3;
            const offset = isHead ? 0.5 : 1.5;
            
            drawRoundedRect(
                px + offset, 
                py + offset, 
                size, 
                size, 
                isHead ? 6 : 4
            );
            
            ctx.fill();

            // Draw eyes on the Snake Head segment
            if (isHead) {
                ctx.shadowBlur = 0;
                ctx.fillStyle = "#ffffff";
                
                let eyeSize = 3;
                let eyeOffset1 = 5;
                let eyeOffset2 = 12;

                // Adjust eye positions based on movement direction
                if (dx === 1) { // Moving Right
                    ctx.fillRect(px + 12, py + eyeOffset1, eyeSize, eyeSize);
                    ctx.fillRect(px + 12, py + eyeOffset2, eyeSize, eyeSize);
                } else if (dx === -1) { // Moving Left
                    ctx.fillRect(px + 5, py + eyeOffset1, eyeSize, eyeSize);
                    ctx.fillRect(px + 5, py + eyeOffset2, eyeSize, eyeSize);
                } else if (dy === 1) { // Moving Down
                    ctx.fillRect(px + eyeOffset1, py + 12, eyeSize, eyeSize);
                    ctx.fillRect(px + eyeOffset2, py + 12, eyeSize, eyeSize);
                } else if (dy === -1) { // Moving Up
                    ctx.fillRect(px + eyeOffset1, py + 5, eyeSize, eyeSize);
                    ctx.fillRect(px + eyeOffset2, py + 5, eyeSize, eyeSize);
                }
            }

            ctx.restore();
        }
    }

    // Helper: Rounded rectangles drawing on 2D context
    function drawRoundedRect(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
});
