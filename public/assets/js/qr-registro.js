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
    
    document.getElementById('codigo-qr').value = codigoQR;
    
    // Verificar estado del QR
    verifyQR(codigoQR);
});

// ==================== VERIFICAR QR ====================
async function verifyQR(codigo) {
    try {
        const response = await fetch(`${API_URL}/qr/${codigo}/status`);
        const data = await response.json();
        
        if (!response.ok) {
            showState('invalid-state');
            return;
        }
        
        if (data.registrado) {
            // QR ya registrado, redirigir a info
            showState('registered-state');
            setTimeout(() => {
                window.location.href = `/qr/info.html?codigo=${codigo}`;
            }, 2000);
        } else {
            // QR disponible para registro
            showState('form-state');
        }
    } catch (error) {
        console.error('Error verifying QR:', error);
        showState('invalid-state');
    }
}

// ==================== MOSTRAR ESTADO ====================
function showState(stateId) {
    // Ocultar todos los estados
    document.querySelectorAll('.state-container').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Mostrar el estado solicitado
    document.getElementById(stateId).classList.remove('hidden');
}

// ==================== FORMULARIO ====================
document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = e.target.querySelector('.btn-submit');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    
    btn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    
    const formData = {
        codigo_qr: document.getElementById('codigo-qr').value,
        nombre_mascota: document.getElementById('nombre-mascota').value,
        nombre_dueno: document.getElementById('nombre-dueno').value,
        email_dueno: document.getElementById('email-dueno').value,
        telefono_dueno: document.getElementById('telefono-dueno').value,
        direccion_dueno: document.getElementById('direccion-dueno').value
    };
    
    try {
        const response = await fetch(`${API_URL}/mascotas/registrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showState('success-state');
        } else {
            document.getElementById('error-message').textContent = data.error || 'Error al registrar. Intenta nuevamente.';
            showState('error-state');
        }
    } catch (error) {
        console.error('Error registering:', error);
        document.getElementById('error-message').textContent = 'Error de conexión. Intenta nuevamente.';
        showState('error-state');
    } finally {
        btn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
});

function retryForm() {
    showState('form-state');
}
