// backend/models/Marker.js
const mongoose = require('mongoose');

const markerSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  imageUrl: { type: String },
});

module.exports = mongoose.model('Marker', markerSchema);
