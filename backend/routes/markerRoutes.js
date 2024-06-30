// backend/routes/markerRoutes.js
const express = require('express');
const multer = require('multer');
const Marker = require('../models/marker');
const router = express.Router();

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Ruta para obtener todos los marcadores
router.get('/', async (req, res) => {
  try {
    const markers = await Marker.find();
    res.json(markers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Ruta para agregar un nuevo marcador
router.post('/', upload.single('image'), async (req, res) => {
  const { lat, lng } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

  const newMarker = new Marker({
    lat,
    lng,
    imageUrl,
  });

  try {
    const savedMarker = await newMarker.save();
    res.status(201).json(savedMarker);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
