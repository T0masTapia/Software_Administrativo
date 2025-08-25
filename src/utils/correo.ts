import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // o tu servidor SMTP
  port: 465,
  secure: true, // true para 465, false para 587
  auth: {
    user: 'herrerafelipe940@gmail.com', // tu correo
    pass: 'gfnl qbyp jilc gzwq' // contraseña de app si usas 2FA
  }
});

export const enviarCorreo = async (
  para: string,
  asunto: string,
  mensaje: string,
  attachments?: { filename: string; content: Buffer; contentType?: string }[]
) => {
  try {
    const info = await transporter.sendMail({
      from: '"AulaConnect" <herrerafelipe940@gmail.com>',
      to: para,
      subject: asunto,
      html: mensaje,
      attachments 
    });
    console.log('Correo enviado:', info.messageId);
  } catch (error) {
    console.error('Error enviando correo:', error);
  }
};

