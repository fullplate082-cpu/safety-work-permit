// src/Login.jsx
import { useState } from 'react'
import { supabase } from './supabaseClient'

// รับ prop onSwitchToRegister มาจาก App.jsx
export default function Login({ onSwitchToRegister }) { 
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>เข้าสู่ระบบ</h2>
      <form onSubmit={handleLogin}>
        <div style={{marginBottom: '10px'}}>
            <label>Email:</label>
            <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                style={{width: '100%', padding: '8px', marginTop: '5px'}}
            />
        </div>
        
        <div style={{marginBottom: '20px'}}>
            <label>Password:</label>
            <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{width: '100%', padding: '8px', marginTop: '5px'}}
            />
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
          {loading ? 'กำลังโหลด...' : 'เข้าสู่ระบบ'}
        </button>
      </form>

      {/* ✅ ส่วนที่เพิ่ม: ปุ่มกดไปหน้าสมัครสมาชิก */}
      <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '10px' }}>
        <p>ยังไม่มีบัญชีใช่ไหม?</p>
        <button 
          onClick={onSwitchToRegister} 
          style={{ background: 'none', border: 'none', color: '#28a745', cursor: 'pointer', textDecoration: 'underline', fontSize: '16px' }}
        >
          สมัครสมาชิกใหม่ที่นี่
        </button>
      </div>
    </div>
  )
}