// src/Dashboard.jsx
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import AddPersonnel from './AddPersonnel' // ✅ นำเข้าหน้าลงทะเบียน
// ... import เดิม ...
import PersonnelList from './PersonnelList'
import SafetyDashboard from './SafetyDashboard'
export default function Dashboard({ session }) {
  const user = session.user
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // State สำหรับ Admin
  const [pendingUsers, setPendingUsers] = useState([])

  // ✅ State สำหรับสลับหน้าจอ ('menu' = หน้าหลัก, 'add_personnel' = หน้าลงทะเบียน)
  const [currentView, setCurrentView] = useState('menu') 

  // 1. ฟังก์ชันดึงข้อมูล User ปัจจุบันและ Role
  const getProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select(`
          username,
          roles ( name )
        `)
        .eq('auth_id', user.id)
        .single()

      if (error) {
        console.warn('ไม่พบข้อมูล Profile', error)
      } else {
        setProfile(data)
        
        // ถ้าเป็น Admin ให้ดึงรายชื่อคนรออนุมัติทันที
        if (data.roles?.name === 'admin') {
          fetchPendingUsers()
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  // 2. ฟังก์ชันดึงรายชื่อคนรออนุมัติ (เฉพาะ Admin)
  const fetchPendingUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, username, email')
      .is('role_id', null) // ดึงคนที่ role_id เป็นค่าว่าง
    
    if (data) {
      setPendingUsers(data)
    }
  }

  // 3. ฟังก์ชันกดอนุมัติสิทธิ์ (เฉพาะ Admin)
  const approveUser = async (userId, roleName) => {
    try {
      // หา role_id จากชื่อที่ส่งมา
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName)
        .single()

      if (roleData) {
        // อัปเดต user คนนั้นให้มี role ตามที่เลือก
        await supabase
          .from('users')
          .update({ role_id: roleData.id })
          .eq('id', userId)
        
        alert(`✅ อนุมัติสิทธิ์ ${roleName} เรียบร้อย!`)
        // ดึงรายการใหม่เพื่ออัปเดตหน้าจอ
        fetchPendingUsers()
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  // เรียกใช้เมื่อโหลดหน้าเว็บ
  useEffect(() => {
    getProfile()
  }, [session])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // ✅ ส่วนสลับหน้าจอ: ถ้า currentView เป็น 'add_personnel' ให้แสดงหน้าลงทะเบียน
  if (currentView === 'add_personnel') {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <AddPersonnel 
          session={session} 
          onCancel={() => setCurrentView('menu')} // กดปุ่มยกเลิกแล้วกลับมาหน้า menu
          
        />
      </div>
      
    )
  }
  // ... (ต่อจาก if currentView === 'add_personnel') ...
  // ✅ เพิ่มเงื่อนไขสำหรับหน้า PersonnelList
  if (currentView === 'personnel_list') {
    return (
      <PersonnelList 
        session={session} 
        onBack={() => setCurrentView('menu')} 
      />
    )
  }


  // --- ส่วนแสดงผลหลัก (Dashboard Menu) ---
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <h1>ระบบใบอนุญาตทำงาน 🏗️</h1>
        <button 
          onClick={handleLogout}
          style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ออกจากระบบ
        </button>
      </header>

      <main style={{ marginTop: '20px' }}>
        <h2>ยินดีต้อนรับ, {user.email}</h2>

        {loading ? (
          <p>⏳ กำลังโหลดข้อมูล...</p>
        ) : profile ? (
          <div>
            <p>
              สถานะของคุณคือ: 
              <span style={{ fontWeight: 'bold', color: '#007bff', marginLeft: '5px', textTransform: 'uppercase' }}>
                {profile.roles?.name || 'รอการอนุมัติ'}
              </span>
            </p>

            {/* พื้นที่แสดงผลตามบทบาท */}
            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
              
              {/* --- ส่วนของ ADMIN --- */}
              {profile.roles?.name === 'admin' && (
                <div>
                  <h3>🔧 เมนูสำหรับผู้ดูแลระบบ</h3>
                  
                  <div style={{ marginTop: '20px', padding: '15px', border: '2px dashed #ffc107', borderRadius: '8px', backgroundColor: '#fff' }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <h4>🔔 คำขอสมัครสมาชิกใหม่ ({pendingUsers.length})</h4>
                      <button onClick={fetchPendingUsers} style={{cursor:'pointer'}}>🔄 รีเฟรช</button>
                    </div>

                    {pendingUsers.length === 0 ? (
                      <p style={{color:'#888', fontStyle:'italic'}}>ไม่มีรายการรออนุมัติ</p>
                    ) : (
                      <ul style={{listStyle:'none', padding:0}}>
                        {pendingUsers.map(u => (
                          <li key={u.id} style={{ margin: '10px 0', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                            <div>
                              <strong>{u.username}</strong> <br/>
                              <span style={{fontSize:'0.9em', color:'#666'}}>{u.email}</span>
                            </div>
                            <div style={{marginTop:'8px'}}>
                              <span style={{marginRight:'10px'}}>กำหนดสิทธิ์: </span>
                              <button onClick={() => approveUser(u.id, 'supplier')} style={actionBtnStyle}>Supplier 👷‍♂️</button>
                              <button onClick={() => approveUser(u.id, 'safety')} style={actionBtnStyle}>Safety 🛡️</button>
                              <button onClick={() => approveUser(u.id, 'security')} style={actionBtnStyle}>Security 👮</button>
                              <button onClick={() => approveUser(u.id, 'admin')} style={{...actionBtnStyle, backgroundColor: '#dc3545', color: 'white'}}>Admin 👑</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* --- ส่วนของ SAFETY --- */}
              {/* --- ส่วนของ SAFETY --- */}
{profile.roles?.name === 'safety' && (
  <div>
    <h3>🛡️ เมนูสำหรับเจ้าหน้าที่ Safety</h3>
    {/* แสดงหน้า SafetyDashboard ตรงๆ เลย หรือจะทำเป็นปุ่มกดเข้าก็ได้ครับ */}
    {/* ในที่นี้ผมแนะนำให้แสดงเลย เพราะเป็นงานหลักของเขา */}
    <SafetyDashboard session={session} />
  </div>
)}

              {/* --- ส่วนของ SUPPLIER --- */}
              {profile.roles?.name === 'supplier' && (
                <div>
                  <h3>👷‍♂️ เมนูสำหรับผู้รับเหมา</h3>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    
                    <button 
                      onClick={() => setCurrentView('add_personnel')} 
                      style={btnStyle}
                    >
                      📝 ลงทะเบียนพนักงาน
                    </button>

                    {/* 👇 เติมปุ่มนี้เข้าไปครับ 👇 */}
                    <button 
                      onClick={() => setCurrentView('personnel_list')}
                      style={{...btnStyle, backgroundColor: '#17a2b8'}} 
                    >
                      📋 ตรวจสอบรายชื่อ
                    </button>
                    
                    <button style={btnStyle}>📄 ขอใบอนุญาตทำงาน</button>
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : (
          <div style={{ color: 'red', marginTop: '20px' }}>
            ⚠️ ไม่พบข้อมูลโปรไฟล์ (สถานะ: รอ Admin อนุมัติ หรือยังไม่ได้ตั้งค่า)
          </div>
        )}
      </main>
    </div>
  )
}

// สไตล์ปุ่มทั่วไป
const btnStyle = {
  padding: '10px 20px',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
}
// สไตล์ปุ่มสำหรับ Admin (ปุ่มอนุมัติ)
const actionBtnStyle = {
  marginRight: '5px',
  padding: '5px 10px',
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: '4px',
  backgroundColor: '#f0f0f0',
  fontSize: '0.9rem'
}