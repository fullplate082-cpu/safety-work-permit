// src/App.jsx
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import Dashboard from './Dashboard'
import Register from './Register' // ✅ อย่าลืม import Register เข้ามาด้วยนะครับ

function App() {
  const [session, setSession] = useState(null)
  
  // ✅ 1. เพิ่ม state เพื่อจำว่าตอนนี้จะโชว์หน้าไหน ('login' หรือ 'register')
  const [currentView, setCurrentView] = useState('login') 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // เงื่อนไข: ถ้ายังไม่ล็อกอิน (!session)
  if (!session) {
    // ✅ 2. เช็คว่า user อยากดูหน้าไหน
    if (currentView === 'register') {
      // ส่งฟังก์ชัน onSwitch กลับไปให้ปุ่ม "กลับสู่หน้าล็อกอิน"
      return <Register onSwitchToLogin={() => setCurrentView('login')} />
    } else {
      // ส่งฟังก์ชัน onSwitch ไปให้ปุ่ม "สมัครสมาชิก" ในหน้า Login
      return <Login onSwitchToRegister={() => setCurrentView('register')} />
    }
  }
  
  // ถ้ามี session (ล็อกอินแล้ว)
  else {
    return <Dashboard session={session} />
  }
}

export default App