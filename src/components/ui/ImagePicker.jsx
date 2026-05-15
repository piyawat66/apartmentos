import { useRef, useState } from 'react'
import { Camera, FolderOpen, Trash2, Image } from 'lucide-react'

async function compressImage(file, maxPx = 800, quality = 0.72) {
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

export default function ImagePicker({ label, value, onChange, capture }) {
  const galleryRef = useRef(null)
  const cameraRef = useRef(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(file) {
    if (!file) return
    setLoading(true)
    try {
      const compressed = await compressImage(file)
      onChange(compressed)
    } catch {
      // silently ignore compression errors
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {label && <p className="text-xs font-medium text-gray-600 mb-1.5">{label}</p>}

      {value ? (
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group">
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400">
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">กำลังประมวลผล...</span>
            </div>
          ) : (
            <>
              <Image size={28} className="mb-2 opacity-40" />
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  <FolderOpen size={12} /> แกลอรี่
                </button>
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  <Camera size={12} /> ถ่ายรูป
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture={capture || 'environment'}
        className="hidden"
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }}
      />
    </div>
  )
}
