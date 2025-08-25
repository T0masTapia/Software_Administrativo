// routes/pago.ts
import express from 'express';
import db from '../db';
import { enviarCorreo } from '../utils/correo';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { id_deuda, monto, tipoPago, conceptoPago } = req.body;

        if (!id_deuda || !monto || !tipoPago || !conceptoPago) {
            return res.status(400).json({ success: false, error: 'Faltan datos' });
        }

        if (!['abono', 'total'].includes(tipoPago)) {
            return res.status(400).json({ success: false, error: 'Tipo de pago inválido' });
        }

        const fecha_pago = new Date();

        // 1️⃣ Insertar pago
        await db.promise().query(
            `INSERT INTO pago (id_deuda, monto, fecha_pago, tipo_pago, concepto_pago)
             VALUES (?, ?, ?, ?, ?)`,
            [id_deuda, monto, fecha_pago, tipoPago, conceptoPago]
        );

        // 2️⃣ Actualizar deuda
        await db.promise().query(
            `UPDATE deuda SET monto = monto - ? WHERE id_deuda = ?`,
            [monto, id_deuda]
        );

        // 3️⃣ Obtener monto actual de la deuda
        const [rowsDeuda] = await db.promise().query(
            `SELECT monto, id_alumno_curso FROM deuda WHERE id_deuda = ?`,
            [id_deuda]
        );
        const deuda = (rowsDeuda as any[])[0];
        const montoActual = deuda.monto;
        const idAlumnoCurso = deuda.id_alumno_curso;

        // 4️⃣ Si monto <= 0, marcar deuda como pagada
        if (montoActual <= 0) {
            await db.promise().query(
                `UPDATE deuda SET estado = 'pagado', monto = 0 WHERE id_deuda = ?`,
                [id_deuda]
            );
        }

        // 5️⃣ Obtener información del alumno y correo
        const [rowsAlumno] = await db.promise().query(
            `SELECT u.correo, a.nombre_completo
             FROM alumno_curso ac
             JOIN alumno a ON ac.rut_alumno = a.rut
             JOIN usuario u ON a.id_usuario = u.id
             WHERE ac.id = ?`,
            [idAlumnoCurso]
        );

        if ((rowsAlumno as any[]).length > 0) {
            const alumno = (rowsAlumno as any[])[0];
            const correoAlumno = alumno.correo;
            const nombreAlumno = alumno.nombre_completo;

            // 6️⃣ Generar mensaje de boleta
            const mensaje = `
                <h3>Comprobante de pago</h3>
                <p>Hola ${nombreAlumno},</p>
                <p>Se ha registrado un pago de <strong>$${monto}</strong> (${tipoPago} - ${conceptoPago}).</p>
                <p>Deuda restante: <strong>$${montoActual <= 0 ? 0 : montoActual}</strong></p>
                <p>Gracias por tu pago.</p>
            `;

            // 7️⃣ Enviar correo
            try {
                await enviarCorreo(correoAlumno, 'Comprobante de pago CFA Educa', mensaje);
                console.log('Correo de boleta enviado a', correoAlumno);
            } catch (e) {
                console.error('Error enviando correo de boleta:', e);
            }
        }

        return res.json({
            success: true,
            message: montoActual <= 0
                ? 'Pago registrado y deuda pagada correctamente'
                : 'Pago registrado y deuda actualizada correctamente'
        });

    } catch (err: any) {
        console.error('Error en /pago:', err);
        res.status(500).json({ success: false, error: 'Error en la base de datos o servidor' });
    }
});

/**
 * Obtener pagos por deuda específica
 * GET /pago/deuda/:id
 */
router.get('/deuda/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [results] = await db.promise().query(
            `SELECT id_pago, monto, fecha_pago, tipo_pago, concepto_pago
             FROM pago
             WHERE id_deuda = ?
             ORDER BY fecha_pago DESC`,
            [id]
        );
        res.json({ success: true, pagos: results });
    } catch (err) {
        console.error('Error al obtener pagos por deuda:', err);
        res.status(500).json({ success: false, error: 'Error en la base de datos' });
    }
});

export default router;
