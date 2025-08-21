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

  // Paso 1: Verificar si el alumno ya tiene alguna inscripción previa
  const sqlCheckMatricula = 'SELECT COUNT(*) as count FROM alumno_curso WHERE rut_alumno = ?';
  db.query(sqlCheckMatricula, [rut_alumno], (errCheck, resultsCheck) => {
    if (errCheck) {
      console.error('Error al verificar matrículas previas:', errCheck);
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

      // Paso 3: Obtener información del curso (costo + nombre)
      const sqlGetCurso = 'SELECT nombre_curso, costo_curso FROM curso WHERE id_curso = ?';
      db.query(sqlGetCurso, [id_curso], (errCurso, resultsCurso) => {
        if (errCurso) {
          console.error('Error al obtener info del curso:', errCurso);
          return res.status(500).json({ success: false, error: 'Error en la base de datos' });
        }

        if ((resultsCurso as any[]).length === 0) {
          return res.status(400).json({ success: false, error: 'Curso no encontrado' });
        }

        const cursoInfo = (resultsCurso as any[])[0];
        const costoCurso = Number(cursoInfo.costo_curso);
        const nombreCurso = cursoInfo.nombre_curso;

        // Paso 3.1: Obtener costo de matrícula
        const sqlGetMatricula = 'SELECT monto FROM matricula LIMIT 1';
        db.query(sqlGetMatricula, (errMat, resultsMat) => {
          if (errMat) {
            console.error('Error al obtener matrícula:', errMat);
            return res.status(500).json({ success: false, error: 'Error al obtener matrícula' });
          }

          const costoMatricula = Number((resultsMat as any[])[0].monto);

          // Paso 4: Calcular monto de deuda según si ya pagó matrícula
          const montoMatriculaAPagar = yaTieneMatricula ? 0 : costoMatricula;
          const montoCursos = costoCurso;
          const montoTotal = montoMatriculaAPagar + montoCursos;

          // Paso 4.1: Descripción usando el nombre del curso
          const descripcion = yaTieneMatricula
            ? `Pago pendiente por el curso: ${nombreCurso}`
            : `Pago pendiente de matrícula y curso: ${nombreCurso}`;

          const estado = 'pendiente';
          const fechaDeuda = new Date();

          // Paso 5: Insertar deuda
          const sqlInsertDeuda = `
            INSERT INTO deuda 
              (id_alumno_curso, monto, costo_matricula, costo_cursos, descripcion, fecha_deuda, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          db.query(
            sqlInsertDeuda,
            [id_alumno_curso, montoTotal, montoMatriculaAPagar, montoCursos, descripcion, fechaDeuda, estado],
            (errDeuda, resultDeuda) => {
              if (errDeuda) {
                console.error('Error al crear deuda:', errDeuda);
                return res.status(500).json({ success: false, error: 'Error al crear deuda' });
              }

              const id_deuda = (resultDeuda as any).insertId;
              res.json({
                success: true,
                message: 'Alumno matriculado y deuda creada exitosamente',
                id_deuda
              });
            }
          );
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

// GET /alumnoCurso/cursos/:rut_alumno (obtener cursos de un alumno)
router.get('/cursos/:rut_alumno', (req, res) => {
  const { rut_alumno } = req.params;
  const sql = `
    SELECT c.id_curso, c.nombre_curso, c.descripcion, c.costo_curso, c.codigo_curso, c.duracion_curso, c.url_aula, ac.fecha_inscripcion
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
