const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const { Resend } = require('resend');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use(express.static('public'));

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTH ENDPOINTS ====================

// Login de administrador
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('usuarios_admin')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        nombre: user.nombre,
        rol: user.id_rol 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.id_rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ==================== QR ENDPOINTS ====================

// Generar nuevo QR (solo admin)
app.post('/api/qr/generate', authenticateToken, async (req, res) => {
  try {
    const codigoQr = uuidv4();
    
    const { data: qrData, error } = await supabase
      .from('qr_codes')
      .insert([
        {
          codigo_qr: codigoQr,
          id_admin_creador: req.user.userId,
          activo: true
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error al guardar QR:', error);
      return res.status(500).json({ error: 'Error al generar QR' });
    }

    // Generar URL para el QR
    const qrUrl = `${process.env.APP_URL || 'https://localhost:3000'}/qr/registro.html?codigo=${codigoQr}`;
    
    // Generar imagen QR
    const qrImage = await QRCode.toDataURL(qrUrl);

    res.json({
      qr: qrData,
      qrUrl,
      qrImage
    });
  } catch (error) {
    console.error('Error al generar QR:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener todos los QR del admin
app.get('/api/qr/list', authenticateToken, async (req, res) => {
  try {
    const { data: qrCodes, error } = await supabase
      .from('qr_codes')
      .select(`
        *,
        mascotas (*)
      `)
      .eq('id_admin_creador', req.user.userId)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error al obtener QR:', error);
      return res.status(500).json({ error: 'Error al obtener QR codes' });
    }

    res.json(qrCodes);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar estado de un QR
app.get('/api/qr/:codigo/status', async (req, res) => {
  try {
    const { codigo } = req.params;

    const { data: qrData, error } = await supabase
      .from('qr_codes')
      .select(`
        *,
        mascotas (*)
      `)
      .eq('codigo_qr', codigo)
      .single();

    if (error || !qrData) {
      return res.status(404).json({ error: 'QR no encontrado' });
    }

    res.json({
      registrado: qrData.mascotas && qrData.mascotas.length > 0,
      mascota: qrData.mascotas && qrData.mascotas.length > 0 ? qrData.mascotas[0] : null,
      qr: qrData
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==================== MASCOTA ENDPOINTS ====================

// Registrar mascota (desde QR no registrado)
app.post('/api/mascotas/registrar', async (req, res) => {
  try {
    const { 
      codigo_qr, 
      nombre_mascota, 
      nombre_dueno, 
      direccion_dueno, 
      email_dueno,
      telefono_dueno 
    } = req.body;

    // Verificar que el QR existe
    const { data: qrData, error: qrError } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('codigo_qr', codigo_qr)
      .single();

    if (qrError || !qrData) {
      return res.status(404).json({ error: 'QR no válido' });
    }

    // Verificar que no esté ya registrado
    const { data: existingMascota } = await supabase
      .from('mascotas')
      .select('*')
      .eq('id_qr', qrData.id)
      .single();

    if (existingMascota) {
      return res.status(400).json({ error: 'Este QR ya está registrado' });
    }

    // Crear mascota
    const { data: mascota, error } = await supabase
      .from('mascotas')
      .insert([
        {
          id_qr: qrData.id,
          nombre_mascota,
          nombre_dueno,
          direccion_dueno,
          email_dueno,
          telefono_dueno
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error al registrar mascota:', error);
      return res.status(500).json({ error: 'Error al registrar mascota' });
    }

    // Enviar emails de confirmación
    await enviarEmailRegistro(mascota, qrData);

    res.json({ 
      success: true, 
      mascota,
      message: 'Mascota registrada exitosamente'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener información de mascota por QR
app.get('/api/mascotas/qr/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { lat, lng } = req.query;

    // Obtener QR y mascota
    const { data: qrData, error: qrError } = await supabase
      .from('qr_codes')
      .select(`
        *,
        mascotas (*)
      `)
      .eq('codigo_qr', codigo)
      .single();

    if (qrError || !qrData) {
      return res.status(404).json({ error: 'QR no encontrado' });
    }

    if (!qrData.mascotas || qrData.mascotas.length === 0) {
      return res.status(404).json({ error: 'Mascota no registrada' });
    }

    const mascota = qrData.mascotas[0];

    // Guardar escaneo con ubicación
    const { data: escaneo } = await supabase
      .from('escaneos')
      .insert([
        {
          id_qr: qrData.id,
          latitud: lat || null,
          longitud: lng || null,
          direccion_ip: req.ip
        }
      ])
      .select()
      .single();

    // Enviar email de alerta con ubicación
    await enviarEmailEscaneo(mascota, qrData, { lat, lng });

    res.json({
      mascota,
      qr: qrData,
      escaneo
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar mascota (admin)
app.put('/api/mascotas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: mascota, error } = await supabase
      .from('mascotas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Error al actualizar mascota' });
    }

    res.json({ success: true, mascota });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Buscar mascotas/por dueño
app.get('/api/mascotas/buscar', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;

    const { data: mascotas, error } = await supabase
      .from('mascotas')
      .select(`
        *,
        qr_codes (*)
      `)
      .or(`nombre_dueno.ilike.%${q}%,email_dueno.ilike.%${q}%,nombre_mascota.ilike.%${q}%`);

    if (error) {
      return res.status(500).json({ error: 'Error al buscar' });
    }

    res.json(mascotas);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==================== EMAIL FUNCTIONS ====================

async function enviarEmailRegistro(mascota, qr) {
  try {
    // Email al dueño
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: mascota.email_dueno,
      subject: '¡Registro Exitoso - Chapita QR para ' + mascota.nombre_mascota + '!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">¡Registro Exitoso!</h2>
          <p>Hola <strong>${mascota.nombre_dueno}</strong>,</p>
          <p>Tu mascota <strong>${mascota.nombre_mascota}</strong> ha sido registrada exitosamente en nuestro sistema de chapitas QR.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Información Registrada:</h3>
            <p><strong>Mascota:</strong> ${mascota.nombre_mascota}</p>
            <p><strong>Dueño:</strong> ${mascota.nombre_dueno}</p>
            <p><strong>Dirección:</strong> ${mascota.direccion_dueno}</p>
            <p><strong>Email:</strong> ${mascota.email_dueno}</p>
          </div>
          <p>Si tu mascota se pierde y alguien escanea su chapita QR, recibirás un email con la ubicación exacta donde fue encontrada.</p>
          <p style="color: #666;">Gracias por confiar en nosotros.</p>
        </div>
      `
    });

    // Email al admin
    const { data: admin } = await supabase
      .from('usuarios_admin')
      .select('*')
      .eq('id', qr.id_admin_creador)
      .single();

    if (admin) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: admin.email,
        subject: 'Nueva Mascota Registrada - ' + mascota.nombre_mascota,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Nueva Mascota Registrada</h2>
            <p>Una nueva mascota ha sido registrada en el sistema:</p>
            <ul>
              <li><strong>Mascota:</strong> ${mascota.nombre_mascota}</li>
              <li><strong>Dueño:</strong> ${mascota.nombre_dueno}</li>
              <li><strong>Email:</strong> ${mascota.email_dueno}</li>
              <li><strong>Dirección:</strong> ${mascota.direccion_dueno}</li>
            </ul>
          </div>
        `
      });
    }
  } catch (error) {
    console.error('Error enviando emails:', error);
  }
}

async function enviarEmailEscaneo(mascota, qr, ubicacion) {
  try {
    const mapsUrl = ubicacion.lat && ubicacion.lng 
      ? `https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lng}`
      : null;

    const ubicacionText = ubicacion.lat && ubicacion.lng
      ? `Latitud: ${ubicacion.lat}, Longitud: ${ubicacion.lng}`
      : 'Ubicación no disponible';

    // Email al dueño
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: mascota.email_dueno,
      subject: '¡Tu mascota ' + mascota.nombre_mascota + ' fue escaneada!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF9800;">¡Alerta de Escaneo!</h2>
          <p>Hola <strong>${mascota.nombre_dueno}</strong>,</p>
          <p>La chapita QR de <strong>${mascota.nombre_mascota}</strong> acaba de ser escaneada.</p>
          <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF9800;">
            <h3>📍 Ubicación del Escaneo:</h3>
            <p>${ubicacionText}</p>
            ${mapsUrl ? `<a href="${mapsUrl}" style="display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 10px;">Ver en Google Maps</a>` : ''}
          </div>
          <p>Fecha y hora: ${new Date().toLocaleString()}</p>
          <p style="color: #666;">Si tu mascota está perdida, esta información puede ayudarte a encontrarla.</p>
        </div>
      `
    });

    // Email al admin
    const { data: admin } = await supabase
      .from('usuarios_admin')
      .select('*')
      .eq('id', qr.id_admin_creador)
      .single();

    if (admin) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: admin.email,
        subject: 'QR Escaneado - ' + mascota.nombre_mascota,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>QR Escaneado</h2>
            <p>La chapita de <strong>${mascota.nombre_mascota}</strong> fue escaneada.</p>
            <p><strong>Dueño:</strong> ${mascota.nombre_dueno} (${mascota.email_dueno})</p>
            <p><strong>Ubicación:</strong> ${ubicacionText}</p>
            ${mapsUrl ? `<a href="${mapsUrl}">Ver en Maps</a>` : ''}
            <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
          </div>
        `
      });
    }
  } catch (error) {
    console.error('Error enviando emails de escaneo:', error);
  }
}

// ==================== STATS ENDPOINTS ====================

app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const { data: totalQr } = await supabase
      .from('qr_codes')
      .select('*', { count: 'exact', head: true })
      .eq('id_admin_creador', req.user.userId);

    const { data: totalMascotas } = await supabase
      .from('qr_codes')
      .select('*, mascotas(*)')
      .eq('id_admin_creador', req.user.userId);

    const mascotasRegistradas = totalMascotas.filter(qr => qr.mascotas && qr.mascotas.length > 0).length;

    const { data: escaneos } = await supabase
      .from('escaneos')
      .select('*')
      .in('id_qr', totalMascotas.map(qr => qr.id));

    res.json({
      totalQr: totalMascotas.length,
      mascotasRegistradas,
      qrPendientes: totalMascotas.length - mascotasRegistradas,
      totalEscaneos: escaneos ? escaneos.length : 0
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Export for Vercel
module.exports = app;

// Start server for local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
