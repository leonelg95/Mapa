const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: 'http://localhost:3001',
  methods: ['GET', 'POST', 'DELETE', 'PUT'], // Agrega PUT a los métodos permitidos
  allowedHeaders: ['Content-Type']
}));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Error connecting to MongoDB', err);
});

const markerSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  imageUrl: String,
  date: String,
  time: String,
  description: String,
});

const Marker = mongoose.model('Marker', markerSchema);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

// Obtener todos los marcadores
app.get('/api/markers', async (req, res) => {
  try {
    const markers = await Marker.find();
    res.json(markers);
  } catch (err) {
    console.error('Error fetching markers:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Crear un nuevo marcador
app.post('/api/markers', upload.single('image'), async (req, res) => {
  try {
    const { lat, lng, date, time, description } = req.body;
    if (!req.file) {
      throw new Error('File not uploaded');
    }
    const newMarker = new Marker({
      lat,
      lng,
      imageUrl: `/uploads/${req.file.filename}`,
      date,
      time,
      description,
    });
    await newMarker.save();
    res.json(newMarker);
  } catch (err) {
    console.error('Error uploading marker:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Actualizar un marcador existente por su ID
app.put('/api/markers/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { lat, lng, date, time, description } = req.body;
  
  try {
    let updatedMarker = await Marker.findById(id);
    if (!updatedMarker) {
      return res.status(404).json({ error: 'Marker not found' });
    }

    // Actualizar los campos del marcador
    updatedMarker.lat = lat;
    updatedMarker.lng = lng;
    updatedMarker.date = date;
    updatedMarker.time = time;
    updatedMarker.description = description;

    // Si se sube una nueva imagen, actualizar imageUrl
    if (req.file) {
      updatedMarker.imageUrl = `/uploads/${req.file.filename}`;
    }

    // Guardar los cambios en la base de datos
    await updatedMarker.save();
    res.json(updatedMarker);
  } catch (err) {
    console.error('Error updating marker:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Eliminar un marcador por su ID
app.delete('/api/markers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedMarker = await Marker.findByIdAndDelete(id);
    if (!deletedMarker) {
      return res.status(404).json({ error: 'Marker not found' });
    }
    res.json(deletedMarker);
  } catch (err) {
    console.error('Error deleting marker:', err);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
