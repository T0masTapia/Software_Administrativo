import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

export const generarBoletaPDF = (alumno: {rut: string, nombre: string}, pago: {descripcion: string, monto: number, fecha: Date}) => {
    const doc = new PDFDocument();
    const buffers: Uint8Array[] = [];

    doc.on('data', buffers.push.bind(buffers));
    
    doc.fontSize(16).text("Boleta de Pago", { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Alumno: ${alumno.nombre} (${alumno.rut})`);
    doc.text(`Fecha: ${pago.fecha.toLocaleDateString()}`);
    doc.text(`Concepto: ${pago.descripcion}`);
    doc.text(`Monto: $${pago.monto.toLocaleString()}`);

    doc.end();

    return new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => {
            resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);
    });
};
