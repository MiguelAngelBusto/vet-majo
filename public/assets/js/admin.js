// ==================== CONFIGURACIÓN ====================
const API_URL = window.location.origin + '/api';
let authToken = localStorage.getItem('vetqr_token');
let currentUser = null;

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        verifyToken();
    } else {
        showLogin();
    }
    
    // Fecha actual
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// ==================== AUTH ====================
function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
}

async function verifyToken() {
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            document.getElementById('user-name').textContent = currentUser.nombre;
            showDashboard();
            loadStats();
            loadQRList();
        } else {
            logout();
        }
    } catch (error) {
        console.error('Error verifying token:', error);
        logout();
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = e.target.querySelector('.btn-login');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    const errorDiv = document.getElementById('login-error');
    
    btn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('vetqr_token', authToken);
            document.getElementById('user-name').textContent = currentUser.nombre;
            showDashboard();
            loadStats();
            loadQRList();
        } else {
            errorDiv.textContent = data.error || 'Error al iniciar sesión';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Error de conexión';
        errorDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
});

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('vetqr_token');
    showLogin();
}

// ==================== NAVEGACIÓN ====================
function showSection(sectionName) {
    // Actualizar navegación
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    
    // Mostrar sección
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`section-${sectionName}`).classList.add('active');
    
    // Actualizar título
    const titles = {
        'overview': 'Resumen',
        'qr': 'Generar QR',
        'mascotas': 'Mascotas Registradas',
        'buscar': 'Buscar Mascotas'
    };
    document.getElementById('section-title').textContent = titles[sectionName];
    
    // Cargar datos si es necesario
    if (sectionName === 'mascotas') {
        loadMascotas();
    }
}

// ==================== STATS ====================
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('stat-total-qr').textContent = data.totalQr;
            document.getElementById('stat-registradas').textContent = data.mascotasRegistradas;
            document.getElementById('stat-pendientes').textContent = data.qrPendientes;
            document.getElementById('stat-escaneos').textContent = data.totalEscaneos;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ==================== QR LIST ====================
