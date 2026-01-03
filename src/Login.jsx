// src/Login.jsx
import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorDetails, setErrorDetails] = useState('') // เพิ่มตัวเก็บรายละเอียด error

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setErrorDetails('')

    console.log("Attempting login connecting to:", supabase.supabaseUrl); // ดูใน Console ว่าต่อถูกที่ไหม

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) throw error

      setMessage('เข้าสู่ระบบสำเร็จ! (User ID: ' + data.user.id + ')')
      console.log('Login successful:', data)

    } catch (error) {
      console.error('Login Error:', error);
      // แสดงข้อความ error หลัก
      setMessage('เกิดข้อผิดพลาด: ' + (error.message || "Failed to connect"))
      
      // ถ้าเป็น Failed to fetch จะแนะนำเพิ่มเติม
      if (error.message === "Failed to fetch" || error instanceof TypeError) {
        setErrorDetails('คำแนะนำ: Browser เชื่อมต่อไปยัง Supabase ไม่ได้ โปรดตรวจสอบอินเทอร์เน็ต, Firewall, หรือ Ad blocker ที่อาจบล็อกการเชื่อมต่อ');
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>เข้าสู่ระบบ (v2 Check)</h2>
      
      {/* ส่วนแสดงผล Error แบบละเอียด */}
      {message && (
        <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: message.includes('สำเร็จ') ? '#d4edda' : '#f8d7da', color: message.includes('สำเร็จ') ? '#155724' : '#721c24', borderRadius: '4px' }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{message}</p>
          {errorDetails && <p style={{ margin: '10px 0 0 0', fontSize: '0.9em' }}>{errorDetails}</p>}
        </div>
      )}
      
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="user@example.com"
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Password"
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  )
}