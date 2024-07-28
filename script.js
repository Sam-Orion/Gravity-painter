const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const tiltLeftBtn = document.getElementById('tilt-left');
const tiltRightBtn = document.getElementById('tilt-right');
const addPaintBtn = document.getElementById('add-paint');
const colorPicker = document.getElementById('color-picker');
const sizeSlider = document.getElementById('size-slider');
const sizeValue = document.getElementById('size-value');
const shapeSelect = document.getElementById('shape-select');
const gravitySelect = document.getElementById('gravity-select');
const saveBtn = document.getElementById('save-btn');

canvas.width = 400;
canvas.height = 400;

let gravity = { x: 0, y: 0.5 };
let particles = [];
let obstacles = [];
let powerUps = [];
let isAddingPaint = false;
let addPaintStartTime;
let brushSize = 3;

const gravityModes = {
    earth: { x: 0, y: 0.5 },
    moon: { x: 0, y: 0.08 },
    jupiter: { x: 0, y: 1.2 },
    sun: { x: 0, y: 27.95 },
    blackHole: { x: 0, y: 50 }
};

function Particle(x, y, color, size, shape) {
    this.x = x;
    this.y = y;
    this.radius = size;
    this.color = color;
    this.velocity = { x: 0, y: 0 };
    this.mass = Math.PI * size * size;
    this.shape = shape;
    this.creationTime = Date.now();
    this.isDry = false;
}

Particle.prototype.update = function() {
    if (Date.now() - this.creationTime > 5000) {
        this.isDry = true;
    }

    this.velocity.x += gravity.x;
    this.velocity.y += gravity.y;
    
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    
    // Boundary checks
    if (this.x < this.radius) {
        this.x = this.radius;
        this.velocity.x *= -0.5;
    }
    if (this.x > canvas.width - this.radius) {
        this.x = canvas.width - this.radius;
        this.velocity.x *= -0.5;
    }
    if (this.y > canvas.height - this.radius) {
        this.y = canvas.height - this.radius;
        this.velocity.y *= -0.5;
    }

    // Obstacle collision
    obstacles.forEach(obstacle => {
        if (checkCollision(this, obstacle)) {
            // Simple bounce off obstacle
            this.velocity.x *= -1;
            this.velocity.y *= -1;
        }
    });

    // Power-up collection
    powerUps.forEach((powerUp, index) => {
        if (checkCollision(this, powerUp)) {
            applyPowerUp(powerUp);
            powerUps.splice(index, 1);
        }
    });

    if (!this.isDry && Math.abs(this.velocity.x) < 0.1 && Math.abs(this.velocity.y) < 0.1) {
        this.radius += 0.01;
        this.mass = Math.PI * this.radius * this.radius;
    }
};

Particle.prototype.draw = function() {
    ctx.fillStyle = this.color;
    
    switch(this.shape) {
        case 'square':
            ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
            break;
        case 'triangle':
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.radius);
            ctx.lineTo(this.x - this.radius, this.y + this.radius);
            ctx.lineTo(this.x + this.radius, this.y + this.radius);
            ctx.closePath();
            ctx.fill();
            break;
        default: // circle
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
    }
};

function Obstacle(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
}

Obstacle.prototype.draw = function() {
    ctx.fillStyle = 'gray';
    ctx.fillRect(this.x, this.y, this.width, this.height);
};

function PowerUp(x, y, type) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.type = type;
}

PowerUp.prototype.draw = function() {
    ctx.fillStyle = this.type === 'sizeUp' ? 'green' : 'blue';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
};

function addPaint() {
    const color = colorPicker.value;
    const shape = shapeSelect.value;
    particles.push(new Particle(canvas.width / 2, 0, color, brushSize, shape));
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    obstacles.forEach(obstacle => obstacle.draw());
    powerUps.forEach(powerUp => powerUp.draw());

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        
        if (!particles[i].isDry) {
            for (let j = i + 1; j < particles.length; j++) {
                if (!particles[j].isDry && checkCollision(particles[i], particles[j])) {
                    mergeParticles(i, j);
                    i--; // Recheck this index since we removed a particle
                    break;
                }
            }
        }
    }
    
    requestAnimationFrame(update);
}

function checkCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < obj1.radius + obj2.radius;
}

function mergeParticles(index1, index2) {
    const p1 = particles[index1];
    const p2 = particles[index2];
    
    const totalMass = p1.mass + p2.mass;
    const newRadius = Math.sqrt(totalMass / Math.PI);
    const newX = (p1.x * p1.mass + p2.x * p2.mass) / totalMass;
    const newY = (p1.y * p1.mass + p2.y * p2.mass) / totalMass;
    
    const newColor = blendColors(p1.color, p2.color, p1.mass / totalMass);
    
    const newVelocityX = (p1.velocity.x * p1.mass + p2.velocity.x * p2.mass) / totalMass;
    const newVelocityY = (p1.velocity.y * p1.mass + p2.velocity.y * p2.mass) / totalMass;
    
    const newParticle = new Particle(newX, newY, newColor, newRadius, p1.shape);
    newParticle.velocity = { x: newVelocityX, y: newVelocityY };
    newParticle.mass = totalMass;
    newParticle.creationTime = Math.min(p1.creationTime, p2.creationTime);
    
    particles[index1] = newParticle;
    particles.splice(index2, 1);
}

function blendColors(color1, color2, ratio) {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round(r1 * ratio + r2 * (1 - ratio));
    const g = Math.round(g1 * ratio + g2 * (1 - ratio));
    const b = Math.round(b1 * ratio + b2 * (1 - ratio));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function applyPowerUp(powerUp) {
    switch (powerUp.type) {
        case 'sizeUp':
            brushSize = Math.min(brushSize * 1.5, 20);
            break;
        case 'speedUp':
            gravity.y *= 1.5;
            setTimeout(() => gravity.y /= 1.5, 5000); // Effect lasts 5 seconds
            break;
    }
}

function saveArt() {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'gravity_painting.png';
    link.click();
}

// Event Listeners
tiltLeftBtn.addEventListener('click', () => {
    gravity.x = Math.max(gravity.x - 0.1, -0.5);
});

tiltRightBtn.addEventListener('click', () => {
    gravity.x = Math.min(gravity.x + 0.1, 0.5);
});

addPaintBtn.addEventListener('mousedown', () => {
    isAddingPaint = true;
    addPaintStartTime = Date.now();
    addPaintInterval = setInterval(() => {
        const holdTime = Date.now() - addPaintStartTime;
        brushSize = Math.min(3 + holdTime / 100, 10); // Increase size over time, max 10
        addPaint();
    }, 100);
});

addPaintBtn.addEventListener('mouseup', () => {
    isAddingPaint = false;
    clearInterval(addPaintInterval);
    brushSize = 3; // Reset brush size
});

sizeSlider.addEventListener('input', function() {
    sizeValue.textContent = this.value;
    brushSize = parseInt(this.value);
});

gravitySelect.addEventListener('change', function() {
    gravity = gravityModes[this.value];
});

saveBtn.addEventListener('click', saveArt);

// Initialize game elements
obstacles.push(new Obstacle(100, 200, 50, 20));
obstacles.push(new Obstacle(250, 150, 20, 100));

function spawnPowerUp() {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const type = Math.random() < 0.5 ? 'sizeUp' : 'speedUp';
    powerUps.push(new PowerUp(x, y, type));
}

setInterval(spawnPowerUp, 10000); // Spawn a power-up every 10 seconds

update();