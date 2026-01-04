// src/Register.jsx
import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [msg, setMsg] = useState('')

  const handleRegister = async (e) => {
    e.preventDefault()
    setMsg('')

    // สมัครสมาชิกผ่าน Supabase Auth
    // เราส่ง username ไปเก็บใน metadata เพื่อให้ Trigger ดึงไปใช้
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username } 
      }
    })

    if (error) {
      setMsg(`Error: ${error.message}`)
    } else {
      setMsg('✅ สมัครสมาชิกสำเร็จ! โปรดรอ Admin อนุมัติสิทธิ์ก่อนเข้าใช้งาน')
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>สมัครสมาชิกใหม่ 🆕</h2>
      <form onSubmit={handleRegister}>
        <div style={{ marginBottom: '10px' }}>
          <label>ชื่อผู้ใช้ (Username):</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>
          ยืนยันการสมัคร
        </button>
      </form>
      {msg && <p style={{ marginTop: '10px', color: msg.startsWith('Error') ? 'red' : 'green' }}>{msg}</p>}
      <p style={{ marginTop: '10px' }}><a href="/">กลับไปหน้าเข้าสู่ระบบ</a></p>
    </div>
  )
}