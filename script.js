// BAHLIL SLAYER Game Script

// Supabase Configuration
const SUPABASE_URL = 'https://bxhrnnwfqlsoviysqcdw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4aHJubndmcWxzb3ZpeXNxY2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3ODkzNDIsImV4cCI6MjA4MTM2NTM0Mn0.O7fpv0TrDd-8ZE3Z9B5zWyAuWROPis5GRnKMxmqncX8';

// Initialize Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const gameArea = document.getElementById("gameArea");
const scoreElement = document.getElementById("score");
const gameOverBox = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");
const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const difficultyScreen = document.getElementById("difficultyScreen");
const authScreen = document.getElementById("authScreen");
const leaderboardScreen = document.getElementById("leaderboardScreen");
const guideScreen = document.getElementById("guideScreen");
const hearts = document.querySelectorAll('.heart');
const comboText = document.getElementById("comboText");
const multiplierText = document.getElementById("multiplierText");
const loadingScreen = document.getElementById("loadingScreen");
const cursorTrail = document.getElementById("cursorTrail");
const audioPool = document.getElementById("audioPool");

// Game variables
let score = 0;
let lives = 3;
let active = false;
let currentDifficulty = null;
let user = null;
let isLoginMode = true;
let isMobileDevice = false;
let realtimeSubscription = null;

// Combo system
let comboCount = 0;
let comboMultiplier = 1;
let lastCutTime = 0;
const COMBO_TIME_WINDOW = 2000; // 2 detik untuk combo
const MAX_COMBO = 50;

// Game objects
const activeFruits = [];
const fruitHalves = [];
const totalFruits = 10;
const bombIndex = 11;

// Sound system
const audioPoolSize = 10;
let audioPoolIndex = 0;
const audioElements = [];

// Difficulty settings - Ditinggikan trajectory
const difficulties = {
    baby: {
        name: "BABY",
        fruitSpawnRate: 1300,
        bombChance: 0.05,
        lives: 8,
        fruitSpeed: 12,
        maxFruits: 6,
        scoreMultiplier: 1
    },
    easy: {
        name: "MUDAH",
        fruitSpawnRate: 1000,
        bombChance: 0.1,
        lives: 6,
        fruitSpeed: 14,
        maxFruits: 8,
        scoreMultiplier: 1.2
    },
    normal: {
        name: "NORMAL",
        fruitSpawnRate: 800,
        bombChance: 0.15,
        lives: 5,
        fruitSpeed: 16,
        maxFruits: 10,
        scoreMultiplier: 1.5
    },
    medium: {
        name: "MENENGAH",
        fruitSpawnRate: 650,
        bombChance: 0.2,
        lives: 4,
        fruitSpeed: 18,
        maxFruits: 12,
        scoreMultiplier: 2
    },
    hard: {
        name: "SULIT",
        fruitSpawnRate: 500,
        bombChance: 0.25,
        lives: 3,
        fruitSpeed: 20,
        maxFruits: 15,
        scoreMultiplier: 3
    },
    "very-hard": {
        name: "SANGAT SULIT",
        fruitSpawnRate: 400,
        bombChance: 0.3,
        lives: 2,
        fruitSpeed: 22,
        maxFruits: 18,
        scoreMultiplier: 5
    },
    nightmare: {
        name: "MIMPI BURUK",
        fruitSpawnRate: 300,
        bombChance: 0.35,
        lives: 2,
        fruitSpeed: 24,
        maxFruits: 20,
        scoreMultiplier: 8
    },
    impossible: {
        name: "TIDAK MUNGKIN",
        fruitSpawnRate: 200,
        bombChance: 0.4,
        lives: 1,
        fruitSpeed: 26,
        maxFruits: 25,
        scoreMultiplier: 10
    }
};

// Initialize game
async function initGame() {
    // Detect device type
    isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Update instructions for mobile
    if (isMobileDevice) {
        document.querySelector('.subtitle').textContent = 
            "SENTUH buah dengan JARI, hindari bom merah. Setiap sentuhan meningkatkan combo!";
    }
    
    // Check if user is logged in
    const savedUser = localStorage.getItem('bahlilUser');
    if (savedUser) {
        user = JSON.parse(savedUser);
        updateAuthUI();
    }
    
    // Setup particles background
    createParticles();
    
    // Initialize audio pool
    initAudioPool();
    
    // Adjust UI for portrait mode
    adjustUIForPortrait();
    
    // Setup realtime subscription
    setupRealtimeSubscription();
    
    // Sync pending scores if user is logged in
    if (user) {
        await syncPendingScores();
    }
    
    // Hide loading screen
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 1500);
    
    // Setup event listeners
    setupEventListeners();
}

