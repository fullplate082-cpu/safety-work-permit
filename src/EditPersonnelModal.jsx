// src/EditPersonnelModal.jsx
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function EditPersonnelModal({ personnel, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    national_id_or_passport: '',
    position: '',
    photo_url: ''
  })
  const [newPhoto, setNewPhoto] = useState(null)

  // ดึงข้อมูลเดิมมาใส่ในฟอร์มตอนเปิด Popup
  useEffect(() => {
    if (personnel) {
      setFormData({
        first_name: personnel.first_name || '',
        last_name: personnel.last_name || '',
        national_id_or_passport: personnel.national_id_or_passport || '',
        position: personnel.position || '', // ดึงตำแหน่งมาแสดง
        photo_url: personnel.photo_url || ''
      })
    }
  }, [personnel])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e) => {
    if (e.target.files[0]) setNewPhoto(e.target.files[0])
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let updatedPhotoUrl = formData.photo_url

      // 1. ถ้ามีการเปลี่ยนรูปใหม่ ให้อัปโหลดก่อน
      if (newPhoto) {
        const fileExt = newPhoto.name.split('.').pop()
        const fileName = `${Date.now()}_edit.${fileExt}`
        const filePath = `${personnel.company_id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('personnel-photos')
          .upload(filePath, newPhoto)

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('personnel-photos')
          .getPublicUrl(filePath)
        
        updatedPhotoUrl = data.publicUrl
      }

      // 2. อัปเดตข้อมูลลงฐานข้อมูล (UPDATE)
      const { error } = await supabase
        .from('personnel')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          national_id_or_passport: formData.national_id_or_passport,
          position: formData.position,
          photo_url: updatedPhotoUrl
        })
        .eq('id', personnel.id) // ✅ สำคัญมาก: ระบุว่าจะแก้ ID ไหน

      if (error) throw error

      alert('✅ แก้ไขข้อมูลเรียบร้อย!')
      onUpdate() // สั่งให้หน้าหลักโหลดข้อมูลใหม่
      onClose()  // ปิด Popup

    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3>✏️ แก้ไขข้อมูลพนักงาน</h3>
        
        <form onSubmit={handleSave}>
          <label>ชื่อจริง:</label>
          <input style={inputStyle} name="first_name" value={formData.first_name} onChange={handleChange} required />
          
          <label>นามสกุล:</label>
          <input style={inputStyle} name="last_name" value={formData.last_name} onChange={handleChange} required />

          <label>เลขบัตรฯ:</label>
          <input style={inputStyle} name="national_id_or_passport" value={formData.national_id_or_passport} onChange={handleChange} required />

          <label>ตำแหน่ง:</label>
          <input style={inputStyle} name="position" value={formData.position} onChange={handleChange} />

          <label>เปลี่ยนรูปโปรไฟล์:</label>
          <input type="file" onChange={handleFileChange} style={{marginTop: '5px'}} />
          
          <div style={{marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>ยกเลิก</button>
            <button type="submit" disabled={loading} style={saveBtnStyle}>
              {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Styles สำหรับ Modal
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
}
const modalStyle = {
  backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
}
const inputStyle = { width: '100%', padding: '8px', margin: '5px 0 10px', boxSizing: 'border-box' }
const saveBtnStyle = { padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
const cancelBtnStyle = { padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }