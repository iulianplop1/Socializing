// Configuration - Backend API endpoints
// For GitHub Pages deployment, use the deployed backend URL
// For local development, use the same origin
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE_URL = isProduction 
    ? 'https://socializing-lilac.vercel.app' // Your deployed Vercel backend URL
    : window.location.origin;
const API_ANALYZE_URL = `${API_BASE_URL}/api/analyze-interaction`;
const API_QUEST_URL = `${API_BASE_URL}/api/generate-quest`;

// RXP thresholds for bond levels (cumulative)
const BOND_LEVEL_THRESHOLDS = {
    1: 0,
    2: 50,
    3: 150,
    4: 300,
    5: 500,
    6: 750,
    7: 1100,
    8: 1500,
    9: 2000,
    10: 2600
};

// Data Models
let gameData = {
    socialLevel: 1,
    totalRXP: 0,
    allies: [],
    interactions: [],
    quests: [],
    achievements: [],
    lastQuestGeneration: null,
    streak: {
        current: 0,
        lastInteractionDate: null,
        longest: 0,
        milestones: []
    },
    reminders: [],
    settings: {
        soundEnabled: true,
        notificationsEnabled: false,
        theme: 'dark'
    }
};

// Password Protection System (Obfuscated)
(function() {
    'use strict';
    
    // Obfuscated password verification
    // This uses a simple hash function to avoid storing plaintext password
    function hashString(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash | 0; // Convert to 32bit signed integer
        }
        return Math.abs(hash).toString(16);
    }
    
    // Expected hash (change this to your password's hash)
    // To set your password: hashString("yourpassword") - replace the value below
    // Hash for "password2006" = '21bc69df'
    const expectedHash = '21bc69df'; // Hash for "password2006"
    
    // Check if already authenticated in this session
    const sessionKey = 'auth_' + btoa(window.location.href).substring(0, 10);
    let isAuthenticated = sessionStorage.getItem(sessionKey) === 'true';
    
    function verifyPassword(password) {
        const hash = hashString(password);
        // Obfuscated comparison
        const valid = hash === expectedHash;
        if (valid) {
            sessionStorage.setItem(sessionKey, 'true');
            isAuthenticated = true;
        }
        return valid;
    }
    
    // Show password modal if not authenticated
    function initPasswordProtection() {
        const passwordModal = document.getElementById('passwordModal');
        const mainContainer = document.getElementById('mainContainer');
        const passwordForm = document.getElementById('passwordForm');
        const passwordInput = document.getElementById('passwordInput');
        const passwordError = document.getElementById('passwordError');
        
        if (!passwordModal || !mainContainer) return;
        
        // Prevent bypass attempts
        function preventInspection() {
            // Make it harder to bypass by checking periodically
            setInterval(() => {
                if (!isAuthenticated && mainContainer && passwordModal) {
                    if (mainContainer.style.display !== 'none') {
                        mainContainer.style.display = 'none';
                    }
                    if (passwordModal.style.display !== 'flex') {
                        passwordModal.style.display = 'flex';
                    }
                }
            }, 1000);
            
            // Prevent right-click inspection (basic deterrent)
            document.addEventListener('contextmenu', (e) => {
                if (!isAuthenticated) {
                    e.preventDefault();
                }
            }, false);
            
            // Prevent F12 and other dev tools shortcuts (basic deterrent)
            document.addEventListener('keydown', (e) => {
                if (!isAuthenticated) {
                    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
                    if (e.key === 'F12' || 
                        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
                        (e.ctrlKey && e.key === 'U')) {
                        e.preventDefault();
                    }
                }
            }, false);
        }
        
        if (!isAuthenticated) {
            if (passwordModal) {
                passwordModal.style.display = 'flex';
            }
            if (mainContainer) {
                mainContainer.style.display = 'none';
            }
            
            if (passwordForm) {
                passwordForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const password = passwordInput ? passwordInput.value : '';
                    
                    // Debug logging (can be removed later)
                    const inputHash = hashString(password);
                    const isValid = verifyPassword(password);
                    console.log('Password check:', {
                        entered: password ? 'yes' : 'no',
                        inputHash: inputHash,
                        expectedHash: expectedHash,
                        match: isValid
                    });
                    
                    if (isValid) {
                        if (passwordModal) {
                            passwordModal.style.display = 'none';
                        }
                        if (mainContainer) {
                            mainContainer.style.display = 'block';
                        }
                        if (passwordError) {
                            passwordError.style.display = 'none';
                        }
                        if (passwordInput) {
                            passwordInput.value = '';
                        }
                    } else {
                        if (passwordError) {
                            passwordError.style.display = 'block';
                        }
                        if (passwordInput) {
                            passwordInput.value = '';
                            passwordInput.focus();
                        }
                        // Shake animation
                        if (passwordModal) {
                            const modalContent = passwordModal.querySelector('.password-modal-content');
                            if (modalContent) {
                                modalContent.style.animation = 'shake 0.5s';
                                setTimeout(() => {
                                    modalContent.style.animation = '';
                                }, 500);
                            }
                        }
                    }
                });
            }
            
            preventInspection();
        } else {
            if (passwordModal) {
                passwordModal.style.display = 'none';
            }
            if (mainContainer) {
                mainContainer.style.display = 'block';
            }
        }
    }
    
    // Initialize when DOM is ready - wait a bit to ensure all elements are loaded
    function initializeProtection() {
        // Double check elements exist before initializing
        const passwordModal = document.getElementById('passwordModal');
        const mainContainer = document.getElementById('mainContainer');
        
        if (passwordModal && mainContainer) {
            initPasswordProtection();
        } else {
            // If elements not ready yet, wait a bit and try again
            setTimeout(initializeProtection, 100);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeProtection);
    } else {
        // If DOM already loaded, wait a moment for elements to be available
        setTimeout(initializeProtection, 100);
    }
})();

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Only load data if authenticated
    if (sessionStorage.getItem('auth_' + btoa(window.location.href).substring(0, 10)) === 'true') {
        loadData();
    } else {
        // Wait for authentication before loading
        const checkAuth = setInterval(() => {
            if (sessionStorage.getItem('auth_' + btoa(window.location.href).substring(0, 10)) === 'true') {
                clearInterval(checkAuth);
                loadData();
            }
        }, 100);
    }
    applyTheme(); // Apply saved theme first
    initializeTabs();
    initializeEventListeners();
    initializeNewFeatures();
    updateUI();
    checkAchievements();
    generateDailyQuests();
    checkAndGenerateQuests();
    updateStreak();
    checkReminders();
    requestNotificationPermission();
});

// Local Storage
function saveData() {
    localStorage.setItem('socialQuestData', JSON.stringify(gameData));
}

function loadData() {
    const saved = localStorage.getItem('socialQuestData');
    if (saved) {
        const parsed = JSON.parse(saved);
        gameData = { ...gameData, ...parsed };
        // Ensure new fields exist
        if (!gameData.streak) gameData.streak = { current: 0, lastInteractionDate: null, longest: 0, milestones: [] };
        if (!gameData.reminders) gameData.reminders = [];
        if (!gameData.settings) gameData.settings = { soundEnabled: true, notificationsEnabled: false, theme: 'dark' };
        
        // Convert date strings back to Date objects
        gameData.interactions.forEach(interaction => {
            interaction.date = new Date(interaction.date);
            if (!interaction.tags) interaction.tags = [];
            if (!interaction.photos) interaction.photos = [];
        });
        gameData.quests.forEach(quest => {
            if (quest.generatedDate) quest.generatedDate = new Date(quest.generatedDate);
        });
        if (gameData.streak.lastInteractionDate) {
            gameData.streak.lastInteractionDate = new Date(gameData.streak.lastInteractionDate);
        }
        gameData.reminders.forEach(reminder => {
            if (reminder.date) reminder.date = new Date(reminder.date);
        });
    }
    
    // Load settings
    const settings = localStorage.getItem('socialQuestSettings');
    if (settings) {
        gameData.settings = { ...gameData.settings, ...JSON.parse(settings) };
    }
    updateSettingsUI();
}

// Tab Navigation
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
                
                // Render content when tab becomes active
                if (targetTab === 'insights') {
                    renderInsights();
                } else if (targetTab === 'leaderboard') {
                    const activeFilter = document.querySelector('.leaderboard-filter.active');
                    const filter = activeFilter ? activeFilter.dataset.filter : 'rxp';
                    renderLeaderboard(filter);
                } else if (targetTab === 'memories') {
                    renderMemories();
                }
            }
        });
    });
}

// Event Listeners
function initializeEventListeners() {
    // Add Ally Button
    document.getElementById('addAllyBtn').addEventListener('click', () => {
        openAllyModal();
    });

    // Ally Form Submit
    document.getElementById('allyForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveAlly();
    });

    // Ally Image Upload
    document.getElementById('allyImage').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                cropImageToCircle(event.target.result, (croppedDataUrl) => {
                    const preview = document.getElementById('allyImagePreview');
                    const previewImg = document.getElementById('allyImagePreviewImg');
                    previewImg.src = croppedDataUrl;
                    preview.style.display = 'block';
                });
            };
            reader.readAsDataURL(file);
        }
    });

    // Interaction Form Submit
    document.getElementById('interactionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await logInteraction();
    });

    // Generate Quest Button
    document.getElementById('generateQuestBtn').addEventListener('click', async () => {
        await generateAIQuest();
    });

    // Modal Close Buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            modal.classList.remove('active');
        });
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// Update UI
function updateUI() {
    updateHeaderStats();
    renderAllies();
    renderInteractions();
    renderQuests();
    renderAchievements();
    updateInteractionAllySelect();
    updateStreakDisplay();
    
    // Only render these if their tabs are active to prevent multiple renders
    const activeTab = document.querySelector('.tab-content.active')?.id;
    if (activeTab === 'leaderboard-tab') {
        const activeFilter = document.querySelector('.leaderboard-filter.active');
        const filter = activeFilter ? activeFilter.dataset.filter : 'rxp';
        renderLeaderboard(filter);
    } else if (activeTab === 'insights-tab') {
        renderInsights();
    } else if (activeTab === 'memories-tab') {
        renderMemories();
    }
}

function updateHeaderStats() {
    document.getElementById('socialLevel').textContent = gameData.socialLevel;
    document.getElementById('totalRXP').textContent = gameData.totalRXP.toLocaleString();
    document.getElementById('alliesCount').textContent = gameData.allies.length;
    updateStreakDisplay();
}

// Ally Management
// Image cropping function - crops image to circle with fixed size (200x200px)
function cropImageToCircle(imageSrc, callback) {
    const img = new Image();
    img.onload = function() {
        const size = 200; // Fixed size in pixels
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Create circular clipping path
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.clip();
        
        // Calculate scaling to fill the circle (cover mode)
        const scale = Math.max(size / img.width, size / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (size - scaledWidth) / 2;
        const y = (size - scaledHeight) / 2;
        
        // Draw the image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        
        // Convert to data URL
        const croppedDataUrl = canvas.toDataURL('image/png');
        callback(croppedDataUrl);
    };
    img.src = imageSrc;
}

function openAllyModal(allyId = null) {
    const modal = document.getElementById('allyModal');
    const form = document.getElementById('allyForm');
    const title = document.getElementById('allyModalTitle');
    const preview = document.getElementById('allyImagePreview');
    const previewImg = document.getElementById('allyImagePreviewImg');
    
    if (allyId) {
        const ally = gameData.allies.find(a => a.id === allyId);
        title.textContent = 'Edit Ally';
        document.getElementById('allyId').value = ally.id;
        document.getElementById('allyName').value = ally.name;
        document.getElementById('allyAge').value = ally.age || '';
        document.getElementById('allyHobbies').value = ally.hobbies ? ally.hobbies.join(', ') : '';
        document.getElementById('allyLikes').value = ally.likes || '';
        document.getElementById('allyDislikes').value = ally.dislikes || '';
        document.getElementById('allyOtherInfo').value = ally.otherInfo || '';
        
        // Show existing image if available
        if (ally.image) {
            previewImg.src = ally.image;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    } else {
        title.textContent = 'Log New Ally';
        form.reset();
        document.getElementById('allyId').value = '';
        preview.style.display = 'none';
    }
    
    modal.classList.add('active');
}

function saveAlly() {
    const id = document.getElementById('allyId').value;
    const name = document.getElementById('allyName').value;
    const age = parseInt(document.getElementById('allyAge').value) || null;
    const hobbies = document.getElementById('allyHobbies').value
        .split(',')
        .map(h => h.trim())
        .filter(h => h);
    const likes = document.getElementById('allyLikes').value;
    const dislikes = document.getElementById('allyDislikes').value;
    const otherInfo = document.getElementById('allyOtherInfo').value;
    
    // Get image from preview or keep existing
    const imageInput = document.getElementById('allyImage');
    const previewImg = document.getElementById('allyImagePreviewImg');
    let imageData = null;
    
    if (imageInput.files && imageInput.files[0]) {
        // New image uploaded - crop it
        const reader = new FileReader();
        reader.onload = (event) => {
            cropImageToCircle(event.target.result, (croppedDataUrl) => {
                imageData = croppedDataUrl;
                finalizeSave(id, name, age, hobbies, likes, dislikes, otherInfo, imageData);
            });
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        // Check if we're editing and should keep existing image
        const preview = document.getElementById('allyImagePreview');
        if (preview.style.display !== 'none' && previewImg.src && previewImg.src.startsWith('data:image')) {
            // Keep existing image from preview (already cropped)
            imageData = previewImg.src;
        } else {
            imageData = null;
        }
        finalizeSave(id, name, age, hobbies, likes, dislikes, otherInfo, imageData);
    }
}

function finalizeSave(id, name, age, hobbies, likes, dislikes, otherInfo, imageData) {
    if (id) {
        // Edit existing
        const ally = gameData.allies.find(a => a.id === id);
        const preview = document.getElementById('allyImagePreview');
        const previewDisplay = preview.style.display;
        
        ally.name = name;
        ally.age = age;
        ally.hobbies = hobbies;
        ally.likes = likes;
        ally.dislikes = dislikes;
        ally.otherInfo = otherInfo;
        
        // Handle image: only update if explicitly changed
        if (imageData !== null && (imageData.startsWith('data:image'))) {
            // New image uploaded or existing image shown
            ally.image = imageData;
        } else if (previewDisplay === 'none' && !document.getElementById('allyImage').files.length) {
            // Image preview was hidden and no new file selected - remove image
            ally.image = null;
        }
        // Otherwise keep existing image (imageData is null but preview is showing existing image)
    } else {
        // Create new
        const newAlly = {
            id: Date.now().toString(),
            name,
            age,
            hobbies,
            likes,
            dislikes,
            otherInfo,
            image: imageData || null,
            rxp: 0,
            createdAt: new Date().toISOString()
        };
        gameData.allies.push(newAlly);
    }

    saveData();
    updateUI();
    document.getElementById('allyModal').classList.remove('active');
    checkAchievements();
}

function removeAllyImage() {
    const preview = document.getElementById('allyImagePreview');
    const previewImg = document.getElementById('allyImagePreviewImg');
    const imageInput = document.getElementById('allyImage');
    
    preview.style.display = 'none';
    previewImg.src = '';
    imageInput.value = '';
    
    // If editing an existing ally, mark image for removal
    const allyId = document.getElementById('allyId').value;
    if (allyId) {
        // This will be handled in finalizeSave
    }
}

function deleteAlly(allyId) {
    if (confirm('Are you sure you want to delete this ally?')) {
        gameData.allies = gameData.allies.filter(a => a.id !== allyId);
        gameData.interactions = gameData.interactions.filter(i => i.allyId !== allyId);
        saveData();
        updateUI();
        checkAchievements();
    }
}

function renderAllies() {
    const container = document.getElementById('alliesList');
    
    if (gameData.allies.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-text">No allies yet. Log your first ally to get started!</div>
            </div>
        `;
        return;
    }

    container.innerHTML = gameData.allies.map(ally => {
        const bondLevel = getBondLevel(ally.rxp);
        const interactions = gameData.interactions.filter(i => i.allyId === ally.id).length;
        
        return `
            <div class="ally-card" onclick="openAllyDetail('${ally.id}')">
                ${ally.image ? `<div class="ally-image-container"><img src="${ally.image}" alt="${ally.name}" class="ally-card-image"></div>` : '<div class="ally-image-placeholder">👤</div>'}
                <div class="ally-header">
                    <div class="ally-name">${ally.name}</div>
                    <div class="bond-level">Bond Level ${bondLevel}</div>
                </div>
                <div class="ally-info">
                    ${ally.age ? `<div class="ally-info-item">Age: ${ally.age}</div>` : ''}
                    ${ally.hobbies.length > 0 ? `<div class="ally-info-item">Hobbies: ${ally.hobbies.slice(0, 2).join(', ')}</div>` : ''}
                    <div class="ally-info-item">Interactions: ${interactions}</div>
                </div>
                <div class="ally-rxp">RXP: ${ally.rxp}</div>
                <div class="ally-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-secondary" onclick="openAllyModal('${ally.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteAlly('${ally.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function openAllyDetail(allyId) {
    const ally = gameData.allies.find(a => a.id === allyId);
    const bondLevel = getBondLevel(ally.rxp);
    const nextLevelRXP = getNextLevelRXP(ally.rxp);
    const progress = nextLevelRXP > 0 ? ((ally.rxp % nextLevelRXP) / nextLevelRXP) * 100 : 100;
    const interactions = gameData.interactions
        .filter(i => i.allyId === allyId)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

    const content = `
        <div class="ally-detail">
            <div class="ally-detail-header">
                ${ally.image ? `<div class="ally-detail-image-container"><img src="${ally.image}" alt="${ally.name}" class="ally-detail-image"></div>` : '<div class="ally-detail-image-placeholder">👤</div>'}
                <div class="ally-detail-name">${ally.name}</div>
                <div class="ally-detail-level">Bond Level ${bondLevel}</div>
                <div class="ally-detail-rxp">${ally.rxp} RXP</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            
            <div class="ally-detail-section">
                <h3>📋 Character Sheet</h3>
                ${ally.age ? `<p><strong>Age:</strong> ${ally.age}</p>` : ''}
                ${ally.hobbies.length > 0 ? `<p><strong>Hobbies:</strong> ${ally.hobbies.join(', ')}</p>` : ''}
                ${ally.likes ? `<p><strong>Likes:</strong> ${ally.likes}</p>` : ''}
                ${ally.dislikes ? `<p><strong>Dislikes:</strong> ${ally.dislikes}</p>` : ''}
                ${ally.otherInfo ? `<p><strong>Other Info:</strong> ${ally.otherInfo}</p>` : ''}
            </div>

            <div class="ally-detail-interactions">
                <h3>Recent Interactions</h3>
                ${interactions.length > 0 
                    ? interactions.map(i => `
                        <div class="interaction-item ${i.quality}">
                            <strong>${i.type}</strong> - ${i.notes}<br>
                            <small>${new Date(i.date).toLocaleDateString()} - ${i.rxp} RXP</small>
                        </div>
                    `).join('')
                    : '<p>No interactions yet</p>'
                }
            </div>
        </div>
    `;

    document.getElementById('allyDetailContent').innerHTML = content;
    document.getElementById('allyDetailModal').classList.add('active');
}

// Bond Level Calculation
function getBondLevel(rxp) {
    for (let level = 10; level >= 1; level--) {
        if (rxp >= BOND_LEVEL_THRESHOLDS[level]) {
            return level;
        }
    }
    return 1;
}

function getNextLevelRXP(rxp) {
    const currentLevel = getBondLevel(rxp);
    if (currentLevel === 10) return 0;
    
    const nextLevel = currentLevel + 1;
    const currentThreshold = BOND_LEVEL_THRESHOLDS[currentLevel];
    const nextThreshold = BOND_LEVEL_THRESHOLDS[nextLevel];
    
    return nextThreshold - currentThreshold;
}

// Interaction Management
function updateInteractionAllySelect() {
    const select = document.getElementById('interactionAlly');
    select.innerHTML = gameData.allies.map(ally => 
        `<option value="${ally.id}">${ally.name}</option>`
    ).join('');
}

// logInteraction moved to new features section below

async function analyzeInteractionWithAI(notes, type, duration, quality) {
    try {
        const response = await fetch(API_ANALYZE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                notes,
                type,
                duration,
                quality
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('API Error Response:', errorData);
            
            // If backend is not available (404/500), use fallback
            if (response.status === 404 || response.status === 500) {
                console.warn('Backend API unavailable, using fallback calculation');
                return calculateRXPFallback(type, duration, quality);
            }
            
            throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.rxp !== undefined) {
            console.log('AI Analysis:', data.reasoning);
            return Math.round(data.rxp);
        } else {
            throw new Error('Invalid API response');
        }
    } catch (error) {
        console.error('AI analysis failed:', error);
        
        // Network errors or CORS issues - use fallback
        if (error.message.includes('fetch') || error.message.includes('Network') || error.message.includes('Failed to fetch')) {
            console.warn('Cannot connect to backend API. This is normal if deployed to GitHub Pages without a backend server.');
            console.warn('Using fallback calculation instead.');
            // Show a subtle notification that fallback is being used (optional)
            // showToast('Using fallback calculation (AI unavailable)', 'warning');
        }
    }

    // Fallback calculation
    return calculateRXPFallback(type, duration, quality);
}

function calculateRXPFallback(type, duration, quality) {
    let baseRXP = 10;
    
    // Type multiplier
    const typeMultipliers = {
        'text': 1,
        'call': 1.5,
        'hangout': 2,
        'event': 2.5,
        'other': 1
    };
    baseRXP *= typeMultipliers[type] || 1;
    
    // Duration multiplier
    if (duration > 0) {
        baseRXP *= (1 + duration * 0.3);
    }
    
    // Quality multiplier
    if (quality === 'positive') {
        baseRXP *= 1.5;
    } else if (quality === 'negative') {
        baseRXP = -baseRXP * 0.5; // Negative interactions give negative RXP
    }
    
    return Math.round(baseRXP);
}

function renderInteractions() {
    const container = document.getElementById('interactionsList');
    const recent = gameData.interactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 20);

    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <div class="empty-state-text">No interactions logged yet. Start logging your social interactions!</div>
            </div>
        `;
        return;
    }

    container.innerHTML = recent.map(interaction => {
        const ally = gameData.allies.find(a => a.id === interaction.allyId);
        const allyName = ally ? ally.name : 'Unknown';
        const date = new Date(interaction.date).toLocaleString();
        const qualityEmoji = interaction.quality === 'positive' ? '😊' : 
                            interaction.quality === 'negative' ? '😞' : '😐';
        
        return `
            <div class="interaction-card ${interaction.quality}">
                <div class="interaction-header">
                    <div>
                        <span class="interaction-ally">${allyName}</span>
                        <span class="interaction-type">${interaction.type}</span>
                    </div>
                    <div class="interaction-rxp" style="color: ${interaction.rxp < 0 ? 'var(--danger-color)' : 'var(--primary-color)'}">
                    ${interaction.rxp >= 0 ? '+' : ''}${interaction.rxp} RXP
                </div>
                </div>
                <div class="interaction-date">${qualityEmoji} ${date}</div>
                <div style="margin-top: 8px; color: var(--text-secondary);">${interaction.notes}</div>
            </div>
        `;
    }).join('');
}

// Quest System
function generateDailyQuests() {
    const today = new Date().toDateString();
    const existingDaily = gameData.quests.find(q => q.type === 'daily' && 
        new Date(q.date).toDateString() === today);

    if (existingDaily) return;

    const dailyQuests = [
        {
            id: `daily-${Date.now()}`,
            title: 'Say Hi!',
            description: 'Log an interaction with any 3 allies',
            type: 'daily',
            date: new Date(),
            reward: 50,
            progress: 0,
            target: 3,
            completed: false
        },
        {
            id: `daily-${Date.now()}-2`,
            title: 'Check-In',
            description: 'Ask an ally how their day is going',
            type: 'daily',
            date: new Date(),
            reward: 25,
            progress: 0,
            target: 1,
            completed: false
        }
    ];

    gameData.quests.push(...dailyQuests);
    saveData();
}

function generateWeeklyQuests() {
    const thisWeek = getWeekNumber(new Date());
    const existingWeekly = gameData.quests.find(q => q.type === 'weekly' && 
        getWeekNumber(new Date(q.date)) === thisWeek);

    if (existingWeekly) return;

    const weeklyQuests = [
        {
            id: `weekly-${Date.now()}`,
            title: 'The Reconnect',
            description: 'Log an interaction with an ally you haven\'t spoken to in over a month',
            type: 'weekly',
            date: new Date(),
            reward: 200,
            progress: 0,
            target: 1,
            completed: false
        },
        {
            id: `weekly-${Date.now()}-2`,
            title: 'Quality Time',
            description: 'Log an interaction that lasts over an hour',
            type: 'weekly',
            date: new Date(),
            reward: 150,
            progress: 0,
            target: 1,
            completed: false
        }
    ];

    gameData.quests.push(...weeklyQuests);
    saveData();
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function checkAndGenerateQuests() {
    // Check for birthdays
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    // Generate weekly quests if needed
    generateWeeklyQuests();

    // Use AI to generate contextual quests (only if it's been more than 24 hours)
    try {
        if (!gameData.lastQuestGeneration) {
            // First time - generate a quest
            await generateAIQuest(true); // Pass true to suppress notification
            gameData.lastQuestGeneration = new Date().toISOString();
            saveData();
        } else {
            const lastGenTime = new Date(gameData.lastQuestGeneration).getTime();
            const timeSinceLastGen = Date.now() - lastGenTime;
            const oneDayInMs = 86400000; // 24 hours in milliseconds
            
            // Only generate if it's been more than 24 hours
            if (timeSinceLastGen > oneDayInMs && !isNaN(lastGenTime)) {
                await generateAIQuest();
                gameData.lastQuestGeneration = new Date().toISOString();
                saveData();
            }
        }
    } catch (error) {
        // Silently fail - don't show errors on automatic generation
        console.log('Auto quest generation skipped:', error.message);
    }
}

async function generateAIQuest(suppressNotification = false) {
    try {
        const response = await fetch(API_QUEST_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                gameData: gameData
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('API Error Response:', errorData);
            throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.quest) {
            const result = data.quest;
            const quest = {
                id: `ai-${Date.now()}`,
                title: result.title,
                description: result.description,
                type: 'generated',
                date: new Date(),
                reward: result.reward,
                progress: 0,
                target: 1,
                completed: false,
                generatedDate: new Date()
            };
            gameData.quests.push(quest);
            saveData();
            renderQuests();
            // Only show notification if not suppressed (suppress for auto-generation on page load)
            if (!suppressNotification) {
                showToast('🎯 New AI quest generated!', 'success');
            }
        } else {
            throw new Error('Invalid API response');
        }
    } catch (error) {
        console.error('AI quest generation failed:', error);
        if (error.message.includes('fetch') || error.message.includes('Network') || error.message.includes('Failed to fetch')) {
            showToast('AI quest generation unavailable. Backend server needs to be deployed. See DEPLOYMENT.md for instructions.', 'warning');
        } else {
            showToast('Failed to generate AI quest. Please try again later.', 'error');
        }
    }
}

function checkQuestCompletions(interaction) {
    gameData.quests.forEach(quest => {
        if (quest.completed) return;

        let completed = false;

        switch (quest.title) {
            case 'Say Hi!':
                quest.progress++;
                completed = quest.progress >= quest.target;
                break;
            case 'Check-In':
                if (interaction.notes.toLowerCase().includes('day') || 
                    interaction.notes.toLowerCase().includes('how')) {
                    quest.progress++;
                    completed = quest.progress >= quest.target;
                }
                break;
            case 'The Reconnect':
                const lastInteraction = gameData.interactions
                    .filter(i => i.allyId === interaction.allyId)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))[1];
                
                if (lastInteraction) {
                    const daysSince = (new Date(interaction.date) - new Date(lastInteraction.date)) / (1000 * 60 * 60 * 24);
                    if (daysSince > 30) {
                        quest.progress++;
                        completed = true;
                    }
                }
                break;
            case 'Quality Time':
                if (interaction.duration >= 1) {
                    quest.progress++;
                    completed = quest.progress >= quest.target;
                }
                break;
        }

        if (completed && !quest.completed) {
            quest.completed = true;
            gameData.totalRXP += quest.reward;
            updateSocialLevel();
            saveData();
            updateUI();
        }
    });
}

function renderQuests() {
    const container = document.getElementById('questsList');
    const activeQuests = gameData.quests.filter(q => !q.completed);
    const completedQuests = gameData.quests.filter(q => q.completed).slice(-5);

    if (activeQuests.length === 0 && completedQuests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚔️</div>
                <div class="empty-state-text">No quests available. Generate an AI quest to get started!</div>
            </div>
        `;
        return;
    }

    let html = '';

    if (activeQuests.length > 0) {
        html += activeQuests.map(quest => `
            <div class="quest-card">
                <div class="quest-header">
                    <div class="quest-title">${quest.title}</div>
                    <div class="quest-reward">+${quest.reward} RXP</div>
                </div>
                <div class="quest-description">${quest.description}</div>
                ${quest.target > 1 ? `<div style="color: var(--text-secondary); margin-bottom: 12px;">Progress: ${quest.progress}/${quest.target}</div>` : ''}
                <div class="quest-actions">
                    <button class="btn btn-secondary" onclick="completeQuest('${quest.id}')">Complete</button>
                </div>
            </div>
        `).join('');
    }

    if (completedQuests.length > 0) {
        html += '<h3 style="margin-top: 24px; margin-bottom: 12px;">Recently Completed</h3>';
        html += completedQuests.map(quest => `
            <div class="quest-card completed">
                <div class="quest-header">
                    <div class="quest-title">✓ ${quest.title}</div>
                    <div class="quest-reward">+${quest.reward} RXP</div>
                </div>
                <div class="quest-description">${quest.description}</div>
            </div>
        `).join('');
    }

    container.innerHTML = html;
}

function completeQuest(questId) {
    const quest = gameData.quests.find(q => q.id === questId);
    if (quest && !quest.completed) {
        quest.completed = true;
        gameData.totalRXP += quest.reward;
        updateSocialLevel();
        saveData();
        updateUI();
        checkAchievements();
    }
}

// Achievement System
const ACHIEVEMENTS = [
    {
        id: 'socialite',
        name: 'Socialite',
        description: 'Log 10 different allies',
        icon: '👥',
        check: () => gameData.allies.length >= 10
    },
    {
        id: 'deep-diver',
        name: 'Deep-Diver',
        description: 'Reach Bond Level 10 with one ally',
        icon: '🔍',
        check: () => gameData.allies.some(ally => getBondLevel(ally.rxp) >= 10)
    },
    {
        id: 'generalist',
        name: 'Generalist',
        description: 'Reach Bond Level 5 with 5 different allies',
        icon: '🌟',
        check: () => gameData.allies.filter(ally => getBondLevel(ally.rxp) >= 5).length >= 5
    },
    {
        id: 'historian',
        name: 'Historian',
        description: 'Log 100 total interactions',
        icon: '📜',
        check: () => gameData.interactions.length >= 100
    },
    {
        id: 'listener',
        name: 'The Listener',
        description: 'Discover 25 facts about your allies',
        icon: '👂',
        check: () => {
            let factCount = 0;
            gameData.allies.forEach(ally => {
                if (ally.age) factCount++;
                if (ally.hobbies.length > 0) factCount += ally.hobbies.length;
                if (ally.likes) factCount++;
                if (ally.dislikes) factCount++;
                if (ally.otherInfo) factCount++;
            });
            return factCount >= 25;
        }
    },
    {
        id: 'party-starter',
        name: 'Party Starter',
        description: 'Log an interaction that involved 3+ allies at once',
        icon: '🎉',
        check: () => gameData.interactions.some(i => {
            // Simple check - could be enhanced
            return i.type === 'event' || i.notes.toLowerCase().includes('group') || 
                   i.notes.toLowerCase().includes('party');
        })
    }
];

function checkAchievements() {
    ACHIEVEMENTS.forEach(achievement => {
        const alreadyUnlocked = gameData.achievements.includes(achievement.id);
        if (!alreadyUnlocked && achievement.check()) {
            gameData.achievements.push(achievement.id);
            gameData.totalRXP += 100; // Bonus for achievements
            updateSocialLevel();
            saveData();
            // Could show a notification here
        }
    });
}

function renderAchievements() {
    const container = document.getElementById('achievementsList');
    
    container.innerHTML = ACHIEVEMENTS.map(achievement => {
        const unlocked = gameData.achievements.includes(achievement.id);
        return `
            <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
            </div>
        `;
    }).join('');
}

// Social Level Calculation
function updateSocialLevel() {
    // Social level based on total RXP
    const newLevel = Math.floor(gameData.totalRXP / 1000) + 1;
    if (newLevel > gameData.socialLevel) {
        gameData.socialLevel = newLevel;
        // Could show level up notification
    }
}

// ============================================
// NEW FEATURES - ALL FUNCTIONALITY
// ============================================

// Initialize New Features
function initializeNewFeatures() {
    // Quick Log Button
    const quickLogBtn = document.getElementById('quickLogBtn');
    if (quickLogBtn) {
        quickLogBtn.addEventListener('click', () => {
            document.getElementById('quickLogModal').classList.add('active');
            updateQuickLogAllySelect();
        });
    }

    // Settings Button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            document.getElementById('settingsModal').classList.add('active');
        });
    }

    // Theme Toggle Button
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
        // Update button icon based on current theme
        updateThemeToggleIcon();
    }

    // Quick Log Form
    const quickLogForm = document.getElementById('quickLogForm');
    if (quickLogForm) {
        quickLogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await quickLogInteraction();
        });
    }

    // Settings
    const soundToggle = document.getElementById('soundEnabled');
    if (soundToggle) {
        soundToggle.checked = gameData.settings.soundEnabled;
        soundToggle.addEventListener('change', (e) => {
            gameData.settings.soundEnabled = e.target.checked;
            saveSettings();
        });
    }

    const notifToggle = document.getElementById('notificationsEnabled');
    if (notifToggle) {
        notifToggle.checked = gameData.settings.notificationsEnabled;
        notifToggle.addEventListener('change', (e) => {
            gameData.settings.notificationsEnabled = e.target.checked;
            saveSettings();
            if (e.target.checked) requestNotificationPermission();
        });
    }

    // Export/Import
    document.getElementById('exportJsonBtn')?.addEventListener('click', exportJSON);
    document.getElementById('exportCsvBtn')?.addEventListener('click', exportCSV);
    document.getElementById('importFile')?.addEventListener('change', importData);

    // Reminder Form
    document.getElementById('addReminderBtn')?.addEventListener('click', () => {
        document.getElementById('reminderModal').classList.add('active');
        updateReminderAllySelect();
    });
    document.getElementById('reminderForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveReminder();
    });

    // Interaction Template
    document.getElementById('interactionTemplate')?.addEventListener('change', (e) => {
        applyTemplate(e.target.value);
    });

    // Photo Preview
    document.getElementById('interactionPhotos')?.addEventListener('change', (e) => {
        handlePhotoPreview(e.target.files);
    });


    // Leaderboard Filters
    document.querySelectorAll('.leaderboard-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.leaderboard-filter').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderLeaderboard(e.target.dataset.filter);
        });
    });

    // Memory Filters
    document.getElementById('memoryAllyFilter')?.addEventListener('change', () => renderMemories());
    document.getElementById('memoryTypeFilter')?.addEventListener('change', () => renderMemories());
}

function saveSettings() {
    localStorage.setItem('socialQuestSettings', JSON.stringify(gameData.settings));
}

// Theme Toggle
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.classList.contains('light-theme') ? 'light' : 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.classList.remove('dark-theme', 'light-theme');
    body.classList.add(`${newTheme}-theme`);
    
    gameData.settings.theme = newTheme;
    saveSettings();
    updateThemeToggleIcon();
}

function updateThemeToggleIcon() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        const isLight = document.body.classList.contains('light-theme');
        themeToggleBtn.textContent = isLight ? '🌙' : '☀️';
        themeToggleBtn.title = isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme';
    }
}

function applyTheme() {
    const savedTheme = gameData.settings.theme || 'dark';
    document.body.classList.remove('dark-theme', 'light-theme');
    document.body.classList.add(`${savedTheme}-theme`);
    updateThemeToggleIcon();
}

function updateSettingsUI() {
    if (document.getElementById('soundEnabled')) {
        document.getElementById('soundEnabled').checked = gameData.settings.soundEnabled;
    }
    if (document.getElementById('notificationsEnabled')) {
        document.getElementById('notificationsEnabled').checked = gameData.settings.notificationsEnabled;
    }
}

// Streak System
function updateStreak() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!gameData.streak.lastInteractionDate) {
        // First interaction
        const hasInteractionToday = gameData.interactions.some(i => {
            const interactionDate = new Date(i.date);
            interactionDate.setHours(0, 0, 0, 0);
            return interactionDate.getTime() === today.getTime();
        });
        
        if (hasInteractionToday) {
            gameData.streak.current = 1;
            gameData.streak.lastInteractionDate = today;
        }
    } else {
        const lastDate = new Date(gameData.streak.lastInteractionDate);
        lastDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
        
        const hasInteractionToday = gameData.interactions.some(i => {
            const interactionDate = new Date(i.date);
            interactionDate.setHours(0, 0, 0, 0);
            return interactionDate.getTime() === today.getTime();
        });
        
        if (daysDiff === 0 && hasInteractionToday) {
            // Same day, keep streak
        } else if (daysDiff === 1 && hasInteractionToday) {
            // Continue streak
            gameData.streak.current++;
            gameData.streak.lastInteractionDate = today;
            checkStreakMilestones();
        } else if (daysDiff > 1) {
            // Broken streak
            if (hasInteractionToday) {
                gameData.streak.current = 1;
                gameData.streak.lastInteractionDate = today;
            }
        }
    }
    
    if (gameData.streak.current > gameData.streak.longest) {
        gameData.streak.longest = gameData.streak.current;
    }
    
    saveData();
}

function checkStreakMilestones() {
    const milestones = [7, 30, 100];
    milestones.forEach(ms => {
        if (gameData.streak.current === ms && !gameData.streak.milestones.includes(ms)) {
            gameData.streak.milestones.push(ms);
            showToast(`🔥 ${ms} Day Streak Milestone!`, 'success');
            triggerConfetti();
            playSound('achievement');
        }
    });
}

function updateStreakDisplay() {
    const streakCount = document.getElementById('streakCount');
    if (streakCount) {
        streakCount.textContent = gameData.streak.current;
        const streakItem = streakCount.closest('.streak-item');
        if (streakItem) {
            if (gameData.streak.current >= 7) {
                streakItem.classList.add('fire');
            } else {
                streakItem.classList.remove('fire');
            }
        }
    }
}

// Quick Log
async function quickLogInteraction() {
    const allyId = document.getElementById('quickLogAlly').value;
    const type = document.getElementById('quickLogType').value;
    const notes = document.getElementById('quickLogNotes').value;

    if (!allyId || !type) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const rxp = await analyzeInteractionWithAI(notes || 'Quick log', type, 0.5, 'positive');

    const interaction = {
        id: Date.now().toString(),
        allyId,
        type,
        notes: notes || 'Quick log',
        duration: 0.5,
        quality: 'positive',
        rxp,
        date: new Date(),
        tags: [],
        photos: []
    };

    gameData.interactions.push(interaction);
    const ally = gameData.allies.find(a => a.id === allyId);
    if (ally) {
        ally.rxp += rxp;
        gameData.totalRXP += rxp;
    }

    updateSocialLevel();
    updateStreak();
    saveData();
    updateUI();
    
    document.getElementById('quickLogModal').classList.remove('active');
    document.getElementById('quickLogForm').reset();
    
    showToast(`+${rxp} RXP!`, 'success');
    animateRXP(rxp);
    playSound('success');
}

function updateQuickLogAllySelect() {
    const select = document.getElementById('quickLogAlly');
    if (select) {
        select.innerHTML = gameData.allies.map(ally => 
            `<option value="${ally.id}">${ally.name}</option>`
        ).join('');
    }
}

