// ==================== CONFIGURACIÓN ====================
const API_URL = window.location.origin + '/api';

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    // Obtener código QR de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const codigoQR = urlParams.get('codigo');
    
    if (!codigoQR) {
        showState('invalid-state');
        return;
    }
    
    // Cargar información de la mascota
    loadMascotaInfo(codigoQR);
});

// ==================== MOSTRAR ESTADO ====================
function showState(stateId) {
    document.querySelectorAll('.state-container').forEach(el => {
        el.classList.add('hidden');
    });
    document.getElementById(stateId).classList.remove('hidden');
}

// ==================== CARGAR INFO ====================
async function loadMascotaInfo(codigo) {
    try {
        // Obtener ubicación del usuario
        let lat = null;
        let lng = null;
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    lat = position.coords.latitude;
                    lng = position.coords.longitude;
                    fetchMascotaData(codigo, lat, lng);
                },
                (error) => {
                    console.log('Geolocation error:', error);
                    fetchMascotaData(codigo, null, null);
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        } else {
            fetchMascotaData(codigo, null, null);
        }
    } catch (error) {
        console.error('Error:', error);
        showState('error-state');
    }
}

async function fetchMascotaData(codigo, lat, lng) {
    try {
        let url = `${API_URL}/mascotas/qr/${codigo}`;
        if (lat && lng) {
            url += `?lat=${lat}&lng=${lng}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 404) {
                // Verificar si el QR existe pero no está registrado
                const statusResponse = await fetch(`${API_URL}/qr/${codigo}/status`);
                const statusData = await statusResponse.json();
                
                if (statusResponse.ok && !statusData.registrado) {
                    document.getElementById('register-link').href = `/qr/registro.html?codigo=${codigo}`;
                    showState('not-registered-state');
                } else {
                    showState('invalid-state');
                }
            } else {
                showState('error-state');
            }
            return;
        }
        
        // Mostrar información de la mascota
        displayMascotaInfo(data, lat, lng);
        showState('info-state');
        
    } catch (error) {
        console.error('Error fetching mascota:', error);
        showState('error-state');
    }
}

// ==================== MOSTRAR INFO ====================
function displayMascotaInfo(data, lat, lng) {
    const mascota = data.mascota;
    
    // Datos de la mascota
    document.getElementById('pet-name').textContent = mascota.nombre_mascota;
    document.getElementById('owner-name').textContent = mascota.nombre_dueno;
    document.getElementById('owner-email').textContent = mascota.email_dueno;
    document.getElementById('owner-phone').textContent = mascota.telefono_dueno || 'No especificado';
    document.getElementById('owner-address').textContent = mascota.direccion_dueno;
    
    // Ubicación
    const locationInfo = document.getElementById('location-info');
    const locationMap = document.getElementById('location-map');
    
    if (lat && lng) {
        locationInfo.innerHTML = `
            <div class="location-details">
                <p><i class="fas fa-map-marker-alt"></i> Ubicación detectada</p>
                <p style="margin-top: 10px; font-size: 0.9rem; color: var(--text-light);">
                    Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}
                </p>
            </div>
        `;
        
        // Mostrar mapa
        const mapFrame = document.getElementById('map-frame');
        mapFrame.src = `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1ses!2sar!4v1`;
        locationMap.classList.remove('hidden');
    } else {
        locationInfo.innerHTML = `
            <div class="location-details">
                <p><i class="fas fa-info-circle"></i> Ubicación no disponible</p>
                <p style="margin-top: 10px; font-size: 0.9rem; color: var(--text-light);">
                    El escaneo no pudo obtener la ubicación exacta.
                </p>
            </div>
        `;
    }
}
