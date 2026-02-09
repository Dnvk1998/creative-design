const canvas = document.getElementById("canvas1");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const input = document.getElementById("userInput");

/* -------------------- DEVICE DETECTION -------------------- */

const isTouchDevice =
  "ontouchstart" in window || navigator.maxTouchPoints > 0;

const isLowEndDevice =
  isTouchDevice &&
  navigator.hardwareConcurrency &&
  navigator.hardwareConcurrency <= 4;

/* -------------------- PERFORMANCE BUDGET -------------------- */

const MAX_PARTICLES = isLowEndDevice
  ? 550
  : isTouchDevice
  ? 850
  : 1500;

const SCAN_SKIP = isLowEndDevice ? 6 : isTouchDevice ? 5 : 4;
const FPS_LIMIT = isLowEndDevice ? 30 : 60;

/* -------------------- STATE -------------------- */

let particles = [];
// Mouse object now includes a 'pressed' state for touch
let mouse = { x: null, y: null, radius: 100 };
let flowTimer = 0;
let hueRotate = 0;
let lastFrame = 0;

/* -------------------- RESIZE -------------------- */

// Resize Logic
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  mouse.radius = canvas.width < 600 ? 80 : 150;
}

window.addEventListener("resize", () => {
  resize();
  init(input.value);
});

resize();

/* -------------------- TEXT TO SPEECH -------------------- */

function speakName(text) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.pitch = 1;
  utter.rate = 0.9;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

/* -------------------- INTERACTION -------------------- */

// Mouse
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

// Touch move
window.addEventListener(
  "touchmove",
  (e) => {
    if (e.target !== input) e.preventDefault();
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
  },
  { passive: false }
);

// Touch start = TAP TRIGGER
window.addEventListener(
  "touchstart",
  (e) => {
    if (e.target !== input) e.preventDefault();
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;

    // 🔥 TAP TO TRIGGER NEBULA
    init(input.value || "HELLO");
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  mouse.x = null;
  mouse.y = null;
});

// Mobile UX hint
if (isTouchDevice) {
  input.placeholder = "TAP SCREEN TO ACTIVATE";
}

/* -------------------- PARTICLE CLASS -------------------- */

class Particle {
  constructor(x, y, hue, isOrb) {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.baseX = x;
    this.baseY = y;
    this.size = Math.random() * 2 + 1;
    this.hue = hue;
    this.vx = 0;
    this.vy = 0;
    this.isOrb = isOrb;
    this.offset = Math.random() * 100;
    this.speed = 0.03 + Math.random() * 0.04;
    this.friction = 0.92;
  }

  draw() {
    const hue = (this.hue + hueRotate) % 360;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue},100%,60%)`;
    ctx.fill();
  }

  update() {
    let tx = this.baseX;
    let ty = this.baseY;

    if (this.isOrb) {
      tx += Math.cos(flowTimer + this.offset) * 30;
      ty += Math.sin(flowTimer * 0.5 + this.offset) * 30;
    } else {
      tx += Math.cos(flowTimer * 2 + this.offset) * 2;
      ty += Math.sin(flowTimer * 2 + this.offset) * 2;
    }

    const dx = tx - this.x;
    const dy = ty - this.y;

    this.vx += dx * this.speed;
    this.vy += dy * this.speed;

    if (mouse.x !== null) {
      const mx = mouse.x - this.x;
      const my = mouse.y - this.y;
      const dist = Math.sqrt(mx * mx + my * my);

      if (dist < mouse.radius) {
        const force = (mouse.radius - dist) / mouse.radius;
        const angle = Math.atan2(my, mx);
        this.vx -= Math.cos(angle) * force * 15;
        this.vy -= Math.sin(angle) * force * 15;
      }
    }

    this.vx *= this.friction;
    this.vy *= this.friction;
    this.x += this.vx;
    this.y += this.vy;
  }
}

/* -------------------- INIT -------------------- */

function init(text) {
  particles = [];
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  if (!text.trim()) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * (canvas.width < 600 ? 80 : 150);
      const hue = 180 + Math.random() * 60;
      particles.push(
        new Particle(cx + Math.cos(a) * r, cy - 80 + Math.sin(a) * r, hue, true)
      );
    }
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fontSize = Math.min(canvas.width * 0.2, 180);
    ctx.font = `900 ${fontSize}px Rajdhani`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.fillText(text.toUpperCase(), cx, cy - 50);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += SCAN_SKIP) {
      for (let x = 0; x < canvas.width; x += SCAN_SKIP) {
        if (data[(y * canvas.width + x) * 4 + 3] > 128) {
          const hue = 180 + (x / canvas.width) * 100;
          particles.push(new Particle(x, y, hue, false));
        }
      }
    }
  }
}

/* -------------------- ANIMATION LOOP -------------------- */

function animate(time) {
  if (time - lastFrame < 1000 / FPS_LIMIT) {
    requestAnimationFrame(animate);
    return;
  }
  lastFrame = time;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hueRotate += 0.5;
  flowTimer += 0.04;

  ctx.globalCompositeOperation = "lighter";
  particles.forEach((p) => {
    p.update();
    p.draw();
  });
  ctx.globalCompositeOperation = "source-over";

  requestAnimationFrame(animate);
}

/* -------------------- INPUT EVENTS -------------------- */

input.addEventListener("input", (e) => {
  init(e.target.value);
});

input.addEventListener("keyup", (e) => {
  if (e.key === "Enter" && e.target.value.trim()) {
    speakName(e.target.value);
  }
});

/* -------------------- START -------------------- */

init("");
requestAnimationFrame(animate);
