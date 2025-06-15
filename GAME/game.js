const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const message = document.getElementById('message');

// Game constants
const BLOCK_SIZE = 8;
const PLAYER_SIZE = 16;
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const CAMERA_SMOOTHING = 0.1;

// Camera object
const camera = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0
};

// Player object
const player = {
    x: 50,
    y: 300,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    velocityX: 0,
    velocityY: 0,
    isJumping: false,
    color: '#4a90e2',
    // Animation properties
    legAngle: 0,
    animationSpeed: 0.15,
    isMoving: false,
    direction: 1,
    // Jump animation properties
    jumpProgress: 0,
    squashAmount: 0,
    wasJumping: false
};

// Platform types
const PLATFORM_TYPES = {
    SPAWN: {
        colors: ['#2ecc71', '#27ae60'],
        isDangerous: false
    },
    BRICK: {
        colors: ['#666666', '#888888'],
        isDangerous: false
    },
    MAGMA: {
        colors: ['#ff4400', '#ff8800'],
        isDangerous: true
    }
};

// Game platforms
const platforms = [
    // Spawn area
    { x: 0, y: 400, width: 100, type: 'SPAWN' },
    { x: 150, y: 400, width: 80, type: 'BRICK' },
    
    // First challenge - small height changes
    { x: 280, y: 380, width: 60, type: 'BRICK' },
    { x: 390, y: 400, width: 60, type: 'BRICK' },
    
    // First magma challenge
    { x: 500, y: 380, width: 60, type: 'MAGMA' },
    { x: 610, y: 400, width: 100, type: 'BRICK' },
    
    // Second challenge - gentle ups and downs
    { x: 760, y: 420, width: 60, type: 'BRICK' },
    { x: 870, y: 400, width: 60, type: 'BRICK' },
    
    // Second magma challenge
    { x: 980, y: 380, width: 60, type: 'MAGMA' },
    { x: 1090, y: 400, width: 100, type: 'BRICK' },
    
    // Third challenge - small variations
    { x: 1240, y: 420, width: 60, type: 'BRICK' },
    { x: 1350, y: 400, width: 60, type: 'BRICK' },
    
    // Third magma challenge
    { x: 1460, y: 380, width: 60, type: 'MAGMA' },
    { x: 1570, y: 400, width: 100, type: 'BRICK' },
    
    // Fourth challenge - easy jumps
    { x: 1720, y: 420, width: 60, type: 'BRICK' },
    { x: 1830, y: 400, width: 60, type: 'BRICK' },
    
    // Fourth magma challenge
    { x: 1940, y: 380, width: 60, type: 'MAGMA' },
    { x: 2050, y: 400, width: 100, type: 'BRICK' },
    
    // Fifth challenge - final platforms
    { x: 2200, y: 420, width: 60, type: 'BRICK' },
    { x: 2310, y: 400, width: 60, type: 'BRICK' },
    
    // Fifth magma challenge
    { x: 2420, y: 380, width: 60, type: 'MAGMA' },
    { x: 2530, y: 400, width: 100, type: 'BRICK' },
    
    // Final approach
    { x: 2680, y: 400, width: 60, type: 'BRICK' },
    
    // Final platform with chest
    { x: 2790, y: 400, width: 100, type: 'BRICK' }
];

// Chest object
const chest = {
    x: 2500,
    y: 350,  // This will be the platform's y position minus the chest's height
    width: 40,
    height: 20,
    isOpen: false,
    color: '#8B4513'
};

// Game state
let gameWon = false;
let keys = {};

