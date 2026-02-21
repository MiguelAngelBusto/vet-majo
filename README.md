# VetQR - Sistema de Chapitas QR para Mascotas

Sistema completo para veterinarias que permite crear chapitas QR para mascotas. Cuando alguien escanea el QR de una mascota perdida, el dueño recibe un email con la ubicación exacta.

## 🚀 Características

- ✅ Generación de códigos QR únicos
- ✅ Registro de mascotas con datos del dueño
- ✅ Geolocalización al escanear QR
- ✅ Envío de emails automáticos (confirmación y alertas)
- ✅ Panel de administración completo
- ✅ Diseño responsive y moderno

## 📋 Requisitos

- Node.js 18+
- Cuenta en Supabase
- Cuenta en Resend (para emails)
- Cuenta en Vercel (para deploy)

## 🛠️ Instalación Local

1. **Clonar el repositorio**
```bash
git clone <tu-repo>
cd vet-qr-project
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

4. **Configurar Supabase**
- Crear un nuevo proyecto en Supabase
- Ejecutar el script `supabase-schema.sql` en el SQL Editor
- Copiar URL y API Key al archivo `.env`

5. **Configurar Resend**
- Crear cuenta en Resend
- Obtener API Key
- Configurar dominio de envío
- Agregar API Key al `.env`

6. **Crear usuario admin**
```bash
node scripts/create-admin.js
```

7. **Iniciar servidor**
```bash
npm run dev
```

## 🚀 Deploy en Vercel

1. **Subir a GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <tu-repo-github>
git push -u origin main
```

2. **Configurar en Vercel**
- Importar proyecto desde GitHub
- Framework Preset: Other
- Build Command: `npm run build`
- Output Directory: `public`
- Agregar variables de entorno en Settings > Environment Variables

3. **Variables de entorno en Vercel**
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key
RESEND_API_KEY=re_tu_api_key
JWT_SECRET=tu-secreto-jwt
EMAIL_FROM=onboarding@resend.dev
```

## 📁 Estructura del Proyecto

```
vet-qr-project/
├── api/
│   └── index.js          # Backend Express
├── public/
│   ├── index.html        # Home
│   ├── assets/
│   │   ├── css/
│   │   │   ├── styles.css    # Estilos home
│   │   │   ├── admin.css     # Estilos admin
│   │   │   └── qr.css        # Estilos QR
│   │   ├── js/
│   │   │   ├── main.js       # JS home
│   │   │   ├── admin.js      # JS admin
│   │   │   ├── qr-registro.js
│   │   │   └── qr-info.js
│   │   └── images/
│   ├── admin/
│   │   └── index.html    # Panel admin
│   └── qr/
│       ├── registro.html # Formulario registro
│       └── info.html     # Info mascota
├── package.json
├── vercel.json
├── .env.example
└── supabase-schema.sql
```

## 🔑 Flujo de Uso

### Administrador
1. Acceder a `/admin` e iniciar sesión
2. Generar nuevos códigos QR
3. Imprimir/descargar los QR para las chapitas
4. Gestionar mascotas registradas

### Usuario (Dueño de mascota)
1. Recibe una chapita con QR
2. Escanea el QR con su celular
3. Completa el formulario de registro
4. Recibe email de confirmación

### Si la mascota se pierde
1. Alguien encuentra la mascota y escanea el QR
2. El sistema detecta la ubicación
3. Se envía email al dueño con la ubicación
4. El dueño puede recuperar a su mascota

## 📧 Configuración de Emails

El sistema usa Resend para enviar emails. Asegúrate de:

1. Verificar tu dominio en Resend
2. Configurar el remitente en las variables de entorno
3. Para pruebas, puedes usar `onboarding@resend.dev`

## 🔒 Seguridad

- Autenticación JWT para el panel admin
- Contraseñas hasheadas con bcrypt
- Políticas RLS en Supabase
- Validación de datos en el backend

## 📝 API Endpoints

### Auth
- `POST /api/auth/login` - Login de admin
- `GET /api/auth/verify` - Verificar token

### QR
- `POST /api/qr/generate` - Generar nuevo QR
- `GET /api/qr/list` - Listar QR del admin
- `GET /api/qr/:codigo/status` - Verificar estado de QR

### Mascotas
- `POST /api/mascotas/registrar` - Registrar mascota
- `GET /api/mascotas/qr/:codigo` - Obtener info de mascota
- `PUT /api/mascotas/:id` - Actualizar mascota
- `GET /api/mascotas/buscar?q=` - Buscar mascotas

### Stats
- `GET /api/stats` - Estadísticas del admin

## 🎨 Personalización

### Colores
Editar las variables CSS en los archivos de estilos:
```css
:root {
    --primary: #4CAF50;
    --secondary: #FF9800;
    --accent: #2196F3;
    ...
}
```

### Imágenes
Reemplazar las imágenes en `/public/assets/images/`:
- `carrusel-1.jpg` - Imagen principal veterinaria
- `carrusel-2.jpg` - Perro con QR
- `carrusel-3.jpg` - Gato con QR

### Textos
Editar directamente los archivos HTML según tus necesidades.

## 🐛 Troubleshooting

### Error de conexión a Supabase
- Verificar URL y API Key
- Verificar que las tablas estén creadas
- Revisar políticas RLS

### Emails no llegan
- Verificar API Key de Resend
- Verificar dominio de envío
- Revisar spam

### QR no funciona
- Verificar que el código QR exista en la base de datos
- Revisar que la URL del QR sea correcta
- Verificar que no esté registrado ya

## 📄 Licencia

MIT License - Libre para uso personal y comercial.

## 👨‍💻 Desarrollado por

Tu nombre / Veterinaria X
# vetqr.
