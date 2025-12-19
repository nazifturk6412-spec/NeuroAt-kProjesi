// Uygulama State Yönetimi
const appState = {
    totalPoints: parseInt(localStorage.getItem('totalPoints')) || 0,
    totalWaste: parseInt(localStorage.getItem('totalWaste')) || 0,
    weeklyPoints: parseInt(localStorage.getItem('weeklyPoints')) || 0,
    activities: JSON.parse(localStorage.getItem('activities')) || [],
    categories: JSON.parse(localStorage.getItem('categories')) || {
        plastic: 0,
        glass: 0,
        metal: 0,
        paper: 0,
        cardboard: 0,
        general: 0
    },
    stream: null,
    scanning: false
};

// DOM Elementleri
const elements = {
    totalPoints: document.getElementById('totalPoints'),
    totalWaste: document.getElementById('totalWaste'),
    weeklyPoints: document.getElementById('weeklyPoints'),
    rank: document.getElementById('rank'),
    cameraContainer: document.getElementById('cameraContainer'),
    video: document.getElementById('video'),
    canvas: document.getElementById('canvas'),
    startCameraBtn: document.getElementById('startCameraBtn'),
    stopCameraBtn: document.getElementById('stopCameraBtn'),
    manualQRInput: document.getElementById('manualQRInput'),
    manualSubmitBtn: document.getElementById('manualSubmitBtn'),
    notification: document.getElementById('notification'),
    notificationTitle: document.getElementById('notificationTitle'),
    notificationMessage: document.getElementById('notificationMessage'),
    activityList: document.getElementById('activityList'),
    categoryCounts: {
        plastic: document.getElementById('plasticCount'),
        glass: document.getElementById('glassCount'),
        metal: document.getElementById('metalCount'),
        paper: document.getElementById('paperCount'),
        cardboard: document.getElementById('cardboardCount'),
        general: document.getElementById('generalCount')
    }
};

// Sayfa Yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    updateUI();
});

// Uygulamayı Başlat
function initializeApp() {
    console.log('NEURO-ATIK uygulaması başlatılıyor...');
    initializeMap();
}

// Event Listener'ları Ayarla
function setupEventListeners() {
    // Kamera Butonları
    elements.startCameraBtn.addEventListener('click', startCamera);
    elements.stopCameraBtn.addEventListener('click', stopCamera);
    
    // Manuel QR Girişi
    elements.manualSubmitBtn.addEventListener('click', handleManualQR);
    elements.manualQRInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleManualQR();
        }
    });
    
    // Bottom Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            handleNavigation(page, e);
        });
    });
    
    // İstatistik Kartları Tıklanabilir
    document.querySelectorAll('.stat-item.clickable').forEach(item => {
        item.addEventListener('click', (e) => {
            const stat = e.currentTarget.dataset.stat;
            handleStatClick(stat);
        });
    });
    
    // Kategori Kartları Tıklanabilir
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const category = e.currentTarget.dataset.category;
            handleCategoryClick(category);
        });
    });
    
    // Aktivite Öğeleri Tıklanabilir
    document.addEventListener('click', (e) => {
        const activityItem = e.target.closest('.activity-item');
        if (activityItem) {
            handleActivityClick(activityItem);
        }
    });
    
    // Header Puan Göstergesi Tıklanabilir
    const ecoPoints = document.querySelector('.eco-points');
    if (ecoPoints) {
        ecoPoints.addEventListener('click', () => {
            showPointsDetail();
        });
    }
    
    // User Section Tıklanabilir
    const userSection = document.querySelector('.user-section');
    if (userSection) {
        userSection.addEventListener('click', () => {
            showProfile();
        });
    }
}