// Event listeners
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Background elements
const background = {
    wallPattern: [
        [1, 1, 0, 1, 1, 0, 1, 1],
        [1, 0, 1, 1, 0, 1, 1, 0],
        [0, 1, 1, 0, 1, 1, 0, 1],
        [1, 1, 0, 1, 1, 0, 1, 1],
        [1, 0, 1, 1, 0, 1, 1, 0],
        [0, 1, 1, 0, 1, 1, 0, 1],
        [1, 1, 0, 1, 1, 0, 1, 1],
        [1, 0, 1, 1, 0, 1, 1, 0]
    ],
    torches: [],
    lastTorchX: 0,
    // Lava properties
    lavaOffset: 0,
    lavaBubbles: []
};

// Initialize torches
function initializeTorches() {
    const torchSpacing = 400;
    for (let x = 200; x < 3000; x += torchSpacing) {
        background.torches.push({
            x: x,
            y: 100,
            flickerOffset: Math.random() * Math.PI * 2
        });
    }
}

// Initialize lava bubbles
function initializeLavaBubbles() {
    for (let i = 0; i < 20; i++) {
        background.lavaBubbles.push({
            x: Math.random() * 3000,
            y: Math.random() * 50,
            size: Math.random() * 10 + 5,
            speed: Math.random() * 0.5 + 0.2,
            offset: Math.random() * Math.PI * 2
        });
    }
}

// Draw functions
function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - camera.x, y - camera.y, BLOCK_SIZE, BLOCK_SIZE);
}

function drawPlatform(platform) {
    const type = PLATFORM_TYPES[platform.type];
    for (let i = 0; i < platform.width; i += BLOCK_SIZE) {
        const color = type.colors[Math.floor(i / BLOCK_SIZE) % 2];
        drawBlock(platform.x + i, platform.y, color);
    }
}