// Interaction Templates
function applyTemplate(template) {
    const templates = {
        coffee: { type: 'hangout', notes: 'Met for coffee ☕', duration: 1, quality: 'positive' },
        birthday: { type: 'call', notes: 'Birthday call 🎂', duration: 0.5, quality: 'positive' },
        game: { type: 'hangout', notes: 'Gaming session 🎮', duration: 2, quality: 'positive' },
        meal: { type: 'hangout', notes: 'Had a meal together 🍽️', duration: 1.5, quality: 'positive' },
        text: { type: 'text', notes: 'Quick text check-in 💬', duration: 0, quality: 'positive' },
        event: { type: 'event', notes: 'Attended an event together 🎉', duration: 3, quality: 'positive' }
    };

    if (templates[template]) {
        const t = templates[template];
        document.getElementById('interactionType').value = t.type;
        document.getElementById('interactionNotes').value = t.notes;
        document.getElementById('interactionDuration').value = t.duration;
        document.querySelector(`input[name="quality"][value="${t.quality}"]`).checked = true;
    }
}

// Photo Handling
let selectedPhotos = [];

function handlePhotoPreview(files) {
    const preview = document.getElementById('photoPreview');
    preview.innerHTML = '';
    selectedPhotos = [];

    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedPhotos.push(e.target.result);
            const div = document.createElement('div');
            div.className = 'photo-preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${index + 1}">
                <button type="button" class="remove-photo" onclick="removePhoto(${index})">×</button>
            `;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

window.removePhoto = function(index) {
    selectedPhotos.splice(index, 1);
    handlePhotoPreview([]);
    // Rebuild preview with remaining photos
    selectedPhotos.forEach((photo, i) => {
        const div = document.createElement('div');
        div.className = 'photo-preview-item';
        div.innerHTML = `
            <img src="${photo}" alt="Preview ${i + 1}">
            <button type="button" class="remove-photo" onclick="removePhoto(${i})">×</button>
        `;
        document.getElementById('photoPreview').appendChild(div);
    });
};

// Update logInteraction to handle photos and tags
// I'll update this in the existing function
const originalLogInteraction = logInteraction;
async function logInteraction() {
    const allyId = document.getElementById('interactionAlly').value;
    const type = document.getElementById('interactionType').value;
    const notes = document.getElementById('interactionNotes').value;
    const duration = parseFloat(document.getElementById('interactionDuration').value) || 0;
    const quality = document.querySelector('input[name="quality"]:checked').value;
    const tags = document.getElementById('interactionTags').value
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
    const photos = [...selectedPhotos];

    const rxp = await analyzeInteractionWithAI(notes, type, duration, quality);

    const interaction = {
        id: Date.now().toString(),
        allyId,
        type,
        notes,
        duration,
        quality,
        rxp,
        date: new Date(),
        tags,
        photos
    };

    gameData.interactions.push(interaction);
    
    const ally = gameData.allies.find(a => a.id === allyId);
    if (ally) {
        ally.rxp += rxp;
        gameData.totalRXP += rxp;
        if (gameData.totalRXP < 0) gameData.totalRXP = 0;
    }

    updateSocialLevel();
    updateStreak();
    saveData();
    updateUI();
    document.getElementById('interactionForm').reset();
    document.getElementById('photoPreview').innerHTML = '';
    selectedPhotos = [];
    
    checkQuestCompletions(interaction);
    checkAchievements();
    
    showToast(`+${rxp} RXP!`, 'success');
    animateRXP(rxp);
    playSound('success');
}

// Leaderboard
function renderLeaderboard(filter = 'rxp') {
    // Always render leaderboard - don't check if tab is active
    // This allows it to be called when switching tabs
    
    const container = document.getElementById('leaderboardList');
    if (!container) return;

    let sorted = [...gameData.allies];
    
    switch(filter) {
        case 'rxp':
            sorted.sort((a, b) => b.rxp - a.rxp);
            break;
        case 'bond':
            sorted.sort((a, b) => getBondLevel(b.rxp) - getBondLevel(a.rxp));
            break;
        case 'improved':
            // Sort by recent RXP gains
            sorted.sort((a, b) => {
                const aRecent = gameData.interactions
                    .filter(i => i.allyId === a.id && new Date(i.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
                    .reduce((sum, i) => sum + i.rxp, 0);
                const bRecent = gameData.interactions
                    .filter(i => i.allyId === b.id && new Date(i.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
                    .reduce((sum, i) => sum + i.rxp, 0);
                return bRecent - aRecent;
            });
            break;
        case 'recent':
            sorted.sort((a, b) => {
                const aLast = gameData.interactions
                    .filter(i => i.allyId === a.id)
                    .sort((i1, i2) => new Date(i2.date) - new Date(i1.date))[0];
                const bLast = gameData.interactions
                    .filter(i => i.allyId === b.id)
                    .sort((i1, i2) => new Date(i2.date) - new Date(i1.date))[0];
                if (!aLast) return 1;
                if (!bLast) return -1;
                return new Date(bLast.date) - new Date(aLast.date);
            });
            break;
    }

    container.innerHTML = sorted.map((ally, index) => {
        const bondLevel = getBondLevel(ally.rxp);
        const interactions = gameData.interactions.filter(i => i.allyId === ally.id).length;
        const rank = index + 1;
        return `
            <div class="leaderboard-item rank-${rank}">
                <div class="leaderboard-rank">#${rank}</div>
                ${ally.image ? `<img src="${ally.image}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">` : '<div style="width: 50px; height: 50px; border-radius: 50%; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center;">👤</div>'}
                <div style="flex: 1;">
                    <div style="font-weight: bold; font-size: 1.1rem;">${ally.name}</div>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">Bond Level ${bondLevel} • ${interactions} interactions</div>
                </div>
                <div style="color: var(--primary-color); font-weight: bold; font-size: 1.25rem;">${ally.rxp} RXP</div>
            </div>
        `;
    }).join('');
}

// Insights
function renderInsights() {
    // Always render insights - don't check if tab is active
    // This allows it to be called when switching tabs
    
    renderStrongestBonds();
    renderNeedsAttention();
    renderUpcomingMilestones();
    renderReminders();
}

function renderStrongestBonds() {
    const container = document.getElementById('strongestBonds');
    if (!container) return;

    const sorted = [...gameData.allies]
        .sort((a, b) => b.rxp - a.rxp)
        .slice(0, 5);

    container.innerHTML = sorted.map(ally => {
        const bondLevel = getBondLevel(ally.rxp);
        return `
            <div class="insight-item">
                <div>
                    <strong>${ally.name}</strong>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">Bond Level ${bondLevel}</div>
                </div>
                <div style="color: var(--primary-color); font-weight: bold;">${ally.rxp} RXP</div>
            </div>
        `;
    }).join('');
}

function renderNeedsAttention() {
    const container = document.getElementById('needsAttention');
    if (!container) return;

    const now = new Date();
    const needsAttention = gameData.allies
        .map(ally => {
            const lastInteraction = gameData.interactions
                .filter(i => i.allyId === ally.id)
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            
            if (!lastInteraction) return { ally, daysSince: Infinity };
            
            const daysSince = Math.floor((now - new Date(lastInteraction.date)) / (1000 * 60 * 60 * 24));
            return { ally, daysSince };
        })
        .filter(item => item.daysSince > 14)
        .sort((a, b) => b.daysSince - a.daysSince)
        .slice(0, 5);

    container.innerHTML = needsAttention.length > 0
        ? needsAttention.map(({ ally, daysSince }) => `
            <div class="insight-item">
                <div>
                    <strong>${ally.name}</strong>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">${daysSince} days ago</div>
                </div>
                <div style="color: var(--warning-color);">⚠️</div>
            </div>
        `).join('')
        : '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">All allies are well connected! 🎉</div>';
}

function renderUpcomingMilestones() {
    const container = document.getElementById('upcomingMilestones');
    if (!container) return;

    const milestones = [];
    gameData.allies.forEach(ally => {
        const currentLevel = getBondLevel(ally.rxp);
        if (currentLevel < 10) {
            const nextThreshold = BOND_LEVEL_THRESHOLDS[currentLevel + 1];
            const remaining = nextThreshold - ally.rxp;
            if (remaining > 0 && remaining <= 100) {
                milestones.push({ ally, remaining, nextLevel: currentLevel + 1 });
            }
        }
    });

    milestones.sort((a, b) => a.remaining - b.remaining);

    container.innerHTML = milestones.length > 0
        ? milestones.slice(0, 5).map(({ ally, remaining, nextLevel }) => `
            <div class="insight-item">
                <div>
                    <strong>${ally.name}</strong>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">Close to Bond Level ${nextLevel}</div>
                </div>
                <div style="color: var(--success-color); font-weight: bold;">${remaining} RXP</div>
            </div>
        `).join('')
        : '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">No upcoming milestones</div>';
}

function renderReminders() {
    const container = document.getElementById('remindersList');
    if (!container) return;

    const activeReminders = gameData.reminders.filter(r => !r.completed);
    
    container.innerHTML = activeReminders.length > 0
        ? activeReminders.map((reminder, index) => {
            let message = reminder.message || 'Reminder';
            let isUrgent = false;

            if (reminder.type === 'contact' && reminder.allyId) {
                const ally = gameData.allies.find(a => a.id === reminder.allyId);
                if (ally) {
                    const lastInteraction = gameData.interactions
                        .filter(i => i.allyId === ally.id)
                        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                    
                    if (lastInteraction) {
                        const daysSince = Math.floor((new Date() - new Date(lastInteraction.date)) / (1000 * 60 * 60 * 24));
                        if (daysSince >= reminder.days) {
                            message = `Haven't talked to ${ally.name} in ${daysSince} days`;
                            isUrgent = daysSince > reminder.days * 1.5;
                        }
                    }
                }
            }

            return `
                <div class="reminder-item ${isUrgent ? 'urgent' : ''}">
                    <div>${message}</div>
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.875rem;" onclick="removeReminder(${index})">×</button>
                </div>
            `;
        }).join('')
        : '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">No active reminders</div>';
}