// UI Güncelleme
function updateUI() {
    // Puanları Güncelle
    elements.totalPoints.textContent = appState.totalPoints.toLocaleString('tr-TR');
    elements.totalWaste.textContent = appState.totalWaste.toLocaleString('tr-TR');
    elements.weeklyPoints.textContent = appState.weeklyPoints.toLocaleString('tr-TR');
    
    // Kategori Sayılarını Güncelle
    Object.keys(elements.categoryCounts).forEach(category => {
        const count = appState.categories[category] || 0;
        if (elements.categoryCounts[category]) {
            elements.categoryCounts[category].textContent = count;
        }
    });
    
    // Aktiviteleri Güncelle
    updateActivityList();
    
    // Sıralama Hesapla (Örnek)
    updateRank();
    
    // Ödül Hedefi Güncelle
    updateRewardProgress();
    
    // Çevresel Etki İstatistiklerini Güncelle
    updateEnvironmentalStats();
    
    // Doluluk Oranlı Kutu Listesini Güncelle
    updateBinList();
}

// Kamera Başlat
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Arka kamera
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        appState.stream = stream;
        elements.video.srcObject = stream;
        elements.cameraContainer.classList.add('active');
        elements.startCameraBtn.style.display = 'none';
        elements.stopCameraBtn.style.display = 'inline-flex';
        
        // QR Kod Taramayı Başlat
        startQRScanning();
        
    } catch (error) {
        console.error('Kamera erişim hatası:', error);
        showNotification('Hata', 'Kamera erişimi sağlanamadı. Lütfen izinleri kontrol edin.', 'error');
    }
}

// Kamera Durdur
function stopCamera() {
    if (appState.stream) {
        appState.stream.getTracks().forEach(track => track.stop());
        appState.stream = null;
    }
    
    elements.video.srcObject = null;
    elements.cameraContainer.classList.remove('active');
    elements.startCameraBtn.style.display = 'inline-flex';
    elements.stopCameraBtn.style.display = 'none';
    appState.scanning = false;
}

// QR Kod Tarama
function startQRScanning() {
    appState.scanning = true;
    const context = elements.canvas.getContext('2d');
    
    function scan() {
        if (!appState.scanning || !elements.video.videoWidth) {
            return;
        }
        
        elements.canvas.width = elements.video.videoWidth;
        elements.canvas.height = elements.video.videoHeight;
        context.drawImage(elements.video, 0, 0);
        
        const imageData = context.getImageData(0, 0, elements.canvas.width, elements.canvas.height);
        
        try {
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                handleQRCode(code.data);
                stopCamera();
            }
        } catch (error) {
            console.error('QR kod okuma hatası:', error);
        }
        
        requestAnimationFrame(scan);
    }
    
    scan();
}

// QR Kod İşleme
function handleQRCode(qrData) {
    console.log('QR Kod okundu:', qrData);
    
    // QR kod formatını kontrol et (örnek: "NEURO-ATIK-12345")
    if (qrData.startsWith('NEURO-ATIK-') || qrData.length > 0) {
        processWasteSubmission(qrData);
    } else {
        showNotification('Hata', 'Geçersiz QR kod formatı', 'error');
    }
}

// Manuel QR Girişi
function handleManualQR() {
    const qrCode = elements.manualQRInput.value.trim();
    
    if (!qrCode) {
        showNotification('Uyarı', 'Lütfen QR kod numarasını girin', 'warning');
        return;
    }
    
    processWasteSubmission(qrCode);
    elements.manualQRInput.value = '';
}

