import mysql from 'mysql2';

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'software_administrativo2',
    decimalNumbers: true,
});

// Probar conexión apenas se cree el pool
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error al conectar a la base de datos:', err.message);
    } else {
        console.log('✅ Conexión a la base de datos establecida correctamente');
        connection.release(); // liberar conexión del pool
    }
});

export default db;