window.removeReminder = function(index) {
    gameData.reminders.splice(index, 1);
    saveData();
    renderReminders();
};

function saveReminder() {
    const allyId = document.getElementById('reminderAlly').value;
    const type = document.getElementById('reminderType').value;
    const message = document.getElementById('reminderMessage').value;
    const days = parseInt(document.getElementById('reminderDays').value) || 7;

    gameData.reminders.push({
        id: Date.now().toString(),
        allyId: allyId || null,
        type,
        message,
        days,
        completed: false,
        createdAt: new Date()
    });

    saveData();
    document.getElementById('reminderModal').classList.remove('active');
    document.getElementById('reminderForm').reset();
    renderReminders();
}

function updateReminderAllySelect() {
    const select = document.getElementById('reminderAlly');
    if (select) {
        select.innerHTML = '<option value="">All Allies</option>' +
            gameData.allies.map(ally => `<option value="${ally.id}">${ally.name}</option>`).join('');
    }
}

function checkReminders() {
    // Check reminders and show notifications if enabled
    if (gameData.settings.notificationsEnabled) {
        gameData.reminders.forEach(reminder => {
            if (reminder.type === 'contact' && reminder.allyId) {
                const ally = gameData.allies.find(a => a.id === reminder.allyId);
                if (ally) {
                    const lastInteraction = gameData.interactions
                        .filter(i => i.allyId === ally.id)
                        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                    
                    if (lastInteraction) {
                        const daysSince = Math.floor((new Date() - new Date(lastInteraction.date)) / (1000 * 60 * 60 * 24));
                        if (daysSince >= reminder.days) {
                            showNotification(`Reminder: Haven't talked to ${ally.name} in ${daysSince} days`);
                        }
                    }
                }
            }
        });
    }
}