// Atık Gönderimi İşleme
function processWasteSubmission(qrCode) {
    // Rastgele atık kategorisi seç (gerçek uygulamada AI'dan gelecek)
    const categories = ['plastic', 'glass', 'metal', 'paper', 'cardboard', 'general'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    // Puan hesaplama (kategoriye göre farklı puanlar)
    const pointsMap = {
        plastic: 10,
        glass: 12,
        metal: 15,
        paper: 8,
        cardboard: 8,
        general: 5
    };
    
    const pointsEarned = pointsMap[randomCategory] || 10;
    
    // State'i Güncelle
    appState.totalPoints += pointsEarned;
    appState.totalWaste += 1;
    appState.weeklyPoints += pointsEarned;
    appState.categories[randomCategory] = (appState.categories[randomCategory] || 0) + 1;
    
    // Aktivite Ekle
    const activity = {
        id: Date.now(),
        category: randomCategory,
        points: pointsEarned,
        qrCode: qrCode,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('tr-TR'),
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };
    
    appState.activities.unshift(activity);
    
    // Maksimum 50 aktivite tut
    if (appState.activities.length > 50) {
        appState.activities = appState.activities.slice(0, 50);
    }
    
    // LocalStorage'a Kaydet
    saveToLocalStorage();
    
    // UI Güncelle
    updateUI();
    
    // Puan göstergesine animasyon ekle
    const ecoPoints = document.querySelector('.eco-points');
    if (ecoPoints) {
        ecoPoints.classList.add('pulse');
        setTimeout(() => {
            ecoPoints.classList.remove('pulse');
        }, 500);
    }
    
    // Bildirim Göster
    const categoryNames = {
        plastic: 'Plastik',
        glass: 'Cam',
        metal: 'Metal',
        paper: 'Kağıt',
        cardboard: 'Karton',
        general: 'Genel Çöp'
    };
    
    showNotification(
        'Başarılı!',
        `${categoryNames[randomCategory]} atığı için +${pointsEarned} Eko-Puan kazandınız!`,
        'success'
    );
}

// Bildirim Göster
function showNotification(title, message, type = 'success') {
    elements.notificationTitle.textContent = title;
    elements.notificationMessage.textContent = message;
    elements.notification.style.display = 'block';
    
    // Bildirim rengini ayarla
    const notificationContent = elements.notification.querySelector('.notification-content');
    notificationContent.style.borderLeftColor = type === 'success' ? 'var(--success)' : 'var(--error)';
    
    // 3 saniye sonra gizle
    setTimeout(() => {
        elements.notification.style.display = 'none';
    }, 3000);
}

// Aktivite Listesini Güncelle
function updateActivityList() {
    if (appState.activities.length === 0) {
        elements.activityList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <p>Henüz aktivite yok</p>
                <p class="empty-hint">QR kod okutarak başlayın!</p>
            </div>
        `;
        return;
    }
    
    const categoryIcons = {
        plastic: '🥤',
        glass: '🍾',
        metal: '🥫',
        paper: '📄',
        cardboard: '📦',
        general: '🗑️'
    };
    
    const categoryNames = {
        plastic: 'Plastik',
        glass: 'Cam',
        metal: 'Metal',
        paper: 'Kağıt',
        cardboard: 'Karton',
        general: 'Genel Çöp'
    };
    
    elements.activityList.innerHTML = appState.activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">${categoryIcons[activity.category] || '♻️'}</div>
            <div class="activity-info">
                <h4>${categoryNames[activity.category] || activity.category}</h4>
                <p>${activity.date} ${activity.time}</p>
            </div>
            <div class="activity-points">+${activity.points}</div>
        </div>
    `).join('');
}

// Sıralama Güncelle
function updateRank() {
    // Örnek sıralama hesaplama (gerçek uygulamada API'den gelecek)
    const rank = Math.floor(Math.random() * 100) + 1;
    elements.rank.textContent = `#${rank}`;
}

// Navigation İşleme
function handleNavigation(page, event) {
    // Aktif sayfayı güncelle
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    event.currentTarget.classList.add('active');
    
    // Sayfa içeriğini göster/gizle
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    switch(page) {
        case 'home':
            sections.forEach(section => {
                section.style.display = 'block';
            });
            // Harita yeniden boyutlandır
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                }
            }, 100);
            break;
        case 'scan':
            sections.forEach(section => {
                section.style.display = 'none';
            });
            document.querySelector('.qr-section').style.display = 'block';
            break;
        case 'stats':
            sections.forEach(section => {
                section.style.display = 'none';
            });
            document.querySelector('.stats-section').style.display = 'block';
            document.querySelector('.categories-section').style.display = 'block';
            break;
        case 'profile':
            showProfile();
            break;
    }
    
    // Scroll to top
    document.querySelector('.app-container').scrollTo({ top: 0, behavior: 'smooth' });
}

