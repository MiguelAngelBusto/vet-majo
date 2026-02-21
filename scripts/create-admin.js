const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

async function createAdmin() {
    console.log('=== Crear Usuario Administrador ===\n');
    
    rl.question('Email: ', async (email) => {
        rl.question('Nombre: ', async (nombre) => {
            rl.question('Contraseña: ', async (password) => {
                try {
                    // Hashear contraseña
                    const saltRounds = 10;
                    const passwordHash = await bcrypt.hash(password, saltRounds);
                    
                    // Obtener rol admin
                    const { data: rol } = await supabase
                        .from('roles')
                        .select('id_rol')
                        .eq('nombre_rol', 'admin')
                        .single();
                    
                    if (!rol) {
                        console.error('Error: No se encontró el rol admin');
                        console.log('Asegúrate de ejecutar el schema SQL primero');
                        rl.close();
                        return;
                    }
                    
                    // Crear usuario
                    const { data, error } = await supabase
                        .from('usuarios_admin')
                        .insert([
                            {
                                email: email,
                                password_hash: passwordHash,
                                nombre: nombre,
                                id_rol: rol.id_rol
                            }
                        ])
                        .select();
                    
                    if (error) {
                        console.error('Error al crear usuario:', error.message);
                    } else {
                        console.log('\n✅ Usuario administrador creado exitosamente!');
                        console.log(`Email: ${email}`);
                        console.log(`Nombre: ${nombre}`);
                    }
                    
                    rl.close();
                } catch (error) {
                    console.error('Error:', error);
                    rl.close();
                }
            });
        });
    });
}

// Verificar variables de entorno
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error('Error: SUPABASE_URL y SUPABASE_KEY deben estar configurados en .env');
    process.exit(1);
}

createAdmin();
