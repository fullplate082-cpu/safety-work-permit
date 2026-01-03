// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // ถ้ามีไฟล์นี้อยู่ก็ import ได้ ถ้าไม่มีให้ลบบรรทัดนี้ออก

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)