// İstatistik Tıklama İşleme
function handleStatClick(stat) {
    const messages = {
        tree: `🌳 ${calculateSavedTrees()} ağaç kurtardınız!`,
        water: `💧 ${calculateSavedWater()}L su tasarrufu sağladınız!`,
        energy: `⚡ ${calculateSavedEnergy()}kw enerji tasarrufu sağladınız!`
    };
    
    showNotification('Çevresel Etki', messages[stat] || 'İstatistik bilgisi', 'success');
    
    // Pulse animasyonu
    const statItem = document.querySelector(`[data-stat="${stat}"]`);
    if (statItem) {
        statItem.style.animation = 'pulse 0.5s ease-out';
        setTimeout(() => {
            statItem.style.animation = '';
        }, 500);
    }
}

// Ödül Hedefi İlerleme Çubuğunu Güncelle
function updateRewardProgress() {
    const targetPoints = 1000; // Toplam hedef puan
    const currentPoints = appState.totalPoints;
    const remainingPoints = Math.max(0, targetPoints - currentPoints);
    const progress = Math.min(100, (currentPoints / targetPoints) * 100);
    
    const remainingPointsEl = document.getElementById('remainingPoints');
    const progressFillEl = document.getElementById('rewardProgressFill');
    const progressTextEl = document.getElementById('progressText');
    
    if (remainingPointsEl) {
        remainingPointsEl.textContent = remainingPoints.toLocaleString('tr-TR');
    }
    
    if (progressFillEl) {
        progressFillEl.style.width = `${progress}%`;
    }
    
    if (progressTextEl) {
        progressTextEl.textContent = `${Math.round(progress)}%`;
    }
}

// Çevresel Etki İstatistiklerini Hesapla ve Güncelle
function calculateSavedTrees() {
    // Her 100 atık = 1 ağaç (örnek hesaplama)
    return Math.floor(appState.totalWaste / 100);
}

function calculateSavedWater() {
    // Her atık = 2.5L su tasarrufu (örnek hesaplama)
    return Math.floor(appState.totalWaste * 2.5);
}

function calculateSavedEnergy() {
    // Her atık = 0.3kw enerji tasarrufu (örnek hesaplama)
    return Math.floor(appState.totalWaste * 0.3);
}

function updateEnvironmentalStats() {
    const savedTreesEl = document.getElementById('savedTrees');
    const savedWaterEl = document.getElementById('savedWater');
    const savedEnergyEl = document.getElementById('savedEnergy');
    
    if (savedTreesEl) {
        savedTreesEl.textContent = calculateSavedTrees();
    }
    
    if (savedWaterEl) {
        savedWaterEl.textContent = `${calculateSavedWater()}L`;
    }
    
    if (savedEnergyEl) {
        savedEnergyEl.textContent = `${calculateSavedEnergy()}kw`;
    }
}

// Doluluk Oranlı Kutu Listesini Güncelle
function updateBinList() {
    const binListEl = document.getElementById('binList');
    if (!binListEl) return;
    
    // Önemli noktaları listele (ilk 6 tanesi)
    const importantBins = wasteBinLocations.slice(0, 6);
    
    if (importantBins.length === 0) {
        binListEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Henüz kutu bilgisi yok</p>';
        return;
    }
    
    binListEl.innerHTML = importantBins.map(bin => {
        const capacity = bin.capacity;
        let capacityClass = 'low'; // Yeşil - %80 altı
        if (capacity >= 80) {
            capacityClass = 'high'; // Kırmızı - %80 ve üzeri
        } else if (capacity >= 50) {
            capacityClass = 'medium'; // Turuncu - %50-79 arası
        }
        
        return `
            <div class="bin-list-item">
                <span class="bin-name">${bin.name}</span>
                <div class="bin-capacity-container">
                    <div class="bin-capacity-bar">
                        <div class="bin-capacity-fill ${capacityClass}" style="width: ${capacity}%"></div>
                    </div>
                    <span class="bin-capacity-text">${capacity}%</span>
                </div>
            </div>
        `;
    }).join('');
}

// Kategori Tıklama İşleme
function handleCategoryClick(category) {
    const categoryNames = {
        plastic: 'Plastik',
        glass: 'Cam',
        metal: 'Metal',
        paper: 'Kağıt',
        cardboard: 'Karton',
        general: 'Genel Çöp'
    };
    
    const count = appState.categories[category] || 0;
    const categoryName = categoryNames[category] || category;
    
    showNotification(
        categoryName,
        `${categoryName} kategorisinde ${count} atık ayrıştırdınız!`,
        'success'
    );
    
    // Kategori kartına animasyon
    const categoryItem = document.querySelector(`[data-category="${category}"]`);
    if (categoryItem) {
        categoryItem.style.transform = 'scale(0.95)';
        setTimeout(() => {
            categoryItem.style.transform = '';
        }, 200);
    }
}