// Memories Gallery
function renderMemories() {
    if (!document.getElementById('memories-tab').classList.contains('active')) return;

    const container = document.getElementById('memoriesTimeline');
    if (!container) return;

    const allyFilter = document.getElementById('memoryAllyFilter')?.value;
    const typeFilter = document.getElementById('memoryTypeFilter')?.value;

    let filtered = gameData.interactions.filter(i => i.photos && i.photos.length > 0);
    
    if (allyFilter) {
        filtered = filtered.filter(i => i.allyId === allyFilter);
    }
    
    if (typeFilter) {
        filtered = filtered.filter(i => i.type === typeFilter);
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📸</div><div class="empty-state-text">No memories with photos yet</div></div>';
        return;
    }

    container.innerHTML = filtered.map(interaction => {
        const ally = gameData.allies.find(a => a.id === interaction.allyId);
        const allyName = ally ? ally.name : 'Unknown';
        const typeIcons = { text: '💬', call: '📞', hangout: '👥', event: '🎉', other: '✨' };
        
        return `
            <div class="memory-item">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <strong>${typeIcons[interaction.type] || '✨'} ${interaction.type} with ${allyName}</strong>
                        <div style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 4px;">
                            ${new Date(interaction.date).toLocaleDateString()}
                        </div>
                    </div>
                    <div style="color: var(--primary-color); font-weight: bold;">+${interaction.rxp} RXP</div>
                </div>
                ${interaction.notes ? `<div style="margin-bottom: 12px; color: var(--text-secondary);">${interaction.notes}</div>` : ''}
                <div class="memory-photos">
                    ${interaction.photos.map(photo => `
                        <img src="${photo}" alt="Memory" class="memory-photo" onclick="openPhotoModal('${photo}')">
                    `).join('')}
                </div>
                ${interaction.tags && interaction.tags.length > 0 ? `
                    <div style="margin-top: 12px;">
                        ${interaction.tags.map(tag => `<span class="tag ${tag}">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    // Update memory filter dropdowns
    const memoryAllyFilter = document.getElementById('memoryAllyFilter');
    if (memoryAllyFilter) {
        memoryAllyFilter.innerHTML = '<option value="">All Allies</option>' +
            gameData.allies.map(ally => `<option value="${ally.id}">${ally.name}</option>`).join('');
    }
}

window.openPhotoModal = function(photoSrc) {
    // Simple photo modal - could be enhanced
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; max-height: 90%;">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <img src="${photoSrc}" style="max-width: 100%; max-height: 80vh; border-radius: 8px;">
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
};

// Export/Import
function exportJSON() {
    const dataStr = JSON.stringify(gameData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `socialquest-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully!', 'success');
}

function exportCSV() {
    let csv = 'Ally,Type,Notes,Duration,Quality,RXP,Date,Tags\n';
    gameData.interactions.forEach(i => {
        const ally = gameData.allies.find(a => a.id === i.allyId);
        const allyName = ally ? ally.name : 'Unknown';
        const tags = (i.tags || []).join(';');
        csv += `"${allyName}","${i.type}","${i.notes.replace(/"/g, '""')}","${i.duration}","${i.quality}","${i.rxp}","${new Date(i.date).toISOString()}","${tags}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `socialquest-interactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully!', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (confirm('This will replace all current data. Are you sure?')) {
                gameData = { ...gameData, ...imported };
                loadData(); // Re-process dates
                saveData();
                updateUI();
                showToast('Data imported successfully!', 'success');
                triggerConfetti();
            }
        } catch (error) {
            showToast('Error importing data: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

// Sound Effects
function playSound(type) {
    if (!gameData.settings.soundEnabled) return;
    
    // Create audio context for sound effects
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
        case 'success':
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
        case 'achievement':
            [800, 1000, 1200].forEach((freq, i) => {
                setTimeout(() => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                    osc.start();
                    osc.stop(audioContext.currentTime + 0.15);
                }, i * 100);
            });
            break;
    }
}

// Notifications
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showNotification(message) {
    if (!gameData.settings.notificationsEnabled) return;
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SocialQuest', {
            body: message,
            icon: '🎮'
        });
    }
}

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Confetti Animation
function triggerConfetti() {
    if (typeof confetti !== 'undefined') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

// Animated RXP Gain
function animateRXP(amount) {
    const header = document.querySelector('.header');
    if (!header) return;

    const rxpElement = document.createElement('div');
    rxpElement.className = 'rxp-gain';
    rxpElement.textContent = `+${amount} RXP`;
    rxpElement.style.left = '50%';
    rxpElement.style.top = '50%';
    header.style.position = 'relative';
    header.appendChild(rxpElement);

    setTimeout(() => {
        rxpElement.remove();
    }, 1000);
}

// Loading Overlay
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('active');
}

// Enhanced Interactions Rendering with Tags
const originalRenderInteractions = renderInteractions;
function renderInteractions() {
    const container = document.getElementById('interactionsList');
    const recent = gameData.interactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 20);

    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <div class="empty-state-text">No interactions logged yet. Start logging your social interactions!</div>
            </div>
        `;
        return;
    }

    container.innerHTML = recent.map(interaction => {
        const ally = gameData.allies.find(a => a.id === interaction.allyId);
        const allyName = ally ? ally.name : 'Unknown';
        const date = new Date(interaction.date).toLocaleString();
        const qualityEmoji = interaction.quality === 'positive' ? '😊' : 
                            interaction.quality === 'negative' ? '😞' : '😐';
        const typeIcons = { text: '💬', call: '📞', hangout: '👥', event: '🎉', other: '✨' };
        
        return `
            <div class="interaction-card ${interaction.quality}">
                <div class="interaction-header">
                    <div>
                        <span class="interaction-ally">${allyName}</span>
                        <span class="interaction-type">${typeIcons[interaction.type] || '✨'} ${interaction.type}</span>
                    </div>
                    <div class="interaction-rxp" style="color: ${interaction.rxp < 0 ? 'var(--danger-color)' : 'var(--primary-color)'}">
                    ${interaction.rxp >= 0 ? '+' : ''}${interaction.rxp} RXP
                </div>
                </div>
                <div class="interaction-date">${qualityEmoji} ${date}</div>
                <div style="margin-top: 8px; color: var(--text-secondary);">${interaction.notes}</div>
                ${interaction.tags && interaction.tags.length > 0 ? `
                    <div style="margin-top: 8px;">
                        ${interaction.tags.map(tag => `<span class="tag ${tag}">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                ${interaction.photos && interaction.photos.length > 0 ? `
                    <div style="margin-top: 8px; display: flex; gap: 8px;">
                        ${interaction.photos.slice(0, 3).map(photo => `
                            <img src="${photo}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                        `).join('')}
                        ${interaction.photos.length > 3 ? `<div style="width: 60px; height: 60px; background: var(--bg-tertiary); border-radius: 4px; display: flex; align-items: center; justify-content: center;">+${interaction.photos.length - 3}</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Enhanced Ally Cards with Progress Bars
const originalRenderAllies = renderAllies;
function renderAllies() {
    const container = document.getElementById('alliesList');
    
    if (gameData.allies.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-text">No allies yet. Log your first ally to get started!</div>
            </div>
        `;
        return;
    }

    container.innerHTML = gameData.allies.map(ally => {
        const bondLevel = getBondLevel(ally.rxp);
        const nextLevelRXP = getNextLevelRXP(ally.rxp);
        const progress = nextLevelRXP > 0 ? ((ally.rxp % (nextLevelRXP + BOND_LEVEL_THRESHOLDS[bondLevel])) / nextLevelRXP) * 100 : 100;
        const interactions = gameData.interactions.filter(i => i.allyId === ally.id).length;
        const stars = '⭐'.repeat(Math.min(bondLevel, 5));
        
        return `
            <div class="ally-card" onclick="openAllyDetail('${ally.id}')">
                ${ally.image ? `<div class="ally-image-container"><img src="${ally.image}" alt="${ally.name}" class="ally-card-image"></div>` : '<div class="ally-image-placeholder">👤</div>'}
                <div class="ally-header">
                    <div class="ally-name">${ally.name}</div>
                    <div class="bond-level-badge">
                        Bond ${bondLevel}
                        <span class="bond-stars">${stars}</span>
                    </div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-label">
                        <span>Progress to Level ${bondLevel === 10 ? 10 : bondLevel + 1}</span>
                        <span>${Math.round(progress)}%</span>
                    </div>
                    <div class="progress-bar-enhanced">
                        <div class="progress-fill-enhanced" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                </div>
                <div class="ally-info">
                    ${ally.age ? `<div class="ally-info-item">Age: ${ally.age}</div>` : ''}
                    ${ally.hobbies.length > 0 ? `<div class="ally-info-item">Hobbies: ${ally.hobbies.slice(0, 2).join(', ')}</div>` : ''}
                    <div class="ally-info-item">Interactions: ${interactions}</div>
                </div>
                <div class="ally-rxp">RXP: ${ally.rxp}</div>
                <div class="ally-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-secondary" onclick="openAllyModal('${ally.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteAlly('${ally.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Enhanced Quest Rendering with Progress Bars
const originalRenderQuests = renderQuests;
function renderQuests() {
    const container = document.getElementById('questsList');
    const activeQuests = gameData.quests.filter(q => !q.completed);
    const completedQuests = gameData.quests.filter(q => q.completed).slice(-5);

    if (activeQuests.length === 0 && completedQuests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚔️</div>
                <div class="empty-state-text">No quests available. Generate an AI quest to get started!</div>
            </div>
        `;
        return;
    }

    let html = '';

    if (activeQuests.length > 0) {
        html += activeQuests.map(quest => {
            const progressPercent = quest.target > 1 ? (quest.progress / quest.target) * 100 : 0;
            return `
                <div class="quest-card">
                    <div class="quest-header">
                        <div class="quest-title">${quest.title}</div>
                        <div class="quest-reward">+${quest.reward} RXP</div>
                    </div>
                    <div class="quest-description">${quest.description}</div>
                    ${quest.target > 1 ? `
                        <div class="progress-bar-container">
                            <div class="progress-bar-label">
                                <span>Progress</span>
                                <span>${quest.progress}/${quest.target}</span>
                            </div>
                            <div class="progress-bar-enhanced">
                                <div class="progress-fill-enhanced" style="width: ${Math.min(progressPercent, 100)}%"></div>
                            </div>
                        </div>
                    ` : ''}
                    <div class="quest-actions">
                        <button class="btn btn-secondary" onclick="completeQuest('${quest.id}')">Complete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    if (completedQuests.length > 0) {
        html += '<h3 style="margin-top: 24px; margin-bottom: 12px;">Recently Completed</h3>';
        html += completedQuests.map(quest => `
            <div class="quest-card completed">
                <div class="quest-header">
                    <div class="quest-title">✓ ${quest.title}</div>
                    <div class="quest-reward">+${quest.reward} RXP</div>
                </div>
                <div class="quest-description">${quest.description}</div>
            </div>
        `).join('');
    }

    container.innerHTML = html;
}

// Enhanced Achievement Check with Celebrations
const originalCheckAchievements = checkAchievements;
function checkAchievements() {
    ACHIEVEMENTS.forEach(achievement => {
        const alreadyUnlocked = gameData.achievements.includes(achievement.id);
        if (!alreadyUnlocked && achievement.check()) {
            gameData.achievements.push(achievement.id);
            gameData.totalRXP += 100;
            updateSocialLevel();
            saveData();
            
            // Celebration!
            showToast(`🏆 Achievement Unlocked: ${achievement.name}!`, 'success');
            triggerConfetti();
            playSound('achievement');
        }
    });
}

// Enhanced Level Up with Celebration
const originalUpdateSocialLevel = updateSocialLevel;
function updateSocialLevel() {
    const newLevel = Math.floor(gameData.totalRXP / 1000) + 1;
    if (newLevel > gameData.socialLevel) {
        const oldLevel = gameData.socialLevel;
        gameData.socialLevel = newLevel;
        showToast(`🎉 Level Up! You're now Social Level ${newLevel}!`, 'success');
        triggerConfetti();
        playSound('achievement');
        
        // Update level display with animation
        const levelElement = document.getElementById('socialLevel');
        if (levelElement) {
            levelElement.style.transform = 'scale(1.5)';
            setTimeout(() => {
                levelElement.style.transform = 'scale(1)';
            }, 300);
        }
    }
}

// Make functions available globally for onclick handlers
window.openAllyModal = openAllyModal;
window.deleteAlly = deleteAlly;
window.openAllyDetail = openAllyDetail;
window.completeQuest = completeQuest;
window.removeAllyImage = removeAllyImage;

