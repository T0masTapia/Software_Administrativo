// routes/pago.ts
import express from 'express';
import db from '../db';

const router = express.Router();

router.post('/', (req, res) => {
    const { id_deuda, monto, tipoPago, conceptoPago } = req.body;

    if (!id_deuda || !monto || !tipoPago || !conceptoPago) {
        return res.status(400).json({ success: false, error: 'Faltan datos' });
    }

    if (!['abono', 'total'].includes(tipoPago)) {
        return res.status(400).json({ success: false, error: 'Tipo de pago inválido' });
    }

    const fecha_pago = new Date();

    const sql = `
        INSERT INTO pago (id_deuda, monto, fecha_pago, tipo_pago, concepto_pago)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [id_deuda, monto, fecha_pago, tipoPago, conceptoPago], (err, result) => {
        if (err) {
            console.error('Error al registrar el pago:', err);
            return res.status(500).json({ success: false, error: 'Error en la base de datos' });
        }

        // Actualizar deuda restando el monto pagado
        const updateSql = `
            UPDATE deuda
            SET monto = monto - ?
            WHERE id_deuda = ?
        `;

        db.query(updateSql, [monto, id_deuda], (updateErr) => {
            if (updateErr) {
                console.error('Error al actualizar deuda:', updateErr);
                return res.status(500).json({ success: false, error: 'Error al actualizar deuda' });
            }

            // Verificar el monto actualizado para cambiar estado a "pagado" si corresponde
            const checkMontoSql = `
                SELECT monto FROM deuda WHERE id_deuda = ?
            `;

            db.query(checkMontoSql, [id_deuda], (checkErr, results) => {
                if (checkErr) {
                    console.error('Error al consultar monto deuda:', checkErr);
                    return res.status(500).json({ success: false, error: 'Error en la base de datos' });
                }

                const rows = results as any[];
                const montoActual = rows[0].monto;

                if (montoActual <= 0) {
                    const updateEstadoSql = `
                        UPDATE deuda
                        SET estado = 'pagado', monto = 0
                        WHERE id_deuda = ?
                    `;

                    db.query(updateEstadoSql, [id_deuda], (estadoErr) => {
                        if (estadoErr) {
                            console.error('Error al actualizar estado de deuda:', estadoErr);
                            return res.status(500).json({ success: false, error: 'Error al actualizar estado de deuda' });
                        }
                        return res.json({ success: true, message: 'Pago registrado y deuda pagada correctamente' });
                    });
                } else {
                    return res.json({ success: true, message: 'Pago registrado y deuda actualizada correctamente' });
                }
            });
        });
    });
});

/**
 * Obtener pagos por deuda específica
 * GET /pago/deuda/:id
 */
router.get('/deuda/:id', (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT id_pago, monto, fecha_pago, tipo_pago
        FROM pago
        WHERE id_deuda = ?
        ORDER BY fecha_pago DESC
    `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error al obtener pagos por deuda:', err);
            return res.status(500).json({ success: false, error: 'Error en la base de datos' });
        }
        res.json({ success: true, pagos: results });
    });
});

export default router;