// Aktivite Tıklama İşleme
function handleActivityClick(activityItem) {
    const activityInfo = activityItem.querySelector('.activity-info h4');
    const activityPoints = activityItem.querySelector('.activity-points');
    
    if (activityInfo && activityPoints) {
        const category = activityInfo.textContent;
        const points = activityPoints.textContent;
        
        showNotification(
            'Aktivite Detayı',
            `${category} atığı için ${points} puan kazandınız!`,
            'success'
        );
    }
    
    // Aktivite kartına animasyon
    activityItem.style.transform = 'scale(0.98)';
    setTimeout(() => {
        activityItem.style.transform = '';
    }, 200);
}

// Puan Detayı Göster
function showPointsDetail() {
    const detail = `
        Toplam Puan: ${appState.totalPoints.toLocaleString('tr-TR')} 🌱
        Bu Hafta: ${appState.weeklyPoints.toLocaleString('tr-TR')} 📊
        Toplam Atık: ${appState.totalWaste.toLocaleString('tr-TR')} 📦
    `;
    
    showNotification('Eko-Puan Detayları', detail, 'success');
    
    // Pulse animasyonu
    const ecoPoints = document.querySelector('.eco-points');
    if (ecoPoints) {
        ecoPoints.classList.add('pulse');
        setTimeout(() => {
            ecoPoints.classList.remove('pulse');
        }, 500);
    }
}

// Profil Göster
function showProfile() {
    const profileInfo = `
        Kullanıcı Adı: Kullanıcı 👤
        Toplam Puan: ${appState.totalPoints.toLocaleString('tr-TR')} 🌱
        Sıralama: ${elements.rank.textContent} 🏆
    `;
    
    showNotification('Profil Bilgileri', profileInfo, 'success');
}

// LocalStorage'a Kaydet
function saveToLocalStorage() {
    localStorage.setItem('totalPoints', appState.totalPoints.toString());
    localStorage.setItem('totalWaste', appState.totalWaste.toString());
    localStorage.setItem('weeklyPoints', appState.weeklyPoints.toString());
    localStorage.setItem('activities', JSON.stringify(appState.activities));
    localStorage.setItem('categories', JSON.stringify(appState.categories));
}

// Sayfa Kapatılırken Kamera Durdur
window.addEventListener('beforeunload', () => {
    stopCamera();
});

// Harita Değişkenleri
let map = null;
let markers = [];

// A Okulu Çevresi Çöp Kutusu Konumları
// Okul yaklaşık konumu: Yenimahalle, Ankara (örnek koordinatlar)
const schoolLocation = { lat: 39.9256, lng: 32.8361 }; // Yenimahalle merkez

const wasteBinLocations = [
    // Lise çevresindeki çöp kutuları (okulun etrafında 500m-1km mesafede)
    { lat: 39.9260, lng: 32.8365, name: 'Okul Girişi', address: 'A Okulu Önü', status: 'Aktif', capacity: 75 },
    { lat: 39.9250, lng: 32.8370, name: 'Spor Salonu Yanı', address: 'Okul Spor Salonu Karşısı', status: 'Aktif', capacity: 82 },
    { lat: 39.9265, lng: 32.8355, name: 'Park Girişi', address: 'Okul Parkı Girişi', status: 'Aktif', capacity: 68 },
    { lat: 39.9245, lng: 32.8365, name: 'Kantin Çıkışı', address: 'Okul Kantin Çıkışı', status: 'Aktif', capacity: 90 },
    { lat: 39.9255, lng: 32.8380, name: 'Otobüs Durağı', address: 'Okul Otobüs Durağı Yanı', status: 'Aktif', capacity: 88 },
    { lat: 39.9270, lng: 32.8350, name: 'Bahçe Girişi', address: 'Okul Bahçe Girişi', status: 'Aktif', capacity: 72 },
    { lat: 39.9240, lng: 32.8375, name: 'Yan Sokak', address: 'Okul Yan Sokağı', status: 'Aktif', capacity: 65 },
    { lat: 39.9268, lng: 32.8368, name: 'Arka Giriş', address: 'Okul Arka Girişi', status: 'Aktif', capacity: 78 }
];

