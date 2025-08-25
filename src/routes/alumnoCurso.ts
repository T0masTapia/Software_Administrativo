// src/routes/alumnoCurso.ts
import express from 'express';
import db from '../db';
import { enviarCorreo } from '../utils/correo';

const router = express.Router();

// POST /alumnoCurso/matricular
router.post('/matricular', async (req, res) => {
  try {
    const { rut_alumno, id_curso } = req.body;
    if (!rut_alumno || !id_curso) {
      return res.status(400).json({ success: false, error: 'Faltan datos' });
    }

    const fecha = new Date();

    // 1️⃣ Verificar si el alumno ya tiene alguna inscripción previa
    const [resultsCheck] = await db.promise().query(
      'SELECT COUNT(*) as count FROM alumno_curso WHERE rut_alumno = ?',
      [rut_alumno]
    );
    const yaTieneMatricula = (resultsCheck as any)[0].count > 0;

    // 2️⃣ Insertar inscripción
    const [resultInsert] = await db.promise().query(
      'INSERT INTO alumno_curso (rut_alumno, id_curso, fecha_inscripcion) VALUES (?, ?, ?)',
      [rut_alumno, id_curso, fecha]
    );
    const id_alumno_curso = (resultInsert as any).insertId;

    // 3️⃣ Obtener información del curso (nombre + costo)
    const [resultsCurso] = await db.promise().query(
      'SELECT nombre_curso, costo_curso FROM curso WHERE id_curso = ?',
      [id_curso]
    );
    if ((resultsCurso as any[]).length === 0) {
      return res.status(400).json({ success: false, error: 'Curso no encontrado' });
    }
    const cursoInfo = (resultsCurso as any[])[0];
    const costoCurso = Number(cursoInfo.costo_curso);
    const nombreCurso = cursoInfo.nombre_curso;

    // 3.1️⃣ Obtener costo de matrícula
    const [resultsMat] = await db.promise().query('SELECT monto FROM matricula LIMIT 1');
    const costoMatricula = Number((resultsMat as any[])[0].monto);

    // 4️⃣ Calcular monto de deuda según si ya pagó matrícula
    const montoMatriculaAPagar = yaTieneMatricula ? 0 : costoMatricula;
    const montoCursos = costoCurso;
    const montoTotal = montoMatriculaAPagar + montoCursos;

    const descripcion = yaTieneMatricula
      ? `Pago pendiente por el curso: ${nombreCurso}`
      : `Pago pendiente de matrícula y curso: ${nombreCurso}`;
    const estado = 'pendiente';
    const fechaDeuda = new Date();

    // 5️⃣ Insertar deuda
    const [resultDeuda] = await db.promise().query(
      `INSERT INTO deuda 
        (id_alumno_curso, monto, costo_matricula, costo_cursos, descripcion, fecha_deuda, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_alumno_curso, montoTotal, montoMatriculaAPagar, montoCursos, descripcion, fechaDeuda, estado]
    );
    const id_deuda = (resultDeuda as any).insertId;

    // 6️⃣ Enviar correo al alumno
    const [resultsEmail] = await db.promise().query(
      `SELECT u.correo, a.nombre_completo
       FROM alumno a
        JOIN usuario u ON a.id_usuario = u.id_usuario
        WHERE a.rut = ?`,
      [rut_alumno]
    );
    if ((resultsEmail as any[]).length > 0) {
      const alumnoCorreo = (resultsEmail as any[])[0].correo;
      const alumnoNombre = (resultsEmail as any[])[0].nombre_completo;

      await enviarCorreo(
        alumnoCorreo,
        'Confirmación de matrícula',
        `<p>Hola ${alumnoNombre},</p>
         <p>Te has matriculado en el curso <strong>${nombreCurso}</strong>.</p>
         <p>Tu deuda pendiente es <strong>$${montoTotal}</strong>.</p>
         <p>Gracias por confiar en CFA Educa.</p>`
      );
    }

    // 7️⃣ Responder al cliente
    res.json({
      success: true,
      message: 'Alumno matriculado, deuda creada y correo enviado exitosamente',
      id_deuda
    });

  } catch (error) {
    console.error('Error en /matricular:', error);
    res.status(500).json({ success: false, error: 'Error en la base de datos o servidor' });
  }
});


// GET /alumnoCurso/ (obtener matrículas)
router.get('/', (req, res) => {
  const sql = `
    SELECT ac.rut_alumno as rut, a.nombre_completo, c.nombre_curso as curso
    FROM alumno_curso ac
    JOIN alumno a ON ac.rut_alumno = a.rut
    JOIN curso c ON ac.id_curso = c.id_curso
    ORDER BY ac.fecha_inscripcion DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener matrículas:', err);
      return res.status(500).json({ success: false, error: 'Error en la base de datos' });
    }
    res.json({ success: true, matriculas: results });
  });
});

// GET /alumnoCurso/cursos/:rut_alumno (obtener cursos de un alumno)
router.get('/cursos/:rut_alumno', (req, res) => {
  const { rut_alumno } = req.params;

  const sql = `
    SELECT 
      c.id_curso, 
      c.nombre_curso, 
      c.descripcion, 
      c.costo_curso, 
      c.codigo_curso, 
      c.duracion_curso, 
      c.url_aula, 
      ac.fecha_inscripcion,
      CASE 
        WHEN d.estado = 'pendiente' THEN true
        ELSE false
      END AS deuda_pendiente
    FROM curso c
    JOIN alumno_curso ac ON c.id_curso = ac.id_curso
    LEFT JOIN deuda d ON d.id_alumno_curso = ac.id
    WHERE ac.rut_alumno = ?
    ORDER BY ac.fecha_inscripcion DESC
  `;

  db.query(sql, [rut_alumno], (err, results) => {
    if (err) {
      console.error('Error al obtener cursos del alumno:', err);
      return res.status(500).json({ success: false, error: 'Error en la base de datos' });
    }
    res.json({ success: true, cursos: results });
  });
});


export default router;