// Update auth UI (show/hide logout button)
function updateAuthUI() {
    const leaderboardBtn = document.getElementById("leaderboardBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    
    if (user) {
        // User logged in
        if (logoutBtn) {
            logoutBtn.style.display = 'flex';
        } else {
            // Create logout button if doesn't exist
            const newLogoutBtn = document.createElement('div');
            newLogoutBtn.id = 'logoutBtn';
            newLogoutBtn.className = 'menu-btn';
            newLogoutBtn.title = 'Keluar';
            newLogoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
            
            const menuIcons = document.querySelector('.menu-icons');
            if (menuIcons) {
                menuIcons.appendChild(newLogoutBtn);
                
                newLogoutBtn.addEventListener('click', () => {
                    handleLogout();
                });
            }
        }
        
        // Update leaderboard button tooltip
        leaderboardBtn.title = "Leaderboard";
    } else {
        // User not logged in
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }
        
        // Update leaderboard button tooltip
        leaderboardBtn.title = "Leaderboard (Login dulu)";
    }
}

// Handle logout
function handleLogout() {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
        user = null;
        localStorage.removeItem('bahlilUser');
        updateAuthUI();
        
        // Show notification
        showNotification("Berhasil keluar!", "success");
        
        // Close leaderboard if open
        leaderboardScreen.style.display = "none";
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.getElementById('gameNotification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.id = 'gameNotification';
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? 'rgba(0, 200, 83, 0.9)' : 'rgba(33, 150, 243, 0.9)'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 1000;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Adjust UI for portrait mode
function adjustUIForPortrait() {
    const isPortrait = window.innerHeight > window.innerWidth;
    
    if (isPortrait) {
        // Adjust header
        const header = document.getElementById('header');
        header.style.padding = '10px 15px';
        
        // Adjust logo
        const logoText = document.querySelector('.logo-text');
        logoText.style.fontSize = '1.2rem';
        
        // Adjust score
        const scoreElement = document.getElementById('score');
        scoreElement.style.fontSize = '2rem';
        scoreElement.style.padding = '5px 15px';
        
        // Adjust hearts
        hearts.forEach(heart => {
            heart.style.width = '25px';
            heart.style.height = '25px';
        });
        
        // Adjust combo text
        comboText.style.fontSize = '1.4rem';
        multiplierText.style.fontSize = '2rem';
        
        // Adjust game UI position
        const gameUI = document.getElementById('gameUI');
        gameUI.style.top = '60px';
        gameUI.style.padding = '0 15px';
        
        // Add mobile instructions
        if (!document.getElementById('mobileInstruction')) {
            const mobileInstruction = document.createElement('div');
            mobileInstruction.id = 'mobileInstruction';
            mobileInstruction.style.position = 'fixed';
            mobileInstruction.style.bottom = '20px';
            mobileInstruction.style.left = '50%';
            mobileInstruction.style.transform = 'translateX(-50%)';
            mobileInstruction.style.background = 'rgba(0, 0, 0, 0.7)';
            mobileInstruction.style.color = '#ff8c00';
            mobileInstruction.style.padding = '10px 20px';
            mobileInstruction.style.borderRadius = '10px';
            mobileInstruction.style.fontSize = '0.9rem';
            mobileInstruction.style.textAlign = 'center';
            mobileInstruction.style.zIndex = '100';
            mobileInstruction.style.border = '1px solid rgba(255, 140, 0, 0.3)';
            mobileInstruction.textContent = 'Gunakan jari untuk memotong buah';
            
            document.getElementById('gameContainer').appendChild(mobileInstruction);
        }
    }
}

// Setup realtime subscription
function setupRealtimeSubscription() {
    if (realtimeSubscription) {
        supabaseClient.removeSubscription(realtimeSubscription);
    }
    
    realtimeSubscription = supabaseClient
        .channel('leaderboard-changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'leaderboard-bahlil' 
            }, 
            (payload) => {
                console.log('Realtime update:', payload);
                // Refresh leaderboard ketika ada perubahan
                if (leaderboardScreen.style.display === 'flex') {
                    loadLeaderboard();
                }
            }
        )
        .subscribe();
}

// Create particles background
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = Math.random() * 3 + 1 + 'px';
        particle.style.height = particle.style.width;
        particle.style.background = 'rgba(255, 94, 0, 0.2)';
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.opacity = Math.random() * 0.5 + 0.1;
        
        particlesContainer.appendChild(particle);
        
        // Animate particle
        animateParticle(particle);
    }
}

function animateParticle(particle) {
    let x = parseFloat(particle.style.left);
    let y = parseFloat(particle.style.top);
    let speedX = (Math.random() - 0.5) * 0.3;
    let speedY = (Math.random() - 0.5) * 0.3;
    
    function move() {
        x += speedX;
        y += speedY;
        
        // Wrap around edges
        if (x > 100) x = 0;
        if (x < 0) x = 100;
        if (y > 100) y = 0;
        if (y < 0) y = 100;
        
        particle.style.left = x + '%';
        particle.style.top = y + '%';
        
        requestAnimationFrame(move);
    }
    
    move();
}

// Initialize audio pool for overlapping sounds
function initAudioPool() {
    for (let i = 0; i < audioPoolSize; i++) {
        const audio = document.createElement('audio');
        audio.preload = 'auto';
        audioPool.appendChild(audio);
        audioElements.push(audio);
    }
}

