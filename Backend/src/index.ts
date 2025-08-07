import express from 'express';
import cors from 'cors';
import usuariosRoutes from './routes/usuarios';
import alumnosRoutes from './routes/alumnos';
import cursosRoutes from './routes/cursos';
import alumnoCursos from './routes/alumnoCurso';


const app = express();
app.use(cors());
app.use(express.json());

// Usar rutas
app.use('/usuarios', usuariosRoutes);
app.use('/alumnos', alumnosRoutes);
app.use('/cursos', cursosRoutes);
app.use('/alumnoCurso', alumnoCursos);



const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