// Haritayı Başlat
function initializeMap() {
    // A Okulu merkez koordinatları
    const schoolCenter = [schoolLocation.lat, schoolLocation.lng];
    
    // Leaflet haritasını oluştur
    map = L.map('map', {
        center: schoolCenter,
        zoom: 16,
        zoomControl: true,
        scrollWheelZoom: true
    });
    
    // Yeşil temalı harita tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Okul marker'ı ekle
    addSchoolMarker();
    
    // Çöp kutusu konumlarını ekle
    addWasteBinMarkers();
    
    // Harita yüklendiğinde marker'ları göster
    map.whenReady(() => {
        console.log('Harita yüklendi - A Okulu çevresi');
        // Tüm marker'ları içeren bounds
        if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.05));
        }
        // Doluluk listesini güncelle
        updateBinList();
    });
}

// Okul Marker'ı Ekle
function addSchoolMarker() {
    const schoolIcon = L.divIcon({
        className: 'school-marker-div',
        html: `<div class="school-marker">🏫</div>`,
        iconSize: [50, 50],
        iconAnchor: [25, 25],
        popupAnchor: [0, -25]
    });
    
    const schoolMarker = L.marker([schoolLocation.lat, schoolLocation.lng], {
        icon: schoolIcon
    }).addTo(map);
    
    schoolMarker.bindPopup(`
        <div class="marker-popup">
            <h4>🏫 A Okulu</h4>
            <p>Yenimahalle, Ankara</p>
            <p style="margin-top: 8px; color: var(--primary-color);">
                <strong>Akıllı Atık Yönetim Sistemi</strong>
            </p>
        </div>
    `, {
        maxWidth: 250,
        className: 'custom-popup school-popup'
    });
}

// Çöp Kutusu Marker'larını Ekle
function addWasteBinMarkers() {
    wasteBinLocations.forEach((location, index) => {
        // Özel yeşil marker ikonu oluştur
        const customIcon = L.divIcon({
            className: 'custom-marker-div',
            html: `<div class="custom-marker">♻️</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });
        
        // Marker oluştur
        const marker = L.marker([location.lat, location.lng], {
            icon: customIcon
        }).addTo(map);
        
        // Popup içeriği (yeşil tema)
        const popupContent = `
            <div class="marker-popup">
                <h4>♻️ ${location.name}</h4>
                <p>${location.address}</p>
                <p style="margin-top: 8px;">
                    <strong>Durum:</strong> <span style="color: var(--success); font-weight: 600;">${location.status}</span><br>
                    <strong>Doluluk:</strong> <span style="color: var(--primary-color);">${location.capacity}%</span>
                </p>
                <button class="btn btn-primary" style="margin-top: 8px; padding: 8px 16px; font-size: 12px; background: var(--primary-color);" onclick="navigateToBin('${location.name}')">
                    📍 Yol Tarifi Al
                </button>
            </div>
        `;
        
        marker.bindPopup(popupContent, {
            maxWidth: 250,
            className: 'custom-popup'
        });
        
        // Marker'a tıklama efekti
        marker.on('click', function() {
            showNotification('Konum Seçildi', `${location.name} konumuna yol tarifi alındı`, 'success');
        });
        
        markers.push(marker);
    });
}

// Çöp Kutusuna Yönlendirme
function navigateToBin(binName) {
    const location = wasteBinLocations.find(loc => loc.name === binName);
    if (location) {
        // Gerçek uygulamada burada navigasyon açılır
        const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
        window.open(url, '_blank');
        showNotification('Yol Tarifi', `${binName} için yol tarifi açılıyor...`, 'success');
    }
}

// PWA için Service Worker (opsiyonel)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service worker kaydı burada yapılabilir
    });
}

