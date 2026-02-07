const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const input = document.getElementById('userInput');

let particles = [];
// Mouse object now includes a 'pressed' state for touch
let mouse = { x: null, y: null, radius: 100 };
let flowTimer = 0;
let hueRotate = 0;

// Resize Logic
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Recalculate mouse interaction radius based on screen size
    mouse.radius = canvas.width < 600 ? 80 : 150;
}

window.addEventListener('resize', () => {
    resize();
    init(input.value);
});
resize();

// --- NEW: AUDIO FUNCTION (Text-to-Speech) ---
function speakName(text) {
    // Check if browser supports speech
    if ('speechSynthesis' in window) {
        // Cancel any currently playing speech to prevent overlapping
        window.speechSynthesis.cancel();

        // Create the speech object
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Customizations (You can tweak these)
        utterance.pitch = 1.0; // 0 to 2
        utterance.rate = 0.9;  // 0.1 to 10 (0.9 is slightly slower/clearer)
        utterance.volume = 1;  // 0 to 1

        // Speak
        window.speechSynthesis.speak(utterance);
    } else {
        console.log("Browser does not support Text-to-Speech");
    }
}

// --- INTERACTION HANDLERS (Mouse & Touch) ---

// Mouse
window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
});

// Touch
window.addEventListener('touchmove', (e) => {
    // Prevent scrolling while dragging particles
    if (e.target !== input) e.preventDefault();
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
}, { passive: false });

window.addEventListener('touchstart', (e) => {
    if (e.target !== input) e.preventDefault();
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
}, { passive: false });

window.addEventListener('touchend', () => {
    mouse.x = null;
    mouse.y = null;
});


class Particle {
    constructor(x, y, color, isOrb) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.baseX = x;
        this.baseY = y;
        this.size = (Math.random() * 2) + 1;
        this.color = color; // Initial Hue
        this.vx = 0;
        this.vy = 0;
        this.isOrb = isOrb;
        this.offset = Math.random() * 100;
        this.speed = 0.03 + Math.random() * 0.04;
        this.friction = 0.92; // Higher friction = smoother stop
    }

    draw() {
        // Calculate dynamic color based on time
        let currentHue = (parseInt(this.color) + hueRotate) % 360;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

        // Pure color fill (Shadows handled by composite operation)
        ctx.fillStyle = `hsl(${currentHue}, 100%, 60%)`;
        ctx.fill();
    }

    update() {
        let targetX = this.baseX;
        let targetY = this.baseY;

        // Idle Animation (Floating)
        if (this.isOrb) {
            targetX += Math.cos(flowTimer + this.offset) * 30;
            targetY += Math.sin(flowTimer * 0.5 + this.offset) * 30;
        } else {
            // Slight jitter for text particles to make them feel alive
            targetX += Math.cos(flowTimer * 2 + this.offset) * 2;
            targetY += Math.sin(flowTimer * 2 + this.offset) * 2;
        }

        let dx = targetX - this.x;
        let dy = targetY - this.y;

        // Move towards home
        this.vx += dx * this.speed;
        this.vy += dy * this.speed;

        // Mouse Repulsion
        if (mouse.x != null) {
            let mdx = mouse.x - this.x;
            let mdy = mouse.y - this.y;
            let dist = Math.sqrt(mdx * mdx + mdy * mdy);

            if (dist < mouse.radius) {
                let force = (mouse.radius - dist) / mouse.radius;
                let angle = Math.atan2(mdy, mdx);
                let push = force * 15; // Push strength
                this.vx -= Math.cos(angle) * push;
                this.vy -= Math.sin(angle) * push;
            }
        }

        this.vx *= this.friction;
        this.vy *= this.friction;
        this.x += this.vx;
        this.y += this.vy;
    }
}

function init(text) {
    particles = [];
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Adjust particle density based on screen size (Performance)
    const isMobile = canvas.width < 600;
    const particleCount = isMobile ? 600 : 1500;
    const scanSkip = isMobile ? 5 : 4; // Scan less pixels on mobile

    if (!text || text.trim() === "") {
        // Orb Mode
        for (let i = 0; i < particleCount; i++) {
            let a = Math.random() * Math.PI * 2;
            let r = Math.random() * (isMobile ? 80 : 150);
            // Store only the HUE integer to make rotation easier
            let hue = Math.floor(180 + Math.random() * 60);
            particles.push(new Particle(cx + Math.cos(a) * r, cy - 80 + Math.sin(a) * r, hue, true));
        }
    } else {
        // Text Mode
        const upperText = text.toUpperCase();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dynamic Font Size
        let fontSize = Math.min(canvas.width * 0.2, 180);

        ctx.fillStyle = 'white';
        ctx.font = `900 ${fontSize}px "Rajdhani"`; // Use the cool font
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(upperText, cx, cy - 50);

        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < canvas.height; y += scanSkip) {
            for (let x = 0; x < canvas.width; x += scanSkip) {
                // Check alpha > 128
                if (data[(y * canvas.width + x) * 4 + 3] > 128) {
                    let hue = Math.floor(180 + (x / canvas.width) * 100);
                    particles.push(new Particle(x, y, hue, false));
                }
            }
        }
    }
}

function animate() {
    // CHANGE THIS LINE: Use clearRect instead of fillRect to see the background image
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Global Hue Rotation
    hueRotate += 0.5;
    flowTimer += 0.04;

    ctx.globalCompositeOperation = 'lighter';
    particles.forEach(p => { p.update(); p.draw(); });
    ctx.globalCompositeOperation = 'source-over';

    requestAnimationFrame(animate);
}
// --- UPDATED EVENT LISTENERS ---

// 1. Instant Visual Updates (Particles morph as you type)
input.addEventListener('input', (e) => {
    init(e.target.value);
});

// 2. Audio Trigger (Speaks only when ENTER is pressed)
input.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        const textToSpeak = e.target.value;
        if(textToSpeak.trim() !== "") {
            speakName(textToSpeak);
        }
    }
});

// Initial start
init("");
animate();