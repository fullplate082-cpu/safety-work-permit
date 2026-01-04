// src/PersonnelList.jsx
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import EditPersonnelModal from './EditPersonnelModal'

export default function PersonnelList({ session, onBack }) {
  const [loading, setLoading] = useState(true)
  const [personnelList, setPersonnelList] = useState([]) // รายชื่อพนักงาน
  const [courses, setCourses] = useState([]) // รายชื่อหลักสูตร
  
  // State สำหรับฟอร์มขออบรม
  const [requestForm, setRequestForm] = useState({
    personnel_id: '',
    course_id: ''
  })
  
  const [editingPersonnel, setEditingPersonnel] = useState(null)

  useEffect(() => {
    fetchData()
  }, [session])

  const fetchData = async () => {
    try {
      setLoading(true)

      // 1. หา Company ID
      const { data: userRec } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single()
      if (!userRec) throw new Error("ไม่พบข้อมูล User Profile")
      const { data: company } = await supabase.from('companies').select('id').eq('user_id', userRec.id).single()
      if (!company) { setLoading(false); return }

      // 2. ดึงรายชื่อพนักงาน + ประวัติการอบรม + คำขอที่รออยู่
      const { data: people, error } = await supabase
        .from('personnel')
        .select(`
          id, first_name, last_name, position, status, photo_url, company_id,
          national_id_or_passport, remark,
          personnel_training_records ( 
            completion_date, 
            expiry_date, 
            training_courses ( course_name ) 
          ),
          training_requests (
            status,
            training_courses ( course_name )
          )
        `)
        .eq('company_id', company.id)
        .order('id', { ascending: true })

      if (error) throw error
      setPersonnelList(people || [])

      // 3. ดึงรายชื่อหลักสูตร มาใส่ Dropdown
      const { data: courseList } = await supabase.from('training_courses').select('*').order('id')
      setCourses(courseList || [])

    } catch (error) {
      console.error('Error:', error.message)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ฟังก์ชันส่งคำขออบรม
  const handleSendRequest = async (e) => {
    e.preventDefault()
    if (!requestForm.personnel_id || !requestForm.course_id) {
      alert('กรุณาเลือกพนักงานและหลักสูตรให้ครบถ้วน')
      return
    }

    try {
      // ดึง company_id จากพนักงานที่เลือก (หรือจาก session ก็ได้)
      const selectedPerson = personnelList.find(p => p.id == requestForm.personnel_id)
      
      const { error } = await supabase.from('training_requests').insert({
        personnel_id: requestForm.personnel_id,
        course_id: requestForm.course_id,
        company_id: selectedPerson.company_id,
        status: 'PENDING'
      })

      if (error) throw error

      alert(`✅ ส่งคำขอเรียบร้อย! ระบบกำลังแจ้งเจ้าหน้าที่ Safety`)
      setRequestForm({ personnel_id: '', course_id: '' }) // เคลียร์ฟอร์ม
      fetchData() // โหลดข้อมูลใหม่

    } catch (error) {
      alert('❌ ส่งคำขอไม่สำเร็จ: ' + error.message)
    }
  }

  // ฟังก์ชันลบ
  const handleDelete = async (id, name) => {
    if (window.confirm(`⚠️ ลบ "${name}" ใช่หรือไม่?`)) {
      try {
        const { error } = await supabase.from('personnel').delete().eq('id', id)
        if (error) throw error
        setPersonnelList(personnelList.filter(p => p.id !== id))
      } catch (error) { alert('ลบไม่ได้: ' + error.message) }
    }
  }

  // Helper: เช็ควันหมดอายุ
  const getStatusBadge = (expiryDate) => {
    if (!expiryDate) return null
    const today = new Date()
    const expiry = new Date(expiryDate)
    if (expiry < today) return <span style={{color: '#dc3545', fontWeight: 'bold', fontSize: '0.8rem'}}>🔴 หมดอายุ</span>
    return <span style={{color: '#28a745', fontWeight: 'bold', fontSize: '0.8rem'}}>🟢 ปกติ</span>
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px' }}>
      
      {/* --- ส่วนหัว & ปุ่มย้อนกลับ --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>👷‍♂️ จัดการพนักงานและการอบรม</h2>
        <button onClick={onBack} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>⬅️ ย้อนกลับ</button>
      </div>

      {/* --- 🟢 ส่วนที่ 1: กล่องส่งพนักงานเข้าอบรม (Action Zone) --- */}
      <div style={{ backgroundColor: '#e9ecef', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #ced4da' }}>
        <h3 style={{ marginTop: 0, color: '#0056b3' }}>🚀 ส่งพนักงานเข้าอบรม (Request Training)</h3>
        <form onSubmit={handleSendRequest} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'end' }}>
          
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{fontWeight: 'bold'}}>1. เลือกพนักงาน:</label>
            <select 
              style={inputStyle} 
              value={requestForm.personnel_id}
              onChange={e => setRequestForm({...requestForm, personnel_id: e.target.value})}
            >
              <option value="">-- เลือกรายชื่อ --</option>
              {personnelList.map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.position})</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{fontWeight: 'bold'}}>2. เลือกหลักสูตร:</label>
            <select 
              style={inputStyle}
              value={requestForm.course_id}
              onChange={e => setRequestForm({...requestForm, course_id: e.target.value})}
            >
              <option value="">-- เลือกหลักสูตร --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.course_name} ({c.validity_months} เดือน)</option>
              ))}
            </select>
          </div>

          <button type="submit" style={{ padding: '10px 25px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '42px', fontWeight: 'bold' }}>
            📩 ส่งคำขอ
          </button>
        </form>
      </div>

      {/* --- 🔵 ส่วนที่ 2: ตารางข้อมูลและประวัติ (Information Zone) --- */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h3 style={{ marginTop: 0 }}>📋 รายชื่อและประวัติการอบรม</h3>
        
        {loading ? <p>⏳ กำลังโหลด...</p> : (
          <div style={{overflowX: 'auto'}}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                  <th style={thStyle}>ชื่อ-นามสกุล</th>
                  <th style={thStyle}>ตำแหน่ง</th>
                  <th style={thStyle}>ประวัติที่ผ่านแล้ว (History)</th>
                  <th style={thStyle}>สถานะคำขอ (Request)</th>
                  <th style={thStyle}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {personnelList.map((p) => {
                  const history = p.personnel_training_records || []
                  const requests = p.training_requests?.filter(r => r.status === 'PENDING') || []

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{...tdStyle, verticalAlign: 'top'}}><strong>{p.first_name} {p.last_name}</strong></td>
                      <td style={{...tdStyle, verticalAlign: 'top'}}>{p.position || '-'}</td>
                      
                      {/* ประวัติการอบรมที่ผ่านแล้ว */}
                      <td style={{...tdStyle, verticalAlign: 'top'}}>
                        {history.length > 0 ? history.map((h, i) => (
                          <div key={i} style={{marginBottom: '5px', fontSize: '0.9rem'}}>
                            ✅ {h.training_courses?.course_name} 
                            <span style={{color: '#666', marginLeft: '5px'}}>
                              (หมด: {h.expiry_date || '-'}) {getStatusBadge(h.expiry_date)}
                            </span>
                          </div>
                        )) : <span style={{color: '#999'}}>- ไม่มีประวัติ -</span>}
                      </td>

                      {/* สถานะคำขอที่กำลังรออยู่ */}
                      <td style={{...tdStyle, verticalAlign: 'top'}}>
                        {requests.length > 0 ? requests.map((r, i) => (
                          <div key={i} style={{marginBottom: '5px', fontSize: '0.9rem', color: '#d39e00'}}>
                            ⏳ กำลังขอ: {r.training_courses?.course_name}
                          </div>
                        )) : <span style={{color: '#999'}}>-</span>}
                      </td>

                      <td style={{...tdStyle, verticalAlign: 'top'}}>
                         <button onClick={() => setEditingPersonnel(p)} style={{padding: '5px 10px', backgroundColor: '#ffc107', color: '#212529', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px'}}>✏️ แก้ไข</button>
                         <button onClick={() => handleDelete(p.id, p.first_name)} style={{padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>🗑️ ลบ</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingPersonnel && (
        <EditPersonnelModal personnel={editingPersonnel} onClose={() => setEditingPersonnel(null)} onUpdate={fetchData} />
      )}
    </div>
  )
}

const thStyle = { padding: '12px', borderBottom: '2px solid #dee2e6', whiteSpace: 'nowrap' }
const tdStyle = { padding: '12px' }
const inputStyle = { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }