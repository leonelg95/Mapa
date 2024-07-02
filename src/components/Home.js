//Home.jsx

import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import appFirebase from './credenciales';
import MapComponent from './MapComponent';



const auth = getAuth(appFirebase);

const Home = ({ correoUsuario }) => {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [tipoCambio, setTipoCambio] = useState('');

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        console.log('Usuario cerró sesión');
      })
      .catch((error) => {
        console.error('Error al cerrar sesión:', error);
      });
  };

  const handleClickInput = () => {
    setMostrarFormulario(true);
  };

  return (
    <div>
      <div className='container'>
        <h2 className='text-center'>Bienvenido {correoUsuario}
         <button className='btnlogout' onClick={handleSignOut}>
          Cerrar sesión
        </button>
        </h2>
      
     
            <div className=''>
              <MapComponent/>
            </div>
     
  
      </div>
    </div>
  );
};

export default Home;
