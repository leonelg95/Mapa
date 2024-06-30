import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

// Configuración de los íconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapComponent() {
  const [markers, setMarkers] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [formData, setFormData] = useState({
    lat: 0,
    lng: 0,
    image: null,
    date: '',
    time: '',
    description: '',
  });
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState(null);

  // Cargar marcadores existentes al inicio
  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/markers');
        const savedMarkers = response.data.map(marker => ({ ...marker, isSaved: true }));
        setMarkers(savedMarkers);
      } catch (error) {
        console.error('Error fetching markers:', error);
      }
    };

    fetchMarkers();
  }, []);

  // Función para manejar la carga de imágenes y datos adicionales
  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = function () {
      setSelectedImage(reader.result);
    };

    reader.readAsDataURL(file);

    setFormData({
      ...formData,
      image: file,
    });
  };

  // Funciones para manejar cambios en los campos de texto
  const handleDateChange = (e) => {
    setFormData({
      ...formData,
      date: e.target.value,
    });
  };

  const handleTimeChange = (e) => {
    setFormData({
      ...formData,
      time: e.target.value,
    });
  };

  const handleDescriptionChange = (e) => {
    setFormData({
      ...formData,
      description: e.target.value,
    });
  };

  // Configuración del Dropzone
  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  // Manejar el evento de clic en el mapa para agregar marcadores
  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setFormData({
          ...formData,
          lat,
          lng,
        });
        setMarkers([...markers, { lat, lng, isSaved: false }]);
        setShowPopup(true); // Mostrar el popup
        setPopupPosition([lat, lng]);
      },
    });
    return null;
  };

  // Función para enviar los datos del formulario al servidor
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { lat, lng, image, date, time, description } = formData;
    const formDataToSend = new FormData();
    formDataToSend.append('lat', lat);
    formDataToSend.append('lng', lng);
    formDataToSend.append('image', image);
    formDataToSend.append('date', date);
    formDataToSend.append('time', time);
    formDataToSend.append('description', description);

    try {
      const response = await axios.post('http://localhost:3000/api/markers', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const newMarker = { ...response.data, isSaved: true };
      setMarkers(markers.map(marker => (marker.lat === lat && marker.lng === lng ? newMarker : marker)));
      // Limpiar el formulario después de enviar
      setFormData({
        lat: 0,
        lng: 0,
        image: null,
        date: '',
        time: '',
        description: '',
      });
      setSelectedImage(null);
      setShowPopup(false); // Ocultar el popup
      setPopupPosition(null);
    } catch (error) {
      console.error('Error uploading marker:', error);
    }
  };

  // Función para manejar la actualización del marcador
  const handleUpdateMarker = async (markerId) => {
    const { lat, lng, image, date, time, description } = formData;
    const formDataToUpdate = new FormData();
    formDataToUpdate.append('lat', lat);
    formDataToUpdate.append('lng', lng);
    formDataToUpdate.append('image', image);
    formDataToUpdate.append('date', date);
    formDataToUpdate.append('time', time);
    formDataToUpdate.append('description', description);

    try {
      const response = await axios.put(`http://localhost:3000/api/markers/${markerId}`, formDataToUpdate, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // Actualizar los marcadores en el estado local
      const updatedMarkers = markers.map(marker =>
        marker._id === markerId ? { ...response.data, isSaved: true } : marker
      );
      setMarkers(updatedMarkers);
    } catch (error) {
      console.error('Error updating marker:', error);
    }
  };

  // Función para manejar la eliminación del marcador
  const handleDeleteMarker = async (markerId) => {
    try {
      await axios.delete(`http://localhost:3000/api/markers/${markerId}`);
      // Filtrar los marcadores para eliminar el marcador seleccionado
      const filteredMarkers = markers.filter(marker => marker._id !== markerId);
      setMarkers(filteredMarkers);
    } catch (error) {
      console.error('Error deleting marker:', error);
    }
  };

  // Función para manejar la cancelación del formulario
  const handleCancel = () => {
    const { lat, lng } = formData;
    setFormData({
      lat: 0,
      lng: 0,
      image: null,
      date: '',
      time: '',
      description: '',
    });
    setSelectedImage(null);
    setShowPopup(false); // Ocultar el popup
    setPopupPosition(null);
    // Eliminar el marcador temporal
    setMarkers(markers.filter(marker => marker.lat !== lat || marker.lng !== lng));
  };

  return (
    <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '100vh', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {markers.map((marker, idx) => (
        <Marker key={idx} position={[marker.lat, marker.lng]}>
          <Popup>
            {marker.isSaved ? (
              <div>
                {marker.imageUrl && (
                  <img src={`http://localhost:3000${marker.imageUrl}`} alt="Selected" style={{ width: '100px' }} />
                )}
                <p>Date: {marker.date}</p>
                <p>Time: {marker.time}</p>
                <p>Description: {marker.description}</p>
                <button onClick={() => handleUpdateMarker(marker._id)}>Update</button>
                <button onClick={() => handleDeleteMarker(marker._id)}>Delete</button>
              </div>
            ) : null}
          </Popup>
        </Marker>
      ))}
      {showPopup && popupPosition && (
        <Marker position={popupPosition}>
          <Popup>
            <div {...getRootProps()} style={{ border: '1px dashed gray', padding: '10px', textAlign: 'center' }}>
              <input {...getInputProps()} />
              <p>Click to select an image</p>
              <button type="button" onClick={open}>Open File Dialog</button>
            </div>
            <form onSubmit={handleSubmit}>
              <label>Date:</label>
              <input type="date" value={formData.date} onChange={handleDateChange} required />
              <label>Time:</label>
              <input type="time" value={formData.time} onChange={handleTimeChange} required />
              <label>Description:</label>
              <textarea value={formData.description} onChange={handleDescriptionChange} required />
              <div>
                <button type="submit">Submit</button>
                <button type="button" onClick={handleCancel}>Cancel</button>
              </div>
            </form>
          </Popup>
        </Marker>
      )}
      <MapClickHandler />
    </MapContainer>
  );
}

export default MapComponent;