// Play sound from pool (allows overlapping)
function playSoundFromPool(soundType) {
    const audio = audioElements[audioPoolIndex];
    
    if (soundType === 'fruit') {
        audio.src = 'suarabuah.mp3';
    } else if (soundType === 'bomb') {
        audio.src = 'suarabom.mp3';
    }
    
    audio.currentTime = 0;
    audio.play().catch(e => {
        // Silently ignore audio play errors
        console.log("Audio play failed:", e);
    });
    
    // Move to next audio element in pool
    audioPoolIndex = (audioPoolIndex + 1) % audioPoolSize;
}

// Create cursor trail effect
function createTrailDot(x, y) {
    // Don't create trail on mobile for performance
    if (isMobileDevice) return;
    
    const dot = document.createElement('div');
    dot.className = 'trail-dot';
    dot.style.left = (x - 3) + 'px';
    dot.style.top = (y - 3) + 'px';
    
    cursorTrail.appendChild(dot);
    
    // Remove after animation
    setTimeout(() => {
        if (dot.parentNode) {
            dot.remove();
        }
    }, 500);
}

// Update hearts display
function updateHearts() {
    hearts.forEach((heart, index) => {
        if (index < lives) {
            heart.classList.remove('lost');
        } else {
            heart.classList.add('lost');
        }
    });
}

// Update combo display
function updateComboDisplay() {
    if (comboCount > 1) {
        comboText.textContent = `COMBO: ${comboCount}`;
        comboText.classList.add('active');
        
        multiplierText.textContent = `x${comboMultiplier}`;
        multiplierText.classList.add('active');
    } else {
        comboText.classList.remove('active');
        multiplierText.classList.remove('active');
    }
    
    // Reset combo display after time
    clearTimeout(comboText.timeout);
    comboText.timeout = setTimeout(() => {
        if (comboCount <= 1) {
            comboText.classList.remove('active');
            multiplierText.classList.remove('active');
        }
    }, COMBO_TIME_WINDOW + 500);
}

// Calculate combo multiplier
function calculateMultiplier() {
    const now = Date.now();
    
    if (now - lastCutTime < COMBO_TIME_WINDOW) {
        comboCount++;
        
        // Calculate multiplier based on combo
        if (comboCount >= 30) comboMultiplier = 8;
        else if (comboCount >= 20) comboMultiplier = 5;
        else if (comboCount >= 15) comboMultiplier = 4;
        else if (comboCount >= 10) comboMultiplier = 3;
        else if (comboCount >= 5) comboMultiplier = 2;
        else comboMultiplier = 1;
        
        // Cap combo
        if (comboCount > MAX_COMBO) comboCount = MAX_COMBO;
        
    } else {
        comboCount = 1;
        comboMultiplier = 1;
    }
    
    lastCutTime = now;
    updateComboDisplay();
}

// Spawn fruit or bomb
function spawnFruit(settings) {
    if (!active || activeFruits.length >= settings.maxFruits) return;
    
    const isBomb = Math.random() < settings.bombChance;
    const itemIndex = isBomb ? bombIndex : Math.floor(Math.random() * totalFruits) + 1;
    
    const div = document.createElement("div");
    div.className = isBomb ? "bomb" : "fruit";
    div.dataset.isBomb = isBomb;
    div.dataset.id = Date.now() + Math.random();
    
    const img = document.createElement("img");
    img.src = `foto${itemIndex}.webp`;
    img.alt = isBomb ? "Bom" : "Buah";
    div.appendChild(img);
    
    // Adjust size for mobile
    if (isMobileDevice) {
        div.style.width = '70px';
        div.style.height = '70px';
        img.style.width = '70px';
        img.style.height = '70px';
    }
    
    // Start from bottom with some variation
    const startX = Math.random() * (window.innerWidth - (isMobileDevice ? 70 : 85));
    const startY = window.innerHeight + 50;
    
    div.style.left = startX + "px";
    div.style.top = startY + "px";
    
    gameArea.appendChild(div);
    
    // Physics - launch upward with higher trajectory
    let posX = startX;
    let posY = startY;
    let velocityX = (Math.random() - 0.5) * 4;
    let velocityY = -(settings.fruitSpeed + Math.random() * 4);
    
    const fruitId = div.dataset.id;
    const anim = setInterval(() => {
        if (!active) {
            clearInterval(anim);
            return;
        }
        
        // Apply gravity
        velocityY += 0.5;
        
        // Update position
        posX += velocityX;
        posY += velocityY;
        
        div.style.left = posX + "px";
        div.style.top = posY + "px";
        
        // Remove if out of screen
        if (posY > window.innerHeight + 100 || posY < -100) {
            clearInterval(anim);
            div.remove();
            
            const index = activeFruits.findIndex(f => f.id === fruitId);
            if (index > -1) {
                activeFruits.splice(index, 1);
            }
        }
    }, 16);
    
    activeFruits.push({
        id: fruitId,
        element: div,
        animId: anim,
        isBomb: isBomb,
        posX: posX,
        posY: posY
    });
}

