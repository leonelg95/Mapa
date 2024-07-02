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
  const [editMode, setEditMode] = useState(null); // Estado para el modo de edición
  const [userLocation, setUserLocation] = useState(null); // Estado para la ubicación del usuario
  const [geoError, setGeoError] = useState(null); // Estado para almacenar errores de geolocalización

  // Obtener la geolocalización del usuario al cargar el componente
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setFormData({
          ...formData,
          lat: latitude,
          lng: longitude,
        });
      },
      (error) => {
        let errorMessage = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permission denied. Please allow location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position unavailable. Please try again later.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Request timed out. Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred.';
        }
        console.error('Error getting user location:', error);
        setGeoError(errorMessage);
      }
    );
  }, []); // Solo se ejecuta una vez al cargar el componente

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
  const handleUpdateMarker = (marker) => {
    setEditMode(marker._id); // Activar el modo de edición para el marcador seleccionado
    setFormData({
      lat: marker.lat,
      lng: marker.lng,
      date: marker.date,
      time: marker.time,
      description: marker.description,
      image: null, // No cargamos una nueva imagen por defecto
    });
    setPopupPosition([marker.lat, marker.lng]);
    setShowPopup(true);
  };

  const handleSaveUpdate = async (e, markerId) => {
    e.preventDefault();

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
      setEditMode(null); // Salir del modo de edición
      setShowPopup(false);
      setPopupPosition(null);
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
    setMarkers(markers.filter(marker => !(marker.lat === lat && marker.lng === lng)));
  };

  return (
    <MapContainer center={userLocation || [-26.8084602, -65.2175701]} zoom={userLocation ? 13 : 15} style={{ height: '80vh', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {markers.map((marker, index) => (
        <Marker key={index} position={[marker.lat, marker.lng]}>
          <Popup>
            {marker.isSaved ? (
              editMode === marker._id ? (
                <form onSubmit={(e) => handleSaveUpdate(e, marker._id)}>
                  <label>Fecha:</label>
                  <input type="date" value={formData.date} onChange={handleDateChange} required />
                  <label>Hora:</label>
                  <input type="time" value={formData.time} onChange={handleTimeChange} required />
                  <label>Description:</label>
                  <textarea value={formData.description} onChange={handleDescriptionChange} required />
                  <div>
                    <button type="submit">Guardar</button>
                    <button type="button" onClick={handleCancel}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <div>
                  {marker.imageUrl && (
                    <img src={`http://localhost:3000${marker.imageUrl}`} alt="Selected" style={{ width: '100px' }} />
                  )}
                  <p>Fecha: {marker.date}</p>
                  <p>Hora: {marker.time}</p>
                  <p>Description: {marker.description}</p>
                  <button onClick={() => handleUpdateMarker(marker)}>Actualizar</button>
                  <button onClick={() => handleDeleteMarker(marker._id)}>Borrar</button>
                </div>
              )
            ) : null}
          </Popup>
        </Marker>
      ))}
      {showPopup && popupPosition && !editMode && (
        <Marker position={popupPosition}>
          <Popup>
            <div {...getRootProps()} style={{ border: '1px dashed gray', padding: '10px', textAlign: 'center' }}>
              <input {...getInputProps()} />
              <p>Seleccionar imagen</p>
              <button type="button" onClick={open}>Seleccionar</button>
            </div>
            <form onSubmit={handleSubmit}>
              <label>Fecha:</label>
              <input type="date" value={formData.date} onChange={handleDateChange} required />
              <label>Hora:</label>
              <input type="time" value={formData.time} onChange={handleTimeChange} required />
              <label>Description:</label>
              <textarea value={formData.description} onChange={handleDescriptionChange} required />
              <div>
                <button type="submit">Subir</button>
                <button type="button" onClick={handleCancel}>Cancelar</button>
              </div>
            </form>
          </Popup>
        </Marker>
      )}
      <MapClickHandler />
      {geoError && (
        <div style={{ position: 'absolute', top: 0, left: 0, background: 'red', color: 'white', padding: '10px' }}>
          Error getting location: {geoError}
        </div>
      )}
    </MapContainer>
  );
}

export default MapComponent;
