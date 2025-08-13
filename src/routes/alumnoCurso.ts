// src/routes/alumnoCurso.ts
import express from 'express';
import db from '../db';

const router = express.Router();

// POST /alumnoCurso/matricular
router.post('/matricular', (req, res) => {
  const { rut_alumno, id_curso } = req.body;

  if (!rut_alumno || !id_curso) {
    return res.status(400).json({ success: false, error: 'Faltan datos' });
  }

  const fecha = new Date();

  // Paso 1: Consultar si el alumno ya tiene alguna inscripción previa
  const sqlCheckMatricula = 'SELECT COUNT(*) as count FROM alumno_curso WHERE rut_alumno = ?';

  db.query(sqlCheckMatricula, [rut_alumno], (errCheck, resultsCheck) => {
    if (errCheck) {
      console.error('Error al verificar matriculas previas:', errCheck);
      return res.status(500).json({ success: false, error: 'Error en la base de datos' });
    }

    const yaTieneMatricula = (resultsCheck as any[])[0].count > 0;

    // Paso 2: Insertar inscripción
    const sqlInsertMatricula = 'INSERT INTO alumno_curso (rut_alumno, id_curso, fecha_inscripcion) VALUES (?, ?, ?)';

    db.query(sqlInsertMatricula, [rut_alumno, id_curso, fecha], (errInsert, resultInsert) => {
      if (errInsert) {
        console.error('Error al matricular alumno:', errInsert);
        return res.status(500).json({ success: false, error: 'Error en la base de datos' });
      }

      const id_alumno_curso = (resultInsert as any).insertId;

      // Paso 3: Obtener costo del curso
      const sqlGetCosto = 'SELECT costo_curso FROM curso WHERE id_curso = ?';

      db.query(sqlGetCosto, [id_curso], (errCosto, resultsCurso) => {
        if (errCosto) {
          console.error('Error al obtener costo del curso:', errCosto);
          return res.status(500).json({ success: false, error: 'Error en la base de datos' });
        }

        if ((resultsCurso as any[]).length === 0) {
          return res.status(400).json({ success: false, error: 'Curso no encontrado' });
        }

        const costoCurso = Number((resultsCurso as any[])[0].costo_curso);

        // Aquí defines el valor fijo de matrícula
        const costoMatricula = 20000; // por ejemplo, 20,000 CLP o la moneda que uses

        // Paso 4: Calcular monto total de la deuda según si ya pagó matrícula o no
        const montoTotal = yaTieneMatricula ? costoCurso : costoCurso + costoMatricula;

        const descripcion = yaTieneMatricula
          ? `Deuda por matrícula al curso ID ${id_curso}`
          : `Deuda por matrícula y curso ID ${id_curso}`;

        const estado = 'pendiente';
        const fechaDeuda = new Date();

        const sqlInsertDeuda = `
          INSERT INTO deuda (id_alumno_curso, monto, descripcion, fecha_deuda, estado)
          VALUES (?, ?, ?, ?, ?)
        `;

        db.query(sqlInsertDeuda, [id_alumno_curso, montoTotal, descripcion, fechaDeuda, estado], (errDeuda, resultDeuda) => {
          if (errDeuda) {
            console.error('Error al crear deuda:', errDeuda);
            return res.status(500).json({ success: false, error: 'Error al crear deuda' });
          }

          const id_deuda = (resultDeuda as any).insertId;

          res.json({
            success: true,
            message: 'Alumno matriculado y deuda creada exitosamente',
            id_deuda  // <--- aquí devuelves el id_deuda recién creado
          });
        });
      });
    });
  });
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

router.get('/cursos/:rut_alumno', (req, res) => {
  const { rut_alumno } = req.params;

  const sql = `
    SELECT c.id_curso, c.nombre_curso, c.descripcion, c.costo_curso, c.codigo_curso, c.duracion_curso, ac.fecha_inscripcion
    FROM curso c
    JOIN alumno_curso ac ON c.id_curso = ac.id_curso
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