// Create cut visual effect at cursor position
function createCutVisual(x, y) {
    const visual = document.createElement("div");
    visual.className = "cut-visual";
    visual.style.left = (x - 4) + "px";
    visual.style.top = y + "px";
    
    // Random angle
    const angle = Math.random() * 360;
    visual.style.transform = `rotate(${angle}deg)`;
    
    gameArea.appendChild(visual);
    
    setTimeout(() => {
        visual.remove();
    }, 200);
}

// Check if cursor/touch hits fruit
function checkCursorHit(x, y) {
    if (!active) return false;
    
    let hitSomething = false;
    
    // Check all active fruits
    for (let i = activeFruits.length - 1; i >= 0; i--) {
        const fruit = activeFruits[i];
        const rect = fruit.element.getBoundingClientRect();
        
        // Check if cursor is within fruit bounds
        if (x >= rect.left && x <= rect.right && 
            y >= rect.top && y <= rect.bottom) {
            
            hitSomething = true;
            handleFruitHit(fruit, rect.left + rect.width / 2, rect.top + rect.height / 2);
            break; // Only hit one fruit at a time
        }
    }
    
    return hitSomething;
}

// Handle fruit hit
function handleFruitHit(fruit, centerX, centerY) {
    // Stop animation
    clearInterval(fruit.animId);
    
    // Create cut effect
    createCutEffect(centerX, centerY);
    createCutVisual(centerX, centerY);
    
    // Remove from active array
    const index = activeFruits.findIndex(f => f.id === fruit.id);
    if (index > -1) {
        activeFruits.splice(index, 1);
    }
    
    // Remove original element
    fruit.element.remove();
    
    // If bomb, explode
    if (fruit.isBomb) {
        createBombExplosion(centerX, centerY);
        playSoundFromPool('bomb');
        loseLife();
        resetCombo();
        return;
    }
    
    // If fruit, cut into two halves
    playSoundFromPool('fruit');
    calculateMultiplier();
    
    const imgSrc = fruit.element.querySelector('img').src;
    const cutAngle = Math.random() * Math.PI * 2;
    
    // Create two halves
    createFruitHalves(imgSrc, centerX, centerY, cutAngle);
    
    // Calculate score with multiplier
    const settings = difficulties[currentDifficulty];
    const points = Math.floor(10 * settings.scoreMultiplier * comboMultiplier);
    score += points;
    scoreElement.textContent = score.toLocaleString();
    
    // Show floating score
    createFloatingScore(centerX, centerY, `+${points}`);
}

// Create fruit halves
function createFruitHalves(imgSrc, x, y, cutAngle) {
    // Adjust size for mobile
    const size = isMobileDevice ? 70 : 85;
    const halfSize = size / 2;
    
    // Create top half
    const topHalf = document.createElement("div");
    topHalf.className = "fruit-half";
    topHalf.style.left = (x - halfSize) + "px";
    topHalf.style.top = (y - halfSize) + "px";
    
    const topImg = document.createElement("img");
    topImg.src = imgSrc;
    topImg.style.clipPath = "inset(0 0 50% 0)";
    topImg.style.width = size + "px";
    topImg.style.height = size + "px";
    topHalf.appendChild(topImg);
    
    // Create bottom half
    const bottomHalf = document.createElement("div");
    bottomHalf.className = "fruit-half";
    bottomHalf.style.left = (x - halfSize) + "px";
    bottomHalf.style.top = y + "px";
    
    const bottomImg = document.createElement("img");
    bottomImg.src = imgSrc;
    bottomImg.style.clipPath = "inset(50% 0 0 0)";
    bottomImg.style.width = size + "px";
    bottomImg.style.height = size + "px";
    bottomHalf.appendChild(bottomImg);
    
    gameArea.appendChild(topHalf);
    gameArea.appendChild(bottomHalf);
    
    // Apply physics to halves
    const force = 6;
    const topVelocity = {
        x: Math.cos(cutAngle) * force,
        y: Math.sin(cutAngle) * force - 4
    };
    
    const bottomVelocity = {
        x: Math.cos(cutAngle + Math.PI) * force,
        y: Math.sin(cutAngle + Math.PI) * force + 4
    };
    
    animateFruitHalf(topHalf, topVelocity);
    animateFruitHalf(bottomHalf, bottomVelocity);
}

// Animate fruit half
function animateFruitHalf(half, velocity) {
    let posX = parseFloat(half.style.left);
    let posY = parseFloat(half.style.top);
    let velX = velocity.x;
    let velY = velocity.y;
    let rotation = 0;
    let rotationSpeed = (Math.random() - 0.5) * 10;
    
    const anim = setInterval(() => {
        // Gravity
        velY += 0.5;
        
        // Update position
        posX += velX;
        posY += velY;
        rotation += rotationSpeed;
        
        half.style.left = posX + "px";
        half.style.top = posY + "px";
        half.style.transform = `rotate(${rotation}deg)`;
        
        // Remove if out of screen
        if (posY > window.innerHeight + 100 || posY < -100 || 
            posX < -100 || posX > window.innerWidth + 100) {
            clearInterval(anim);
            half.remove();
        }
    }, 16);
}