async function loadQRList() {
    try {
        const response = await fetch(`${API_URL}/qr/list`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const qrCodes = await response.json();
            const container = document.getElementById('recent-qr-list');
            
            if (qrCodes.length === 0) {
                container.innerHTML = '<p class="empty-state">No hay QR generados aún</p>';
                return;
            }
            
            container.innerHTML = qrCodes.slice(0, 5).map(qr => {
                const isRegistered = qr.mascotas && qr.mascotas.length > 0;
                const mascota = isRegistered ? qr.mascotas[0] : null;
                
                return `
                    <div class="qr-item">
                        <div class="qr-item-info">
                            <div class="qr-item-icon">
                                <i class="fas fa-qrcode"></i>
                            </div>
                            <div class="qr-item-details">
                                <h4>${qr.codigo_qr.substring(0, 20)}...</h4>
                                <p>${new Date(qr.fecha_creacion).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <span class="qr-status ${isRegistered ? 'registered' : 'pending'}">
                            ${isRegistered ? 'Registrado' : 'Pendiente'}
                        </span>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading QR list:', error);
    }
}

// ==================== GENERAR QR ====================
async function generateQR() {
    const btn = document.querySelector('.btn-generate');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/qr/generate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            document.getElementById('qr-image').src = data.qrImage;
            document.getElementById('qr-code-text').textContent = data.qr.codigo_qr;
            document.getElementById('qr-url').value = data.qrUrl;
            document.getElementById('qr-download').href = data.qrImage;
            
            document.getElementById('qr-result').classList.remove('hidden');
            
            // Recargar lista
            loadQRList();
            loadStats();
        }
    } catch (error) {
        console.error('Error generating QR:', error);
        alert('Error al generar el QR');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function copyURL() {
    const urlInput = document.getElementById('qr-url');
    urlInput.select();
    document.execCommand('copy');
    
    const btn = document.querySelector('.btn-copy');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
        btn.innerHTML = originalHTML;
    }, 2000);
}

function printQR() {
    const qrImage = document.getElementById('qr-image').src;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head><title>Imprimir QR</title></head>
        <body style="text-align: center; padding: 50px;">
            <img src="${qrImage}" style="max-width: 400px;">
            <p style="margin-top: 30px; font-family: Arial;">Escanea para registrar a tu mascota</p>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ==================== MASCOTAS ====================
async function loadMascotas() {
    try {
        const response = await fetch(`${API_URL}/qr/list`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const qrCodes = await response.json();
            const container = document.getElementById('mascotas-container');
            
            const mascotasConQR = qrCodes.filter(qr => qr.mascotas && qr.mascotas.length > 0);
            
            if (mascotasConQR.length === 0) {
                container.innerHTML = '<p class="empty-state">No hay mascotas registradas aún</p>';
                return;
            }
            
            container.innerHTML = mascotasConQR.map(qr => {
                const mascota = qr.mascotas[0];
                return `
                    <div class="mascota-card">
                        <div class="mascota-card-header">
                            <div class="mascota-avatar">
                                <i class="fas fa-paw"></i>
                            </div>
                            <div>
                                <h4>${mascota.nombre_mascota}</h4>
                                <p>${mascota.nombre_dueno}</p>
                            </div>
                        </div>
                        <div class="mascota-info">
                            <div class="mascota-info-item">
                                <i class="fas fa-envelope"></i>
                                <span>${mascota.email_dueno}</span>
                            </div>
                            <div class="mascota-info-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${mascota.direccion_dueno}</span>
                            </div>
                            ${mascota.telefono_dueno ? `
                            <div class="mascota-info-item">
                                <i class="fas fa-phone"></i>
                                <span>${mascota.telefono_dueno}</span>
                            </div>
                            ` : ''}
                        </div>
                        <div class="mascota-actions">
                            <button onclick="editMascota('${mascota.id}', '${mascota.nombre_mascota}', '${mascota.nombre_dueno}', '${mascota.email_dueno}', '${mascota.telefono_dueno || ''}', '${mascota.direccion_dueno}')" class="btn-edit">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button onclick="deleteMascota('${mascota.id}')" class="btn-delete">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading mascotas:', error);
    }
}

// ==================== BUSCAR ====================
async function buscarMascotas() {
    const query = document.getElementById('search-input').value.trim();
    
    if (!query) {
        document.getElementById('search-results').innerHTML = '<p class="empty-state">Ingresa un término de búsqueda</p>';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/mascotas/buscar?q=${encodeURIComponent(query)}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const mascotas = await response.json();
            const container = document.getElementById('search-results');
            
            if (mascotas.length === 0) {
                container.innerHTML = '<p class="empty-state">No se encontraron resultados</p>';
                return;
            }
            
            container.innerHTML = mascotas.map(mascota => `
                <div class="mascota-card">
                    <div class="mascota-card-header">
                        <div class="mascota-avatar">
                            <i class="fas fa-paw"></i>
                        </div>
                        <div>
                            <h4>${mascota.nombre_mascota}</h4>
                            <p>${mascota.nombre_dueno}</p>
                        </div>
                    </div>
                    <div class="mascota-info">
                        <div class="mascota-info-item">
                            <i class="fas fa-envelope"></i>
                            <span>${mascota.email_dueno}</span>
                        </div>
                        <div class="mascota-info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${mascota.direccion_dueno}</span>
                        </div>
                    </div>
                    <div class="mascota-actions">
                        <button onclick="editMascota('${mascota.id}', '${mascota.nombre_mascota}', '${mascota.nombre_dueno}', '${mascota.email_dueno}', '${mascota.telefono_dueno || ''}', '${mascota.direccion_dueno}')" class="btn-edit">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error searching mascotas:', error);
    }
}

// ==================== EDITAR MASCOTA ====================
function editMascota(id, nombreMascota, nombreDueno, email, telefono, direccion) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-nombre-mascota').value = nombreMascota;
    document.getElementById('edit-nombre-dueno').value = nombreDueno;
    document.getElementById('edit-email').value = email;
    document.getElementById('edit-telefono').value = telefono;
    document.getElementById('edit-direccion').value = direccion;
    
    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('edit-id').value;
    const updates = {
        nombre_mascota: document.getElementById('edit-nombre-mascota').value,
        nombre_dueno: document.getElementById('edit-nombre-dueno').value,
        email_dueno: document.getElementById('edit-email').value,
        telefono_dueno: document.getElementById('edit-telefono').value,
        direccion_dueno: document.getElementById('edit-direccion').value
    };
    
    try {
        const response = await fetch(`${API_URL}/mascotas/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        
        if (response.ok) {
            closeModal();
            loadMascotas();
            loadQRList();
            alert('Mascota actualizada correctamente');
        } else {
            alert('Error al actualizar la mascota');
        }
    } catch (error) {
        console.error('Error updating mascota:', error);
        alert('Error al actualizar la mascota');
    }
});

// ==================== ELIMINAR MASCOTA ====================
async function deleteMascota(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta mascota?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/mascotas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            loadMascotas();
            loadQRList();
            loadStats();
            alert('Mascota eliminada correctamente');
        } else {
            alert('Error al eliminar la mascota');
        }
    } catch (error) {
        console.error('Error deleting mascota:', error);
        alert('Error al eliminar la mascota');
    }
}

// Cerrar modal al hacer click fuera
document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') {
        closeModal();
    }
});
