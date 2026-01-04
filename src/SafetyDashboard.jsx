// src/SafetyDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function SafetyDashboard({ session }) {
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('pending') 

  const [pendingList, setPendingList] = useState([]) 
  const [historyList, setHistoryList] = useState([]) 
  const [filteredHistory, setFilteredHistory] = useState([]) 
  const [courses, setCourses] = useState([])

  const [searchFilters, setSearchFilters] = useState({ name: '', company: '', course: '' })

  const [selectedPerson, setSelectedPerson] = useState(null) 
  const [rejectData, setRejectData] = useState(null) 
  const [rejectReason, setRejectReason] = useState('')
  
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [newCourse, setNewCourse] = useState({ name: '', months: 12 })

  const [trainingForm, setTrainingForm] = useState({
    course_id: '',
    completion_date: '',
    expiry_date: '',
    request_id: null 
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const { data: courseList } = await supabase.from('training_courses').select('*').order('id')
      setCourses(courseList || [])
      fetchPendingData()
    } catch (error) { console.error('Error:', error) } 
    finally { setLoading(false) }
  }

  const fetchPendingData = async () => {
    setLoading(true)
    
    // ดึงข้อมูลคนที่ไม่ใช่ REJECTED (เพราะ REJECTED ไปอยู่ประวัติ)
    const { data } = await supabase
      .from('personnel')
      .select(`
        id, first_name, last_name, position, status, remark,
        companies ( company_name ),
        personnel_training_records ( completion_date, expiry_date, training_courses ( course_name ) ),
        training_requests ( 
          id, course_id, status, created_at, 
          training_courses ( course_name, validity_months ) 
        )
      `)
      .neq('status', 'REJECTED') // เอาทุกคนที่ไม่ใช่ Rejected มาเช็คก่อน
      .order('id', { ascending: false })

    if (data) {
      // 🎯 Logic หัวใจสำคัญ: กรองเฉพาะคนที่มีงานต้องทำ
      const workToDo = data.filter(p => {
        // เงื่อนไข 1: เป็นพนักงานใหม่ที่ยังไม่ได้ตรวจ
        const isNewPerson = p.status === 'PENDING_ADMIN'
        
        // เงื่อนไข 2: หรือ... มีคำขออบรมที่ยัง PENDING อยู่ (แม้สถานะคนจะผ่านแล้วก็ตาม)
        const hasPendingRequest = p.training_requests?.some(r => r.status === 'PENDING')

        return isNewPerson || hasPendingRequest
      })
      
      setPendingList(workToDo)
    } else {
      setPendingList([])
    }
    setLoading(false)
  }

  const fetchHistoryData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('personnel')
      .select(`
        id, first_name, last_name, position, status, remark,
        companies ( company_name ),
        personnel_training_records ( completion_date, expiry_date, training_courses ( course_name ) )
      `)
      // .neq('status', 'PENDING_ADMIN') // อันเดิมเรากรองแบบนี้
      .order('id', { ascending: false })

    // ในหน้าประวัติ เราอาจจะโชว์ทุกคนไปเลย หรือจะกรองคนที่มีงานค้างออกก็ได้
    // แต่เพื่อให้ค้นหาง่าย แนะนำให้ "โชว์ทุกคน" หรือ "ทุกคนที่ไม่มีงานค้าง" ครับ
    // ในที่นี้ผมให้โชว์ทุกคน เพื่อให้ Safety ค้นหาข้อมูลได้ง่ายที่สุดครับ
    setHistoryList(data || [])
    setFilteredHistory(data || [])
    setLoading(false)
  }
  useEffect(() => {
    if (viewMode === 'history') {
      const lowerName = searchFilters.name.toLowerCase()
      const lowerComp = searchFilters.company.toLowerCase()
      const lowerCourse = searchFilters.course.toLowerCase()
      const result = historyList.filter(p => {
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase()
        const companyName = p.companies?.company_name?.toLowerCase() || ''
        const courses = p.personnel_training_records?.map(r => r.training_courses?.course_name?.toLowerCase()).join(' ') || ''
        return fullName.includes(lowerName) && companyName.includes(lowerComp) && courses.includes(lowerCourse)
      })
      setFilteredHistory(result)
    }
  }, [searchFilters, historyList, viewMode])

  useEffect(() => {
    if (trainingForm.course_id && trainingForm.completion_date) {
      const course = courses.find(c => c.id == trainingForm.course_id)
      if (course && course.validity_months > 0) {
        const date = new Date(trainingForm.completion_date)
        date.setMonth(date.getMonth() + course.validity_months)
        setTrainingForm(prev => ({ ...prev, expiry_date: date.toISOString().split('T')[0] }))
      }
    }
  }, [trainingForm.course_id, trainingForm.completion_date])

  const openApproveModal = (person, specificRequest = null) => {
    setSelectedPerson(person)
    if (specificRequest) {
      setTrainingForm({
        course_id: specificRequest.course_id,
        completion_date: '',
        expiry_date: '',
        request_id: specificRequest.id 
      })
    } else {
      setTrainingForm({ course_id: '', completion_date: '', expiry_date: '', request_id: null })
    }
  }

  const openRejectModal = (person, specificRequest = null) => {
    setRejectData({ person, request: specificRequest })
    setRejectReason('')
  }

  const handleSaveTraining = async (e) => {
    e.preventDefault()
    if (!selectedPerson) return
    try {
      const { error: insertError } = await supabase.from('personnel_training_records').insert([{
          personnel_id: selectedPerson.id,
          course_id: trainingForm.course_id,
          completion_date: trainingForm.completion_date,
          expiry_date: trainingForm.expiry_date || null,
          recorder_id: session.user.id 
        }])
      if (insertError) throw insertError

      await supabase.from('personnel').update({ status: 'VERIFIED_ACTIVE', remark: null }).eq('id', selectedPerson.id)
      
      if (trainingForm.request_id) {
        await supabase.from('training_requests').update({ status: 'APPROVED' }).eq('id', trainingForm.request_id)
      }

      alert('✅ อนุมัติเรียบร้อย!')
      setSelectedPerson(null)
      fetchPendingData() 

    } catch (error) { alert('❌ Error: ' + error.message) }
  }

  const handleReject = async (e) => {
    e.preventDefault()
    if (!rejectData) return
    try {
      if (rejectData.request) {
         await supabase.from('training_requests').update({ status: 'REJECTED' }).eq('id', rejectData.request.id)
         alert('🚫 ปฏิเสธคำขอนี้เรียบร้อย')
      } else {
         await supabase.from('personnel').update({ status: 'REJECTED', remark: rejectReason }).eq('id', rejectData.person.id)
         const pendingRequest = rejectData.person.training_requests?.find(r => r.status === 'PENDING')
         if (pendingRequest) {
            await supabase.from('training_requests').update({ status: 'REJECTED' }).eq('id', pendingRequest.id)
         }
         alert('🚫 ไม่อนุมัติพนักงานคนนี้')
      }
      setRejectData(null)
      setRejectReason('')
      fetchPendingData()
    } catch (error) { alert('❌ Error: ' + error.message) }
  }

  const handleAddCourse = async (e) => {
    e.preventDefault()
    if (!newCourse.name) return
    try {
      const { data, error } = await supabase.from('training_courses')
        .insert([{ course_name: newCourse.name, validity_months: parseInt(newCourse.months) }])
        .select().single()
      if (error) throw error
      alert(`✅ เพิ่มหลักสูตร "${newCourse.name}" เรียบร้อย!`)
      setCourses([...courses, data])
      setShowAddCourse(false)
      setNewCourse({ name: '', months: 12 })
    } catch (error) { alert('❌ เพิ่มไม่สำเร็จ: ' + error.message) }
  }

  // ✅ ฟังก์ชันจัดเตรียมข้อมูลสำหรับตาราง (Flatten Data)
  const prepareRows = (data, isHistory) => {
    let rows = []
    
    if (data.length === 0) return []

    data.forEach(p => {
      // หา Request ที่ค้างอยู่
      const pendingRequests = p.training_requests?.filter(r => r.status === 'PENDING') || []

      if (!isHistory && pendingRequests.length > 0) {
        // กรณีมีคำขอ: แตกแถวตามจำนวนคำขอ
        pendingRequests.forEach((req, index) => {
          rows.push({
            uniqueKey: `${p.id}_${req.id}`, // Key สำหรับ React
            person: p,
            request: req,
            isFirstRow: index === 0, // เช็คว่าเป็นแถวแรกของคนนี้ไหม (เพื่อโชว์ชื่อ)
            rowCount: pendingRequests.length, // จำนวนแถวทั้งหมดของคนนี้
            type: 'request'
          })
        })
      } else {
        // กรณีไม่มีคำขอ (หรือเป็นหน้า History): โชว์แถวเดียวปกติ
        rows.push({
          uniqueKey: `${p.id}_main`,
          person: p,
          request: null,
          isFirstRow: true,
          rowCount: 1,
          type: 'manual'
        })
      }
    })
    return rows
  }

  // ✅ ส่วนแสดงผลตาราง (Redesign ใหม่)
  const renderTable = (originalData, isHistory = false) => {
    const rows = prepareRows(originalData, isHistory)

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ backgroundColor: isHistory ? '#6c757d' : '#007bff', color: 'white', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
            <th style={thStyle}>ชื่อ-นามสกุล</th>
            <th style={thStyle}>บริษัท</th>
            <th style={thStyle}>ตำแหน่ง</th>
            {!isHistory && <th style={thStyle}>สิ่งที่ขออบรม (Request)</th>}
            <th style={thStyle}>สถานะ</th>
            {isHistory && <th style={thStyle}>ประวัติการอบรม</th>}
            <th style={thStyle}>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={isHistory ? 6 : 7} style={{textAlign: 'center', padding: '30px', color: '#888'}}>ไม่พบข้อมูล</td></tr>
          ) : (
            rows.map((row, index) => {
              const { person: p, request: req, isFirstRow, rowCount } = row
              
              // สไตล์เส้นขอบ: ถ้าเป็นแถวสุดท้ายของคนนั้นๆ ให้ขีดเส้นหนาหน่อย
              const isLastRowOfPerson = (index === rows.length - 1) || (rows[index + 1]?.person.id !== p.id)
              const borderBottom = isLastRowOfPerson ? '2px solid #dee2e6' : '1px solid #f0f0f0'

              return (
                <tr key={row.uniqueKey} style={{ borderBottom: borderBottom, backgroundColor: isFirstRow ? 'white' : '#fcfcfc' }}>
                  
                  {/* แสดงข้อมูลส่วนตัวแค่แถวแรก */}
                  <td style={tdStyle}>
                    {isFirstRow && (
                      <div style={{fontWeight: 'bold', color: '#333'}}>
                        {p.first_name} {p.last_name}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>{isFirstRow && (p.companies?.company_name || '-')}</td>
                  <td style={tdStyle}>{isFirstRow && p.position}</td>

                  {!isHistory && (
                    <td style={tdStyle}>
                      {req ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem' }}>📘</span>
                          <div>
                            <div style={{ fontWeight: '600', color: '#0056b3' }}>{req.training_courses?.course_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#888' }}>📅 ขอเมื่อ: {new Date(req.created_at).toLocaleDateString('th-TH')}</div>
                          </div>
                        </div>
                      ) : (
                        <span style={{color: '#aaa', fontStyle: 'italic'}}>- ไม่ได้ระบุ -</span>
                      )}
                    </td>
                  )}

                  {/* สถานะ (โชว์แค่ครั้งเดียวพอกลางๆ หรือโชว์ทุกช่องก็ได้) */}
                  <td style={tdStyle}>
                    {isFirstRow && (
                      <>
                        {p.status === 'PENDING_ADMIN' && <span style={statusBadgeStyle.pending}>⏳ รอตรวจสอบ</span>}
                        {p.status === 'VERIFIED_ACTIVE' && <span style={statusBadgeStyle.active}>✅ ผ่านแล้ว</span>}
                        {p.status === 'REJECTED' && <span style={statusBadgeStyle.rejected}>❌ ไม่ผ่าน</span>}
                      </>
                    )}
                  </td>

                  {isHistory && (
                    <td style={tdStyle}>
                      {isFirstRow && p.personnel_training_records?.map((r, idx) => (
                        <div key={idx} style={{fontSize: '0.85rem', marginBottom:'4px'}}>
                          ✅ {r.training_courses?.course_name} <span style={{color: '#999', fontSize: '0.75rem'}}>({r.expiry_date})</span>
                        </div>
                      ))}
                    </td>
                  )}

                  {/* ปุ่มจัดการ */}
                  <td style={tdStyle}>
                    {req ? (
                      // กรณีมี Request: ปุ่มจัดการเฉพาะ Request นั้นๆ
                      <div style={{ display: 'flex', gap: '8px' }}>
                         <button onClick={() => openApproveModal(p, req)} style={actionBtnStyle.approve}>✅ อนุมัติ</button>
                         <button onClick={() => openRejectModal(p, req)} style={actionBtnStyle.reject}>❌ ปฏิเสธ</button>
                      </div>
                    ) : (
                      // กรณีไม่มี Request (เพิ่มเอง/จัดการคน): โชว์แค่แถวแรก
                      isFirstRow && (
                        <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                           {!isHistory ? (
                             <>
                               <button onClick={() => openApproveModal(p)} style={actionBtnStyle.manualAdd}>🎓 เพิ่มเอง</button>
                               <button onClick={() => openRejectModal(p)} style={actionBtnStyle.manage}>⚙️ จัดการคน</button>
                             </>
                           ) : (
                              <button onClick={() => openApproveModal(p)} style={actionBtnStyle.manualAdd}>🎓 เพิ่มอบรม</button>
                           )}
                        </div>
                      )
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    )
  }

  // ... (ส่วน Logic ข้างบนเหมือนเดิม) ...

  return (
    // ✅ แก้ไขตรงนี้: เปลี่ยน maxWidth เป็น width: '100%'
    <div style={{ width: '100%', padding: '20px 40px', boxSizing: 'border-box', fontFamily: "'Sarabun', sans-serif" }}>
      
      <h2 style={{ color: '#333', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        🛡️ แดชบอร์ดเจ้าหน้าที่ความปลอดภัย
      </h2>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setViewMode('pending'); fetchPendingData(); }} style={{ ...tabBtnStyle, backgroundColor: viewMode === 'pending' ? '#007bff' : '#f8f9fa', color: viewMode === 'pending' ? 'white' : '#555', border: viewMode === 'pending' ? 'none' : '1px solid #ddd' }}>
            📝 งานรอตรวจสอบ ({pendingList.length})
          </button>
          <button onClick={() => { setViewMode('history'); fetchHistoryData(); }} style={{ ...tabBtnStyle, backgroundColor: viewMode === 'history' ? '#6c757d' : '#f8f9fa', color: viewMode === 'history' ? 'white' : '#555', border: viewMode === 'history' ? 'none' : '1px solid #ddd' }}>
            🔍 ประวัติ / ค้นหาข้อมูล
          </button>
        </div>
        <button onClick={() => setShowAddCourse(true)} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          ➕ เพิ่มหลักสูตรใหม่
        </button>
      </div>

      {viewMode === 'history' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', display: 'flex', gap: '15px', flexWrap: 'wrap', border: '1px solid #eee', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <input placeholder="ค้นชื่อพนักงาน..." value={searchFilters.name} onChange={e => setSearchFilters({...searchFilters, name: e.target.value})} style={searchInputStyle} />
          <input placeholder="ค้นชื่อบริษัท..." value={searchFilters.company} onChange={e => setSearchFilters({...searchFilters, company: e.target.value})} style={searchInputStyle} />
          <input placeholder="ค้นหลักสูตรที่อบรม..." value={searchFilters.course} onChange={e => setSearchFilters({...searchFilters, course: e.target.value})} style={searchInputStyle} />
        </div>
      )}

      {/* ตารางจะขยายเต็มจอตาม Container เองครับ */}
      {loading ? <p style={{textAlign:'center', color: '#666', marginTop: '40px'}}>⏳ กำลังโหลดข้อมูล...</p> : renderTable(viewMode === 'pending' ? pendingList : filteredHistory, viewMode === 'history')}

      {/* ... (ส่วน Modal ต่างๆ เหมือนเดิม ไม่ต้องแก้) ... */}
      {selectedPerson && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>🎓 บันทึกผลการอบรม</h3>
            <p>ให้คุณ: <strong>{selectedPerson.first_name} {selectedPerson.last_name}</strong></p>
            <form onSubmit={handleSaveTraining}>
              <label>เลือกหลักสูตร:</label>
              <select style={inputStyle} value={trainingForm.course_id} onChange={e => setTrainingForm({...trainingForm, course_id: e.target.value})} required>
                <option value="">-- กรุณาเลือก --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.course_name} ({c.validity_months} เดือน)</option>)}
              </select>
              <label>วันที่ผ่านการอบรม:</label>
              <input type="date" style={inputStyle} onChange={e => setTrainingForm({...trainingForm, completion_date: e.target.value})} required />
              <label>วันหมดอายุ:</label>
              <input type="date" style={inputStyle} value={trainingForm.expiry_date} onChange={e => setTrainingForm({...trainingForm, expiry_date: e.target.value})} />
              <div style={modalActionsStyle}>
                <button type="button" onClick={() => setSelectedPerson(null)} style={cancelBtnStyle}>ยกเลิก</button>
                <button type="submit" style={saveBtnStyle}>ยืนยันอนุมัติ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectData && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{color: '#dc3545'}}>🚫 {rejectData.request ? 'ปฏิเสธคำขอนี้' : 'ไม่อนุมัติพนักงาน'}</h3>
            <p>
               <strong>{rejectData.person.first_name}</strong> 
               {rejectData.request && <span> (หลักสูตร: {rejectData.request.training_courses?.course_name})</span>}
            </p>
            <form onSubmit={handleReject}>
              {!rejectData.request && (
                 <textarea rows="3" style={inputStyle} placeholder="ระบุเหตุผล (บังคับ)..." required value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              )}
              {rejectData.request && (
                 <p style={{color: '#666', fontSize: '0.9rem'}}>คุณแน่ใจหรือไม่ที่จะปฏิเสธคำขออบรมหลักสูตรนี้?</p>
              )}
              <div style={modalActionsStyle}>
                <button type="button" onClick={() => setRejectData(null)} style={cancelBtnStyle}>ยกเลิก</button>
                <button type="submit" style={{...saveBtnStyle, backgroundColor: '#dc3545'}}>ยืนยัน</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddCourse && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
             <h3>➕ เพิ่มหลักสูตรอบรมใหม่</h3>
             <form onSubmit={handleAddCourse}>
                <input type="text" style={inputStyle} placeholder="ชื่อหลักสูตร..." value={newCourse.name} onChange={e => setNewCourse({...newCourse, name: e.target.value})} required />
                <input type="number" style={inputStyle} placeholder="อายุใบเซอร์ (เดือน)" value={newCourse.months} onChange={e => setNewCourse({...newCourse, months: e.target.value})} required />
                <div style={modalActionsStyle}>
                   <button type="button" onClick={() => setShowAddCourse(false)} style={cancelBtnStyle}>ยกเลิก</button>
                   <button type="submit" style={saveBtnStyle}>บันทึก</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Styles
const thStyle = { padding: '15px', fontWeight: '600' }
const tdStyle = { padding: '15px', verticalAlign: 'middle', color: '#555' }
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }
const modalStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '450px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }
const inputStyle = { width: '100%', padding: '10px', margin: '5px 0 15px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '6px' }
const searchInputStyle = { padding: '10px 15px', border: '1px solid #ddd', borderRadius: '6px', minWidth: '220px', flex: 1, outline: 'none' }
const tabBtnStyle = { padding: '10px 25px', borderRadius: '30px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }
const saveBtnStyle = { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }
const cancelBtnStyle = { padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }
const modalActionsStyle = { marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }

// Custom Badge Styles
const statusBadgeStyle = {
  pending: { color: '#856404', backgroundColor: '#fff3cd', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' },
  active: { color: '#155724', backgroundColor: '#d4edda', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' },
  rejected: { color: '#721c24', backgroundColor: '#f8d7da', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }
}

const actionBtnStyle = {
  approve: { padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' },
  reject: { padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' },
  manualAdd: { padding: '6px 12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
  manage: { padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }
}