// Create cut effect
function createCutEffect(x, y) {
    const effect = document.createElement("div");
    effect.className = "cut-effect";
    effect.style.left = (x - 60) + "px";
    effect.style.top = (y - 60) + "px";
    gameArea.appendChild(effect);
    
    setTimeout(() => effect.remove(), 500);
}

// Create bomb explosion
function createBombExplosion(x, y) {
    // Adjust size for mobile
    const explosionSize = isMobileDevice ? 250 : 400;
    
    // Main explosion effect
    const explosion = document.createElement("div");
    explosion.className = "bomb-explosion";
    explosion.style.left = (x - explosionSize/2) + "px";
    explosion.style.top = (y - explosionSize/2) + "px";
    explosion.style.width = explosionSize + "px";
    explosion.style.height = explosionSize + "px";
    gameArea.appendChild(explosion);
    
    // Fire particles
    for (let i = 0; i < 35; i++) {
        setTimeout(() => {
            const particle = document.createElement("div");
            particle.className = "bomb-particle";
            particle.style.left = x + "px";
            particle.style.top = y + "px";
            
            const angle = Math.random() * Math.PI * 2;
            const distance = 80 + Math.random() * 200;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            particle.style.setProperty("--tx", tx + "px");
            particle.style.setProperty("--ty", ty + "px");
            
            gameArea.appendChild(particle);
            
            setTimeout(() => particle.remove(), 1500);
        }, i * 10);
    }
    
    setTimeout(() => explosion.remove(), 700);
    
    // Screen shake effect
    gameArea.style.transform = 'translate(5px, 5px)';
    setTimeout(() => {
        gameArea.style.transform = 'translate(-5px, -5px)';
        setTimeout(() => {
            gameArea.style.transform = 'translate(0, 0)';
        }, 50);
    }, 50);
}

// Create floating score
function createFloatingScore(x, y, text) {
    const floating = document.createElement("div");
    floating.className = "floating-score";
    floating.textContent = text;
    floating.style.left = x + "px";
    floating.style.top = y + "px";
    
    // Adjust font size for mobile
    if (isMobileDevice) {
        floating.style.fontSize = '1.2rem';
    }
    
    // Color based on multiplier
    if (comboMultiplier >= 5) {
        floating.style.color = '#ff00ff';
        floating.style.textShadow = '0 0 15px rgba(255, 0, 255, 0.8)';
    } else if (comboMultiplier >= 3) {
        floating.style.color = '#00ffff';
        floating.style.textShadow = '0 0 15px rgba(0, 255, 255, 0.8)';
    }
    
    gameArea.appendChild(floating);
    
    setTimeout(() => {
        floating.remove();
    }, 1000);
}

// Lose life
function loseLife() {
    lives--;
    updateHearts();
    
    if (lives <= 0) {
        gameOver();
    }
}

// Reset combo
function resetCombo() {
    comboCount = 0;
    comboMultiplier = 1;
    updateComboDisplay();
}

// Game over dengan skor akumulatif
async function gameOver() {
    active = false;
    finalScore.textContent = score.toLocaleString();
    
    // Clear all fruits
    activeFruits.forEach(fruit => {
        clearInterval(fruit.animId);
        fruit.element.remove();
    });
    activeFruits.length = 0;
    
    // Stop spawn interval
    if (window.spawnInterval) {
        clearInterval(window.spawnInterval);
    }
    
    // Save score to leaderboard if user is logged in
    if (user && currentDifficulty) {
        try {
            // 1. Simpan di localStorage untuk cache
            saveScoreToLocalStorage();
            
            // 2. Kirim ke Supabase dengan sistem akumulatif
            await saveScoreToSupabase();
            
            showNotification("Skor berhasil disimpan!", "success");
            
        } catch (error) {
            console.error('Error saving score:', error);
            saveScoreToPendingQueue();
            showNotification("Skor disimpan offline, akan sync nanti", "info");
        }
    }
    
    setTimeout(() => {
        gameOverBox.style.display = "flex";
    }, 800);
}

// Simpan skor ke localStorage
function saveScoreToLocalStorage() {
    const userStats = JSON.parse(localStorage.getItem('bahlilUserStats') || '{}');
    
    if (!userStats[user.username]) {
        userStats[user.username] = {
            totalScore: 0,
            gamesPlayed: 0,
            difficulties: [],
            lastScores: []
        };
    }
    
    const userStat = userStats[user.username];
    
    // Update total skor (akumulasi)
    userStat.totalScore += score;
    userStat.gamesPlayed++;
    
    // Tambahkan difficulty jika belum ada
    if (!userStat.difficulties.includes(currentDifficulty)) {
        userStat.difficulties.push(currentDifficulty);
    }
    
    // Simpan skor game ini
    userStat.lastScores.unshift({
        score: score,
        difficulty: currentDifficulty,
        timestamp: new Date().toISOString()
    });
    
    // Simpan maks 10 game terakhir
    if (userStat.lastScores.length > 10) {
        userStat.lastScores = userStat.lastScores.slice(0, 10);
    }
    
    localStorage.setItem('bahlilUserStats', JSON.stringify(userStats));
}