function drawPlayer() {
    // Calculate squash effect
    const squash = 1 - Math.min(1, player.squashAmount);
    const stretch = 1 + Math.min(0.2, player.squashAmount);
    
    // Draw backpack first (so it appears behind the player)
    const backpackWidth = 10;
    const backpackHeight = 12;
    const backpackX = player.x - camera.x - 4;
    const backpackY = player.y - camera.y + player.height/3;
    
    // Backpack base
    ctx.fillStyle = '#8B4513';  // Brown color
    ctx.fillRect(backpackX, backpackY, backpackWidth, backpackHeight);
    
    // Backpack straps
    ctx.fillStyle = '#654321';  // Darker brown
    // Left strap
    ctx.fillRect(backpackX - 2, backpackY + 2, 2, 4);
    // Right strap
    ctx.fillRect(backpackX + backpackWidth, backpackY + 2, 2, 4);
    
    // Backpack details
    ctx.fillStyle = '#A0522D';  // Lighter brown
    // Pocket
    ctx.fillRect(backpackX + 2, backpackY + 3, 6, 4);
    // Buckle
    ctx.fillStyle = '#DAA520';  // Golden color
    ctx.fillRect(backpackX + 3, backpackY + 1, 4, 2);
    
    // Draw player body with squash/stretch (now drawn after backpack)
    ctx.fillStyle = player.color;
    ctx.save();
    ctx.translate(player.x - camera.x + player.width/2, player.y - camera.y + player.height);
    ctx.scale(squash, stretch);
    ctx.fillRect(-player.width/2, -player.height, player.width, player.height);
    ctx.restore();
    
    // Draw eyes (adjusted for squash)
    ctx.fillStyle = 'white';
    // Left eye
    ctx.beginPath();
    ctx.arc(player.x - camera.x + 4, player.y - camera.y + 4 * stretch, 2, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.arc(player.x - camera.x + 12, player.y - camera.y + 4 * stretch, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw pupils
    ctx.fillStyle = 'black';
    // Left pupil
    ctx.beginPath();
    ctx.arc(player.x - camera.x + 4, player.y - camera.y + 4 * stretch, 1, 0, Math.PI * 2);
    ctx.fill();
    // Right pupil
    ctx.beginPath();
    ctx.arc(player.x - camera.x + 12, player.y - camera.y + 4 * stretch, 1, 0, Math.PI * 2);
    ctx.fill();

    // Draw legs and feet
    ctx.fillStyle = player.color;
    const legWidth = 4;
    const legHeight = 8;
    const footWidth = 6;
    const footHeight = 2;
    
    // Update animation
    if (player.isMoving && !player.isJumping) {
        player.legAngle += player.animationSpeed * player.direction;
        if (Math.abs(player.legAngle) > 0.5) {
            player.direction *= -1;
        }
    } else if (player.isJumping) {
        // Tuck legs during jump
        player.legAngle = Math.min(0.8, player.legAngle + 0.1);
    } else {
        // Smoothly return legs to neutral position
        if (player.legAngle !== 0) {
            player.legAngle *= 0.8;
            if (Math.abs(player.legAngle) < 0.01) {
                player.legAngle = 0;
            }
        }
    }
    
    // Calculate leg positions based on animation
    const leftLegX = player.x - camera.x + 4;
    const rightLegX = player.x - camera.x + 12;
    const legY = player.y - camera.y + player.height;
    
    // Find the platform the player is standing on
    let standingPlatform = null;
    for (const platform of platforms) {
        if (player.x + player.width > platform.x &&
            player.x < platform.x + platform.width &&
            Math.abs(player.y + player.height - platform.y) < 5) {
            standingPlatform = platform;
            break;
        }
    }
    
    // Draw left leg and foot
    ctx.save();
    ctx.translate(leftLegX, legY);
    const leftLegRotation = Math.sin(player.legAngle) * 0.4;
    ctx.rotate(leftLegRotation);
    
    // Calculate leg length based on platform collision
    let leftLegLength = legHeight;
    if (standingPlatform && !player.isJumping) {
        const legEndX = leftLegX + Math.sin(leftLegRotation) * legHeight;
        const legEndY = legY + Math.cos(leftLegRotation) * legHeight;
        if (legEndY > standingPlatform.y - camera.y) {
            leftLegLength = (standingPlatform.y - camera.y - legY) / Math.cos(leftLegRotation);
        }
    }
    
    ctx.fillRect(-legWidth/2, 0, legWidth, leftLegLength * (player.isJumping ? 0.7 : 1));
    // Draw foot
    ctx.fillRect(-footWidth/2, leftLegLength * (player.isJumping ? 0.7 : 1), footWidth, footHeight);
    ctx.restore();
    
    // Draw right leg and foot
    ctx.save();
    ctx.translate(rightLegX, legY);
    const rightLegRotation = -Math.sin(player.legAngle) * 0.4;
    ctx.rotate(rightLegRotation);
    
    // Calculate leg length based on platform collision
    let rightLegLength = legHeight;
    if (standingPlatform && !player.isJumping) {
        const legEndX = rightLegX + Math.sin(rightLegRotation) * legHeight;
        const legEndY = legY + Math.cos(rightLegRotation) * legHeight;
        if (legEndY > standingPlatform.y - camera.y) {
            rightLegLength = (standingPlatform.y - camera.y - legY) / Math.cos(rightLegRotation);
        }
    }
    
    ctx.fillRect(-legWidth/2, 0, legWidth, rightLegLength * (player.isJumping ? 0.7 : 1));
    // Draw foot
    ctx.fillRect(-footWidth/2, rightLegLength * (player.isJumping ? 0.7 : 1), footWidth, footHeight);
    ctx.restore();
}

function drawChest() {
    const screenX = chest.x - camera.x;
    const screenY = chest.y - camera.y;
    
    // Only draw if on screen
    if (screenX > -100 && screenX < canvas.width + 100) {
        // Draw chest shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX + chest.width/2, screenY + chest.height + 2, 
                   chest.width/2, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw chest base
        ctx.fillStyle = '#8B4513';  // Saddle brown
        ctx.fillRect(screenX, screenY, chest.width, chest.height);
        
        // Draw metal bands
        ctx.fillStyle = '#696969';  // Dark gray
        // Horizontal bands
        ctx.fillRect(screenX, screenY + 6, chest.width, 2);
        ctx.fillRect(screenX, screenY + chest.height - 8, chest.width, 2);
        // Vertical bands
        ctx.fillRect(screenX + 15, screenY, 2, chest.height);
        ctx.fillRect(screenX + chest.width - 17, screenY, 2, chest.height);
        
        // Draw lock
        ctx.fillStyle = '#4A4A4A';  // Darker gray
        ctx.fillRect(screenX + chest.width/2 - 6, screenY + 8, 12, 8);
        // Lock keyhole
        ctx.fillStyle = '#2F2F2F';
        ctx.beginPath();
        ctx.arc(screenX + chest.width/2, screenY + 12, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw chest lid (flatter)
        ctx.fillStyle = '#A0522D';  // Sienna
        ctx.beginPath();
        ctx.moveTo(screenX - 2, screenY);
        ctx.lineTo(screenX + chest.width + 2, screenY);
        ctx.lineTo(screenX + chest.width, screenY - 6);
        ctx.lineTo(screenX, screenY - 6);
        ctx.closePath();
        ctx.fill();
        
        // Draw lid metal band
        ctx.fillStyle = '#696969';
        ctx.fillRect(screenX, screenY - 6, chest.width, 1);
        
        // Draw lid handle
        ctx.fillStyle = '#4A4A4A';
        ctx.fillRect(screenX + chest.width/2 - 10, screenY - 10, 20, 3);
        
        // Add wood grain texture
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(screenX + 20 + i * 20, screenY);
            ctx.lineTo(screenX + 20 + i * 20, screenY + chest.height);
            ctx.stroke();
        }
        
        // Add highlights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(screenX + 1, screenY + 1, chest.width - 2, 1);
        ctx.fillRect(screenX + 1, screenY + 1, 1, chest.height - 2);
    }
}

// Camera functions
function updateCamera() {
    // Calculate target position (center on player)
    camera.targetX = player.x - canvas.width / 2;
    camera.targetY = player.y - canvas.height / 2;
    
    // Smoothly move camera
    camera.x += (camera.targetX - camera.x) * CAMERA_SMOOTHING;
    camera.y += (camera.targetY - camera.y) * CAMERA_SMOOTHING;
    
    // Clamp camera to level boundaries
    camera.x = Math.max(0, Math.min(camera.x, 2900 - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, 600 - canvas.height));
}

// Confetti configuration
const confettiConfig = {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
};

// Function to trigger confetti
function triggerConfetti() {
    // Multiple bursts of confetti
    confetti({
        ...confettiConfig,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
    });
    
    confetti({
        ...confettiConfig,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
    });
    
    // Center burst
    confetti({
        ...confettiConfig,
        spread: 100,
        origin: { x: 0.5, y: 0.5 }
    });
}

// Bat obstacles
const bats = [
    {
        x: 2000,
        y: 300,
        width: 16,
        height: 12,
        speedY: 2,
        range: 100,
        startY: 300,
        wingAngle: 0,
        wingSpeed: 0.2
    },
    {
        x: 2200,
        y: 350,
        width: 16,
        height: 12,
        speedY: 1.5,
        range: 80,
        startY: 350,
        wingAngle: Math.PI,
        wingSpeed: 0.15
    },
    {
        x: 2400,
        y: 320,
        width: 16,
        height: 12,
        speedY: 2.5,
        range: 120,
        startY: 320,
        wingAngle: Math.PI/2,
        wingSpeed: 0.25
    }
];

// Function to draw a bat
function drawBat(bat) {
    const screenX = bat.x - camera.x;
    const screenY = bat.y - camera.y;
    
    // Only draw if on screen
    if (screenX > -50 && screenX < canvas.width + 50) {
        // Draw bat body
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.ellipse(screenX + bat.width/2, screenY + bat.height/2, 
                   bat.width/2, bat.height/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw wings
        ctx.fillStyle = '#222222';
        // Left wing
        ctx.save();
        ctx.translate(screenX + bat.width/2, screenY + bat.height/2);
        ctx.rotate(Math.sin(bat.wingAngle) * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-15, -10, -20, 0);
        ctx.quadraticCurveTo(-15, 10, 0, 0);
        ctx.fill();
        ctx.restore();
        
        // Right wing
        ctx.save();
        ctx.translate(screenX + bat.width/2, screenY + bat.height/2);
        ctx.rotate(-Math.sin(bat.wingAngle) * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(15, -10, 20, 0);
        ctx.quadraticCurveTo(15, 10, 0, 0);
        ctx.fill();
        ctx.restore();
        
        // Draw eyes
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(screenX + bat.width/2 - 2, screenY + bat.height/2 - 1, 1, 0, Math.PI * 2);
        ctx.arc(screenX + bat.width/2 + 2, screenY + bat.height/2 - 1, 1, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Function to update bat positions
function updateBats() {
    bats.forEach(bat => {
        // Update wing animation
        bat.wingAngle += bat.wingSpeed;
        
        // Update position
        bat.y += bat.speedY;
        
        // Reverse direction if reached range limits
        if (Math.abs(bat.y - bat.startY) > bat.range) {
            bat.speedY *= -1;
        }
        
        // Check collision with player
        if (player.x + player.width > bat.x &&
            player.x < bat.x + bat.width &&
            player.y + player.height > bat.y &&
            player.y < bat.y + bat.height) {
            resetGame();
        }
    });
}

// Game logic
function updatePlayer() {
    // Horizontal movement
    if (keys['a']) {
        player.velocityX = -MOVE_SPEED;
        player.isMoving = true;
        player.direction = -1;
    } else if (keys['d']) {
        player.velocityX = MOVE_SPEED;
        player.isMoving = true;
        player.direction = 1;
    } else {
        player.velocityX = 0;
        player.isMoving = false;
    }
    
    // Jumping
    if (keys['w'] && !player.isJumping) {
        player.velocityY = JUMP_FORCE;
        player.isJumping = true;
        player.wasJumping = true;
    }
    
    // Apply gravity
    player.velocityY += GRAVITY;

    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;
    
    // Check lava collision
    const lavaY = canvas.height - 70;  // Account for both lava layers
    if (player.y + player.height > lavaY) {
        resetGame();
        return;
    }
    
    // Check platform collisions
    player.isJumping = true;
    for (const platform of platforms) {
        // Check if player is above the platform
        if (player.velocityY >= 0 && // Moving downward or standing still
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width &&
            player.y + player.height >= platform.y &&
            player.y + player.height <= platform.y + BLOCK_SIZE + 5) {
            
            // Landing effect
            if (player.wasJumping) {
                player.squashAmount = Math.min(0.3, Math.abs(player.velocityY) * 0.05);
                player.wasJumping = false;
            }
            
            // Snap player to platform
            player.isJumping = false;
            player.velocityY = 0;
            player.y = platform.y - player.height;

            // Check if platform is dangerous
            if (PLATFORM_TYPES[platform.type].isDangerous) {
                resetGame();
            }
        }

        // Check if player is below the platform (ceiling collision)
        if (player.velocityY < 0 && // Moving upward
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width &&
            player.y <= platform.y + BLOCK_SIZE &&
            player.y >= platform.y) {
            player.velocityY = 0;
            player.y = platform.y + BLOCK_SIZE;
        }

        // Check if player is hitting the sides of the platform
        if (player.velocityX !== 0) {
            // Left side collision
            if (player.velocityX > 0 && // Moving right
                player.x + player.width >= platform.x &&
                player.x + player.width <= platform.x + 10 &&
                player.y + player.height > platform.y &&
                player.y < platform.y + BLOCK_SIZE) {
                player.x = platform.x - player.width;
            }
            // Right side collision
            if (player.velocityX < 0 && // Moving left
                player.x <= platform.x + platform.width &&
                player.x >= platform.x + platform.width - 10 &&
                player.y + player.height > platform.y &&
                player.y < platform.y + BLOCK_SIZE) {
                player.x = platform.x + platform.width;
            }
        }
    }

    // Check chest collision
    if (!chest.isOpen &&
        player.x + player.width > chest.x &&
        player.x < chest.x + chest.width &&
        player.y + player.height > chest.y &&
        player.y < chest.y + chest.height) {
        chest.isOpen = true;
        gameWon = true;
        message.style.display = 'block';
        triggerConfetti();
    }
    
    // Screen boundaries
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > 2900) player.x = 2900 - player.width;
    if (player.y > canvas.height) resetGame();

    // Update squash effect
    if (player.squashAmount > 0) {
        player.squashAmount *= 0.8;
        if (player.squashAmount < 0.01) {
            player.squashAmount = 0;
        }
    }
}

function resetGame() {
    player.x = 50;
    player.y = 300;
    player.velocityY = 0;
    chest.isOpen = false;
    gameWon = false;
    message.style.display = 'none';
}

// Draw dungeon background
function drawBackground() {
    // Draw ceiling
    ctx.fillStyle = '#2c1810';
    ctx.fillRect(0, 0, canvas.width, 100);
    
    // Draw walls with stone pattern
    const wallHeight = canvas.height - 100;
    const patternSize = 8;
    
    for (let x = 0; x < canvas.width; x += patternSize) {
        for (let y = 100; y < canvas.height; y += patternSize) {
            const patternX = Math.floor((x + camera.x) / patternSize) % 8;
            const patternY = Math.floor((y + camera.y) / patternSize) % 8;
            const isDark = background.wallPattern[patternY][patternX];
            
            ctx.fillStyle = isDark ? '#3c2820' : '#4c3830';
            ctx.fillRect(x, y, patternSize, patternSize);
        }
    }
    
    // Draw torches
    background.torches.forEach(torch => {
        const screenX = torch.x - camera.x;
        if (screenX > -100 && screenX < canvas.width + 100) {
            // Draw torch base
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(screenX - 4, torch.y, 8, 20);
            
            // Draw torch flame with flicker
            const flicker = Math.sin(Date.now() * 0.005 + torch.flickerOffset) * 0.2 + 0.8;
            const flameHeight = 30 * flicker;
            
            // Flame glow
            const gradient = ctx.createRadialGradient(
                screenX, torch.y, 0,
                screenX, torch.y, 40
            );
            gradient.addColorStop(0, 'rgba(255, 200, 50, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(screenX - 40, torch.y - 40, 80, 80);
            
            // Flame
            ctx.fillStyle = '#ff6b1a';
            ctx.beginPath();
            ctx.moveTo(screenX - 4, torch.y);
            ctx.lineTo(screenX + 4, torch.y);
            ctx.lineTo(screenX, torch.y - flameHeight);
            ctx.closePath();
            ctx.fill();
            
            // Inner flame
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.moveTo(screenX - 2, torch.y);
            ctx.lineTo(screenX + 2, torch.y);
            ctx.lineTo(screenX, torch.y - flameHeight * 0.7);
            ctx.closePath();
            ctx.fill();
        }
    });
    
    // Draw lava at the bottom
    const lavaY = canvas.height - 50;
    background.lavaOffset += 0.02;
    
    // Orange lava layer (new top layer)
    const orangeLavaY = lavaY - 20;  // 20 pixels above the main lava
    const orangeLavaGradient = ctx.createLinearGradient(0, orangeLavaY, 0, lavaY);
    orangeLavaGradient.addColorStop(0, '#ff8800');
    orangeLavaGradient.addColorStop(1, '#ff4400');
    ctx.fillStyle = orangeLavaGradient;
    ctx.fillRect(0, orangeLavaY, canvas.width, 20);
    
    // Orange lava surface effect
    for (let x = 0; x < canvas.width; x += 3) {
        const worldX = x + camera.x;  // Use world position instead of screen position
        const height = Math.sin((worldX + background.lavaOffset * 150) * 0.15) * 3 + 
                      Math.sin((worldX - background.lavaOffset * 75) * 0.08) * 2;
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(x, orangeLavaY + height, 3, 20 - height);
    }
    
    // Main lava base
    const lavaGradient = ctx.createLinearGradient(0, lavaY, 0, canvas.height);
    lavaGradient.addColorStop(0, '#ff4400');
    lavaGradient.addColorStop(1, '#ff8800');
    ctx.fillStyle = lavaGradient;
    ctx.fillRect(0, lavaY, canvas.width, 50);
    
    // Main lava surface effect
    for (let x = 0; x < canvas.width; x += 4) {
        const worldX = x + camera.x;  // Use world position instead of screen position
        const height = Math.sin((worldX + background.lavaOffset * 100) * 0.1) * 5 + 
                      Math.sin((worldX - background.lavaOffset * 50) * 0.05) * 3;
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(x, lavaY + height, 4, 50 - height);
    }
    
    // Draw lava bubbles
    background.lavaBubbles.forEach(bubble => {
        const screenX = bubble.x - camera.x;
        if (screenX > -50 && screenX < canvas.width + 50) {
            const bubbleY = orangeLavaY - bubble.size + 
                          Math.sin(Date.now() * 0.001 + bubble.offset) * 5;
            
            // Bubble glow
            const bubbleGradient = ctx.createRadialGradient(
                screenX, bubbleY, 0,
                screenX, bubbleY, bubble.size * 2
            );
            bubbleGradient.addColorStop(0, 'rgba(255, 200, 0, 0.3)');
            bubbleGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            ctx.fillStyle = bubbleGradient;
            ctx.beginPath();
            ctx.arc(screenX, bubbleY, bubble.size * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Bubble
            ctx.fillStyle = '#ff8800';
            ctx.beginPath();
            ctx.arc(screenX, bubbleY, bubble.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Bubble highlight
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(screenX - bubble.size * 0.3, bubbleY - bubble.size * 0.3, 
                   bubble.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Update bubble position
        bubble.y -= bubble.speed;
        if (bubble.y < -bubble.size) {
            bubble.y = 70;  // Adjusted to account for new orange layer
            bubble.x = Math.random() * 3000;
        }
    });
    
    // Draw floor
    const floorY = canvas.height - 50;
    ctx.fillStyle = '#2c1810';
    ctx.fillRect(0, floorY, canvas.width, 50);
    
    // Draw floor pattern
    for (let x = 0; x < canvas.width; x += 16) {
        ctx.fillStyle = '#3c2820';
        ctx.fillRect(x, floorY, 8, 50);
    }
}

// Initialize game elements
function initializeGame() {
    initializeTorches();
    initializeLavaBubbles();
}

// Update game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    drawBackground();
    
    // Update camera
    updateCamera();
    
    // Draw platforms
    platforms.forEach(drawPlatform);
    
    // Update and draw bats
    updateBats();
    bats.forEach(drawBat);
    
    // Draw chest
    drawChest();
    
    // Update and draw player
    if (!gameWon) {
        updatePlayer();
    }
    drawPlayer();

    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Initialize game elements
initializeGame();

// Update chest position to stick to the final platform
function updateChestPosition() {
    const finalPlatform = platforms[platforms.length - 1];
    chest.x = finalPlatform.x + (finalPlatform.width - chest.width) / 2;  // Center on platform
    chest.y = finalPlatform.y - chest.height;  // Stick to platform top
}

// Call this after platforms are created
updateChestPosition();

// Start the game
gameLoop(); 