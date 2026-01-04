import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function AddPersonnel({ session, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [companyId, setCompanyId] = useState(null)

  // เพิ่ม State เก็บไฟล์รูปภาพ
  const [photoFile, setPhotoFile] = useState(null)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    national_id_or_passport: '',
    position: '',
    // photo_url ไม่ต้องกรอกเอง เดี๋ยวระบบจัดการให้
  })

  // 1. หา Company ID อัตโนมัติเมื่อเปิดหน้าเว็บ
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const { data: userRec } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', session.user.id)
          .single()

        if (userRec) {
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('user_id', userRec.id)
            .single()
          
          if (company) setCompanyId(company.id)
        }
      } catch (error) {
        console.error('Error fetching company:', error)
      }
    }
    fetchCompany()
  }, [session])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // 2. ฟังก์ชันจัดการเมื่อเลือกไฟล์รูป
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // เช็คขนาดไฟล์ (เช่น ห้ามเกิน 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('ขนาดไฟล์รูปภาพต้องไม่เกิน 2MB')
        return
      }
      setPhotoFile(file)
    }
  }

  // 3. ฟังก์ชันอัปโหลดรูปไป Supabase Storage
  const uploadPhoto = async () => {
    if (!photoFile) return null

    const fileExt = photoFile.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}` // ตั้งชื่อไฟล์ด้วยเวลา เพื่อไม่ให้ซ้ำ
    const filePath = `${fileName}`

    // อัปโหลดลง Bucket 'personnel-photos'
    const { error: uploadError } = await supabase.storage
      .from('personnel-photos')
      .upload(filePath, photoFile)

    if (uploadError) {
      throw uploadError
    }

    // ขอ URL ของรูปที่อัปโหลดเสร็จแล้ว
    const { data } = supabase.storage
      .from('personnel-photos')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')

    if (!companyId) {
      setMsg('❌ ไม่พบข้อมูลบริษัท กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
      return
    }

    try {
      let photoUrl = null

      // ขั้นตอนที่ A: อัปโหลดรูปก่อน (ถ้ามี)
      if (photoFile) {
        photoUrl = await uploadPhoto()
      }

      // ขั้นตอนที่ B: บันทึกข้อมูลพนักงานลงฐานข้อมูล
      const { error } = await supabase
        .from('personnel')
        .insert([
          {
            company_id: companyId,
            first_name: formData.first_name,
            last_name: formData.last_name,
            national_id_or_passport: formData.national_id_or_passport,
            position: formData.position,
            photo_url: photoUrl, // ใส่ลิงก์รูปที่ได้มา
            status: 'PENDING_ADMIN' // สถานะเริ่มต้น
          }
        ])

      if (error) throw error

      setMsg('✅ ลงทะเบียนสำเร็จ! กำลังรอตรวจสอบ')
      // ล้างค่าในฟอร์ม
      setFormData({ first_name: '', last_name: '', national_id_or_passport: '', position: '' })
      setPhotoFile(null)

    } catch (error) {
      setMsg('❌ เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
      <h3 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>📝 ลงทะเบียนพนักงานใหม่</h3>
      
      {msg && <div style={{ padding: '10px', marginBottom: '10px', backgroundColor: msg.includes('✅') ? '#d4edda' : '#f8d7da', color: msg.includes('✅') ? '#155724' : '#721c24', borderRadius: '4px' }}>{msg}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>ชื่อจริง:</label>
          <input 
            type="text" 
            name="first_name" 
            value={formData.first_name} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }} 
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>นามสกุล:</label>
          <input 
            type="text" 
            name="last_name" 
            value={formData.last_name} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }} 
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>เลขบัตรประชาชน / Passport:</label>
          <input 
            type="text" 
            name="national_id_or_passport" 
            value={formData.national_id_or_passport} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }} 
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>ตำแหน่งงาน:</label>
          <input 
            type="text" 
            name="position" 
            value={formData.position} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }} 
          />
        </div>

        {/* ส่วนอัปโหลดรูปภาพ */}
        <div style={{ marginBottom: '20px', padding: '15px', border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>📸 รูปถ่ายหน้าตรง (ถ้ามี):</label>
            <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                style={{ display: 'none' }} 
                id="photo-upload"
            />
            <label htmlFor="photo-upload" style={{ cursor: 'pointer', padding: '5px 10px', backgroundColor: '#e9ecef', borderRadius: '4px', border: '1px solid #ced4da' }}>
                {photoFile ? `📂 เลือกแล้ว: ${photoFile.name}` : 'คลิกเพื่อเลือกไฟล์รูปภาพ'}
            </label>
            {photoFile && <div style={{fontSize: '0.8rem', color: '#666', marginTop: '5px'}}>(ขนาด: {(photoFile.size / 1024 / 1024).toFixed(2)} MB)</div>}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
            <button 
                type="submit" 
                disabled={loading}
                style={{ flex: 1, padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
                {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
            <button 
                type="button" 
                onClick={onCancel}
                style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
                ยกเลิก / กลับ
            </button>
        </div>
      </form>
    </div>
  )
}