// Simpan skor ke Supabase dengan sistem akumulatif
async function saveScoreToSupabase() {
    // Ambil data user saat ini dari Supabase
    const { data: existingData } = await supabaseClient
        .from('leaderboard-bahlil')
        .select('*')
        .eq('username', user.username)
        .maybeSingle();
    
    const userStats = JSON.parse(localStorage.getItem('bahlilUserStats') || '{}');
    const userStat = userStats[user.username] || { totalScore: 0, difficulties: [] };
    
    const newTotalScore = userStat.totalScore;
    let difficultiesArray = userStat.difficulties || [];
    
    // Pastikan difficulty saat ini ada dalam array
    if (currentDifficulty && !difficultiesArray.includes(currentDifficulty)) {
        difficultiesArray.push(currentDifficulty);
    }
    
    if (existingData) {
        // UPDATE - User sudah ada di leaderboard
        const { error } = await supabaseClient
            .from('leaderboard-bahlil')
            .update({
                total_score: newTotalScore,
                last_game_score: score,
                current_mode: currentDifficulty,
                difficulties_played: difficultiesArray,
                last_played: new Date().toISOString()
            })
            .eq('username', user.username);
        
        if (error) throw error;
        
        console.log('Score updated in Supabase');
    } else {
        // INSERT - User baru di leaderboard
        const { error } = await supabaseClient
            .from('leaderboard-bahlil')
            .insert({
                username: user.username,
                total_score: newTotalScore,
                last_game_score: score,
                current_mode: currentDifficulty,
                difficulties_played: difficultiesArray,
                last_played: new Date().toISOString()
            });
        
        if (error) throw error;
        
        console.log('Score inserted to Supabase');
    }
}

// Simpan ke queue jika error
function saveScoreToPendingQueue() {
    const pendingScores = JSON.parse(localStorage.getItem('bahlilPendingScores') || '[]');
    
    pendingScores.push({
        username: user.username,
        score: score,
        difficulty: currentDifficulty,
        timestamp: new Date().toISOString()
    });
    
    localStorage.setItem('bahlilPendingScores', JSON.stringify(pendingScores));
}

// Sync pending scores
async function syncPendingScores() {
    const pendingScores = JSON.parse(localStorage.getItem('bahlilPendingScores') || '[]');
    
    if (pendingScores.length === 0 || !user) return;
    
    try {
        for (const pending of pendingScores) {
            if (pending.username === user.username) {
                // Recalculate total score for this pending score
                const userStats = JSON.parse(localStorage.getItem('bahlilUserStats') || '{}');
                
                if (!userStats[user.username]) {
                    userStats[user.username] = {
                        totalScore: pending.score,
                        difficulties: [pending.difficulty]
                    };
                } else {
                    userStats[user.username].totalScore += pending.score;
                    if (!userStats[user.username].difficulties.includes(pending.difficulty)) {
                        userStats[user.username].difficulties.push(pending.difficulty);
                    }
                }
                
                localStorage.setItem('bahlilUserStats', JSON.stringify(userStats));
                
                // Save to Supabase
                await saveScoreToSupabase();
            }
        }
        
        // Clear pending scores setelah berhasil sync
        localStorage.removeItem('bahlilPendingScores');
        console.log('Pending scores synced successfully');
        
    } catch (error) {
        console.error('Error syncing pending scores:', error);
    }
}

// Start game with selected difficulty
function startGameWithDifficulty(difficulty) {
    currentDifficulty = difficulty;
    const settings = difficulties[difficulty];
    
    // Reset game state (hanya skor game ini, bukan total)
    gameArea.innerHTML = "";
    score = 0; // Reset skor game ini saja
    lives = settings.lives;
    active = true;
    resetCombo();
    
    // Update display
    scoreElement.textContent = score;
    updateHearts();
    
    // Set lives based on difficulty
    hearts.forEach((heart, index) => {
        if (index < lives) {
            heart.classList.remove('lost');
            heart.style.display = 'block';
        } else {
            heart.style.display = 'none';
        }
    });
    
    // Hide screens
    difficultyScreen.style.display = "none";
    gameOverBox.style.display = "none";
    
    // Remove mobile instruction if exists
    const mobileInstruction = document.getElementById('mobileInstruction');
    if (mobileInstruction) {
        mobileInstruction.style.display = 'none';
    }
    
    // Start game loop
    startGameLoop(settings);
}

// Game loop
function startGameLoop(settings) {
    // Spawn fruits periodically
    window.spawnInterval = setInterval(() => {
        if (active) {
            spawnFruit(settings);
        }
    }, settings.fruitSpawnRate);
    
    // Initial spawn
    for (let i = 0; i < 3; i++) {
        setTimeout(() => spawnFruit(settings), i * 300);
    }
}

