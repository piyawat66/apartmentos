import { useRef, useState } from 'react'
import { Camera, FolderOpen, Trash2, Images } from 'lucide-react'

async function compressImage(file, maxPx = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new window.Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round((height * maxPx) / width); width = maxPx }
          else { width = Math.round((width * maxPx) / height); height = maxPx }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function MultiImagePicker({ images = [], onChange, label, maxImages = 10 }) {
  const galleryRef = useRef(null)
  const cameraRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  async function handleFiles(files) {
    if (!files?.length) return
    const remaining = maxImages - images.length
    if (remaining <= 0) return
    setLoading(true)
    try {
      const compressed = await Promise.all(
        Array.from(files).slice(0, remaining).map(f => compressImage(f))
      )
      onChange([...images, ...compressed])
    } catch {
      // silently ignore compression errors
    } finally {
      setLoading(false)
    }
  }

  function remove(idx) {
    onChange(images.filter((_, i) => i !== idx))
  }

  const canAdd = images.length < maxImages && !loading

  return (
    <div>
      {label && <p className="text-xs font-medium text-gray-600 mb-2">{label}</p>}

      <div className="flex flex-wrap gap-2 items-start">
        {images.map((src, i) => (
          <div
            key={i}
            className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group shrink-0 cursor-pointer"
            onClick={() => setLightbox(src)}
          >
            <img src={src} alt={`receipt-${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); remove(i) }}
              className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
            >
              <Trash2 size={10} />
            </button>
            <span className="absolute bottom-1 left-1 text-[9px] bg-black/40 text-white rounded px-1 leading-tight">
              {i + 1}
            </span>
          </div>
        ))}

        {loading && (
          <div className="w-20 h-20 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {canAdd && (
          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-indigo-500 transition-colors px-1"
              title="เพิ่มจากไฟล์/แกลอรี่"
            >
              <FolderOpen size={17} />
              <span className="text-[10px] leading-tight">ไฟล์</span>
            </button>
            <div className="w-8 border-t border-gray-200" />
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-indigo-500 transition-colors px-1"
              title="ถ่ายรูป"
            >
              <Camera size={15} />
              <span className="text-[10px] leading-tight">ถ่าย</span>
            </button>
          </div>
        )}

        {images.length === 0 && !loading && !canAdd && null}
      </div>

      {images.length === 0 && !loading && (
        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
          <Images size={12} /> ยังไม่มีรูปใบเสร็จ — กดปุ่มด้านบนเพื่อเพิ่ม
        </p>
      )}

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="receipt"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
