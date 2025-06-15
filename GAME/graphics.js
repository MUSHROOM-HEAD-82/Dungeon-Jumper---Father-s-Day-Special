// Pixel art patterns for blocks
const PIXEL_SIZE = 8;

// Stone brick pattern
const stoneBrickPattern = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 1, 0]
];

// Magma block pattern
const magmaPattern = [
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1]
];

// Function to draw a stone brick block
function drawStoneBrick(ctx, x, y) {
    const lightGray = '#A0A0A0';
    const darkGray = '#707070';
    
    for (let px = 0; px < PIXEL_SIZE; px++) {
        for (let py = 0; py < PIXEL_SIZE; py++) {
            const color = stoneBrickPattern[py][px] ? lightGray : darkGray;
            ctx.fillStyle = color;
            ctx.fillRect(x + px, y + py, 1, 1);
        }
    }
}

// Function to draw a magma block
function drawMagmaBlock(ctx, x, y) {
    const orange = '#FF8C00';
    const red = '#FF4500';
    
    for (let px = 0; px < PIXEL_SIZE; px++) {
        for (let py = 0; py < PIXEL_SIZE; py++) {
            const color = magmaPattern[py][px] ? orange : red;
            ctx.fillStyle = color;
            ctx.fillRect(x + px, y + py, 1, 1);
        }
    }
} 