// Authentication functions
async function handleLogin(username, password) {
    try {
        const users = JSON.parse(localStorage.getItem('bahlilUsers') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            localStorage.setItem('bahlilUser', JSON.stringify(user));
            
            // Sync pending scores setelah login
            await syncPendingScores();
            
            return { success: true, user };
        } else {
            return { success: false, message: "Username atau password salah" };
        }
    } catch (error) {
        return { success: false, message: "Terjadi kesalahan" };
    }
}

async function handleRegister(username, password) {
    try {
        const users = JSON.parse(localStorage.getItem('bahlilUsers') || '[]');
        
        if (users.some(u => u.username === username)) {
            return { success: false, message: "Username sudah digunakan" };
        }
        
        const newUser = {
            id: Date.now(),
            username,
            password,
            created_at: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('bahlilUsers', JSON.stringify(users));
        localStorage.setItem('bahlilUser', JSON.stringify(newUser));
        
        return { success: true, user: newUser };
    } catch (error) {
        return { success: false, message: "Terjadi kesalahan" };
    }
}

// Load leaderboard dengan realtime updates
async function loadLeaderboard() {
    try {
        showNotification("Memuat leaderboard...", "info");
        
        const { data, error } = await supabaseClient
            .from('leaderboard-bahlil')
            .select('*')
            .order('total_score', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        let html = '';
        
        if (data && data.length > 0) {
            html = '<div class="leaderboard-list">';
            
            data.forEach((item, index) => {
                const rank = index + 1;
                const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
                const isCurrentUser = user && user.username === item.username;
                
                // Format difficulties
                let difficultiesText = '-';
                if (item.difficulties_played && Array.isArray(item.difficulties_played)) {
                    const uniqueDifficulties = [...new Set(item.difficulties_played)];
                    difficultiesText = uniqueDifficulties
                        .map(diff => {
                            const diffName = difficulties[diff]?.name || diff.toUpperCase();
                            return `<span class="diff-badge">${diffName}</span>`;
                        })
                        .join(' ');
                }
                
                // Format last played time
                let lastPlayedText = 'Baru saja';
                if (item.last_played) {
                    const lastPlayed = new Date(item.last_played);
                    const now = new Date();
                    const diffMinutes = Math.floor((now - lastPlayed) / (1000 * 60));
                    
                    if (diffMinutes < 1) lastPlayedText = 'Baru saja';
                    else if (diffMinutes < 60) lastPlayedText = `${diffMinutes} menit lalu`;
                    else if (diffMinutes < 1440) lastPlayedText = `${Math.floor(diffMinutes / 60)} jam lalu`;
                    else lastPlayedText = `${Math.floor(diffMinutes / 1440)} hari lalu`;
                }
                
                html += `
                <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                    <div class="leaderboard-rank ${rankClass}">${rank}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-header">
                            <span class="leaderboard-username">
                                ${item.username}
                                ${isCurrentUser ? '<span class="you-badge">(Anda)</span>' : ''}
                            </span>
                            <span class="last-played">${lastPlayedText}</span>
                        </div>
                        <div class="leaderboard-scores">
                            <div class="score-item">
                                <span class="score-label">Total:</span>
                                <span class="score-value">${item.total_score.toLocaleString()}</span>
                            </div>
                            <div class="score-item">
                                <span class="score-label">Terakhir:</span>
                                <span class="score-value">${item.last_game_score.toLocaleString()}</span>
                            </div>
                        </div>
                        <div class="leaderboard-modes">
                            ${difficultiesText}
                        </div>
                    </div>
                </div>`;
            });
            
            html += '</div>';
        } else {
            html = '<p style="text-align: center; color: #ccc; padding: 30px 0;">Belum ada data leaderboard</p>';
        }
        
        document.getElementById('leaderboardContent').innerHTML = html;
        
        // Tambahkan refresh button
        if (!document.getElementById('refreshLeaderboardBtn')) {
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'refreshLeaderboardBtn';
            refreshBtn.className = 'refresh-btn';
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            refreshBtn.addEventListener('click', loadLeaderboard);
            
            const leaderboardContent = document.getElementById('leaderboardContent');
            leaderboardContent.parentNode.insertBefore(refreshBtn, leaderboardContent.nextSibling);
        }
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        document.getElementById('leaderboardContent').innerHTML = 
            '<p style="text-align: center; color: #ff4757; padding: 30px 0;">Gagal memuat leaderboard</p>';
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Mouse movement detection with trail
    let lastMouseX = 0;
    let lastMouseY = 0;
    let trailTimer = 0;
    
    document.addEventListener("mousemove", (e) => {
        if (!active) return;
        
        const x = e.clientX;
        const y = e.clientY;
        
        // Create trail dots periodically
        const now = Date.now();
        if (now - trailTimer > 30) { // Create trail every 30ms
            createTrailDot(x, y);
            trailTimer = now;
        }
        
        // Check if cursor hits fruit
        if (checkCursorHit(x, y)) {
            // Visual feedback
            document.body.style.cursor = "none";
            setTimeout(() => {
                document.body.style.cursor = "crosshair";
            }, 100);
        }
        
        lastMouseX = x;
        lastMouseY = y;
    });
    
    // Touch support
    document.addEventListener("touchmove", (e) => {
        if (!active) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        
        // Create trail dots for mobile (optional, can be disabled for performance)
        const now = Date.now();
        if (!isMobileDevice && now - trailTimer > 30) {
            createTrailDot(x, y);
            trailTimer = now;
        }
        
        checkCursorHit(x, y);
        
        lastMouseX = x;
        lastMouseY = y;
    });
    
    // Touch start for mobile
    document.addEventListener("touchstart", (e) => {
        if (!active) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        
        checkCursorHit(x, y);
    });
    
    // Difficulty buttons
    const diffButtons = document.querySelectorAll('.diff-btn');
    diffButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const difficulty = btn.dataset.difficulty;
            startGameWithDifficulty(difficulty);
        });
    });
    
    // Start button
    startButton.addEventListener("click", () => {
        startScreen.style.display = "none";
        difficultyScreen.style.display = "flex";
    });
    
    // Guide button
    document.getElementById("guideBtn").addEventListener("click", () => {
        guideScreen.style.display = "flex";
    });
    
    document.getElementById("closeGuideBtn").addEventListener("click", () => {
        guideScreen.style.display = "none";
    });
    
    // Leaderboard button
    document.getElementById("leaderboardBtn").addEventListener("click", () => {
        if (user) {
            loadLeaderboard();
            leaderboardScreen.style.display = "flex";
        } else {
            authScreen.style.display = "flex";
        }
    });
    
    document.getElementById("closeLeaderboardBtn").addEventListener("click", () => {
        leaderboardScreen.style.display = "none";
    });
    
    // Auth switch
    document.getElementById("authSwitchBtn").addEventListener("click", () => {
        isLoginMode = !isLoginMode;
        
        if (isLoginMode) {
            document.getElementById("authTitle").textContent = "MASUK";
            document.getElementById("authSubmitBtn").textContent = "MASUK";
            document.getElementById("authSwitchText").textContent = "Belum punya akun?";
            document.getElementById("authSwitchBtn").textContent = "Daftar";
            document.getElementById("confirmPasswordGroup").style.display = "none";
        } else {
            document.getElementById("authTitle").textContent = "DAFTAR";
            document.getElementById("authSubmitBtn").textContent = "DAFTAR";
            document.getElementById("authSwitchText").textContent = "Sudah punya akun?";
            document.getElementById("authSwitchBtn").textContent = "Masuk";
            document.getElementById("confirmPasswordGroup").style.display = "block";
        }
    });
    
    // Auth form submit
    document.getElementById("authForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const username = document.getElementById("authUsername").value.trim();
        const password = document.getElementById("authPassword").value;
        
        if (!username || !password) {
            alert("Harap isi semua field!");
            return;
        }
        
        if (isLoginMode) {
            const result = await handleLogin(username, password);
            if (result.success) {
                user = result.user;
                updateAuthUI();
                authScreen.style.display = "none";
                loadLeaderboard();
                leaderboardScreen.style.display = "flex";
                showNotification("Login berhasil!", "success");
            } else {
                alert(result.message);
            }
        } else {
            const confirmPassword = document.getElementById("authConfirmPassword").value;
            
            if (password !== confirmPassword) {
                alert("Password tidak cocok!");
                return;
            }
            
            if (password.length < 6) {
                alert("Password minimal 6 karakter!");
                return;
            }
            
            const result = await handleRegister(username, password);
            if (result.success) {
                user = result.user;
                updateAuthUI();
                authScreen.style.display = "none";
                loadLeaderboard();
                leaderboardScreen.style.display = "flex";
                showNotification("Pendaftaran berhasil!", "success");
            } else {
                alert(result.message);
            }
        }
    });
    
    // Game over buttons
    document.getElementById("restartBtn").addEventListener("click", () => {
        if (currentDifficulty) {
            startGameWithDifficulty(currentDifficulty);
        }
    });
    
    document.getElementById("menuBtn").addEventListener("click", () => {
        gameOverBox.style.display = "none";
        difficultyScreen.style.display = "flex";
    });
    
    // Prevent context menu
    document.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });
    
    // Prevent drag and text selection
    document.addEventListener("dragstart", (e) => {
        e.preventDefault();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        adjustUIForPortrait();
        
        if (active) {
            // Reposition fruits based on new window size
            activeFruits.forEach(fruit => {
                const rect = fruit.element.getBoundingClientRect();
                fruit.posX = rect.left;
                fruit.posY = rect.top;
            });
        }
    });
    
    // Handle orientation change
    window.addEventListener('orientationchange', () => {
        setTimeout(adjustUIForPortrait, 100);
    });
    
    // Auto refresh leaderboard every 30 seconds if open
    setInterval(() => {
        if (leaderboardScreen.style.display === 'flex') {
            loadLeaderboard();
        }
    }, 30000);
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', initGame);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (realtimeSubscription) {
        supabaseClient.removeSubscription(realtimeSubscription);
    }
});
