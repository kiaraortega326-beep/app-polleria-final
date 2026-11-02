const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Conexión directa a Supabase PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// API: Obtener productos y stock en tiempo real
app.get('/api/productos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Crear un pedido desde el celular del cliente
app.post('/api/pedidos', async (req, res) => {
  const { cliente_nombre, celular, tipo_atencion, medio_pago, total } = req.body;
  try {
    const query = `INSERT INTO pedidos (cliente_nombre, celular, tipo_atencion, medio_pago, total) 
                   VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const result = await pool.query(query, [cliente_nombre, celular, tipo_atencion, medio_pago, total]);
    
    const nuevoPedido = result.rows[0];
    
    // Alerta inmediata por Sockets a la cocina del personal
    io.emit('nuevo_pedido_cocina', nuevoPedido);
    
    res.status(201).json(nuevoPedido);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

io.on('connection', (socket) => {
  console.log('Dispositivo conectado:', socket.id);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
