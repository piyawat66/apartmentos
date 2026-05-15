// Mock data store — replaces Supabase for offline testing
// All data is stored in memory and persisted to localStorage

const STORAGE_KEY = 'apartmentos_data_v4'

function generateId() {
  return crypto.randomUUID()
}

const initialData = {
  properties: [],
  floors: [],
  rooms: [],
  guests: [],
  bookings: [],
  payments: [],
  contracts: [],
  monthly_invoices: [],
  meter_readings: [],
  expenses: [],
  housekeeping_logs: [],
  maintenance_requests: [],
  users: [
    { id: 'user-admin',       email: 'admin@demo.com',   password: 'admin123',   full_name: 'ผู้ดูแลระบบ',         role: 'admin' },
    { id: 'user-manager',     email: 'manager@demo.com', password: 'manager123', full_name: 'ผู้จัดการ',           role: 'manager' },
    { id: 'user-staff',       email: 'staff@demo.com',   password: 'staff123',   full_name: 'พนักงาน Front Desk',   role: 'staff' },
    { id: 'user-housekeeper', email: 'hk@demo.com',      password: 'hk123',      full_name: 'แม่บ้าน',             role: 'housekeeper' },
  ],
  user_properties: [],
}

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return JSON.parse(JSON.stringify(initialData))
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

let db = loadData()

export function resetData() {
  db = JSON.parse(JSON.stringify(initialData))
  saveData(db)
}

// Generic CRUD helpers
function getTable(table) {
  return db[table] || []
}

function filterBy(table, filters) {
  let rows = getTable(table)
  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== null) rows = rows.filter(r => r[key] === val)
  }
  return rows
}

function findById(table, id) {
  return getTable(table).find(r => r.id === id) || null
}

function insert(table, data) {
  if (!db[table]) db[table] = []
  const row = { id: generateId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data }
  db[table] = [...db[table], row]
  saveData(db)
  return row
}

function update(table, id, data) {
  db[table] = db[table].map(r => r.id === id ? { ...r, ...data, updated_at: new Date().toISOString() } : r)
  saveData(db)
  return findById(table, id)
}

function remove(table, id) {
  db[table] = db[table].filter(r => r.id !== id)
  saveData(db)
}

// ===== Seed Demo Data =====
export function seedDemoData() {
  db = JSON.parse(JSON.stringify(initialData))

  const pad = n => String(n).padStart(2, '0')

  // Property
  const prop = insert('properties', {
    name: 'บ้านสุขใจ อพาร์ทเมนต์',
    address: '99/5 ถ.รามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240',
    phone: '02-718-9900',
    settings: { currency: 'THB', timezone: 'Asia/Bangkok', checkin_time: '12:00', checkout_time: '11:00', water_rate: 18, electric_rate: 5 },
    is_active: true,
  })
  getTable('users').forEach(u => insert('user_properties', { user_id: u.id, property_id: prop.id, role: u.role }))

  // Floors
  const floors = [
    { name: 'ชั้น 1', floor_number: 1 },
    { name: 'ชั้น 2', floor_number: 2 },
    { name: 'ชั้น 3', floor_number: 3 },
  ].map(f => insert('floors', { ...f, property_id: prop.id }))

  // 18 rooms — 6 per floor
  const roomDefs = [
    { room_number: '101', room_type: 'fan',   base_price: 2800, amenities: ['wifi'],                                       fi: 0 },
    { room_number: '102', room_type: 'fan',   base_price: 3000, amenities: ['wifi', 'tv'],                                 fi: 0 },
    { room_number: '103', room_type: 'fan',   base_price: 3200, amenities: ['wifi', 'fridge'],                             fi: 0 },
    { room_number: '104', room_type: 'ac',    base_price: 4000, amenities: ['wifi', 'ac'],                                 fi: 0 },
    { room_number: '105', room_type: 'ac',    base_price: 4200, amenities: ['wifi', 'ac', 'tv'],                           fi: 0 },
    { room_number: '106', room_type: 'large', base_price: 5500, amenities: ['wifi', 'ac', 'tv', 'fridge'],                 fi: 0 },
    { room_number: '201', room_type: 'fan',   base_price: 2800, amenities: ['wifi'],                                       fi: 1 },
    { room_number: '202', room_type: 'fan',   base_price: 3000, amenities: ['wifi', 'tv'],                                 fi: 1 },
    { room_number: '203', room_type: 'ac',    base_price: 4000, amenities: ['wifi', 'ac'],                                 fi: 1 },
    { room_number: '204', room_type: 'ac',    base_price: 4200, amenities: ['wifi', 'ac', 'fridge'],                       fi: 1 },
    { room_number: '205', room_type: 'ac',    base_price: 4500, amenities: ['wifi', 'ac', 'tv', 'water_heater'],           fi: 1 },
    { room_number: '206', room_type: 'large', base_price: 5800, amenities: ['wifi', 'ac', 'tv', 'fridge', 'water_heater'],fi: 1 },
    { room_number: '301', room_type: 'ac',    base_price: 4500, amenities: ['wifi', 'ac', 'tv'],                           fi: 2 },
    { room_number: '302', room_type: 'ac',    base_price: 4500, amenities: ['wifi', 'ac', 'tv'],                           fi: 2 },
    { room_number: '303', room_type: 'ac',    base_price: 4800, amenities: ['wifi', 'ac', 'tv', 'fridge'],                 fi: 2 },
    { room_number: '304', room_type: 'ac',    base_price: 4800, amenities: ['wifi', 'ac', 'tv', 'water_heater'],           fi: 2 },
    { room_number: '305', room_type: 'large', base_price: 6000, amenities: ['wifi', 'ac', 'tv', 'fridge', 'water_heater'],fi: 2 },
    { room_number: '306', room_type: 'large', base_price: 6500, amenities: ['wifi', 'ac', 'tv', 'fridge', 'water_heater'],fi: 2 },
  ]
  const rooms = roomDefs.map(({ fi, ...def }) =>
    insert('rooms', { ...def, floor_id: floors[fi].id, property_id: prop.id, max_occupancy: def.room_type === 'large' ? 3 : 2, status: 'available', notes: '' })
  )

  // 14 guests with enhanced profiles (active tenants)
  const guestDefs = [
    { full_name: 'สมชาย ใจดี',         phone: '081-234-5678', id_card: '1-1001-00001-00-1', occupation: 'พนักงานบริษัท',     num_occupants: 1, emergency_contact_name: 'สมศรี ใจดี',     emergency_contact_phone: '082-111-2222', emergency_contact_relation: 'ภรรยา' },
    { full_name: 'สมหญิง รักดี',        phone: '082-345-6789', id_card: '1-1001-00002-00-2', occupation: 'ครู',               num_occupants: 2, emergency_contact_name: 'สมพงษ์ รักดี',   emergency_contact_phone: '083-222-3333', emergency_contact_relation: 'สามี' },
    { full_name: 'วิชัย พงษ์ศักดิ์',   phone: '083-456-7890', id_card: '1-1001-00003-00-3', occupation: 'ช่างเทคนิค',        num_occupants: 1, emergency_contact_name: 'วิไล พงษ์ศักดิ์', emergency_contact_phone: '084-333-4444', emergency_contact_relation: 'แม่' },
    { full_name: 'นงเยาว์ สุขสันต์',   phone: '084-567-8901', id_card: '1-1001-00004-00-4', occupation: 'นักศึกษา',          num_occupants: 1, emergency_contact_name: 'ยงยศ สุขสันต์',   emergency_contact_phone: '085-444-5555', emergency_contact_relation: 'พ่อ' },
    { full_name: 'ประยุทธ์ มั่งมี',    phone: '085-678-9012', id_card: '1-1001-00005-00-5', occupation: 'ค้าขาย',            num_occupants: 2, emergency_contact_name: 'ยุพา มั่งมี',     emergency_contact_phone: '086-555-6666', emergency_contact_relation: 'ภรรยา' },
    { full_name: 'กนกวรรณ ทองดี',      phone: '086-789-0123', id_card: '1-1001-00006-00-6', occupation: 'พยาบาล',            num_occupants: 1, emergency_contact_name: 'กนก ทองดี',       emergency_contact_phone: '087-666-7777', emergency_contact_relation: 'แม่' },
    { full_name: 'อนุวัฒน์ ศรีสุข',   phone: '087-890-1234', id_card: '1-1001-00007-00-7', occupation: 'โปรแกรมเมอร์',      num_occupants: 1, emergency_contact_name: 'อนุชา ศรีสุข',   emergency_contact_phone: '088-777-8888', emergency_contact_relation: 'พี่ชาย' },
    { full_name: 'มาลี วิไลพร',        phone: '088-901-2345', id_card: '1-1001-00008-00-8', occupation: 'แม่บ้าน',           num_occupants: 3, emergency_contact_name: 'มาโนช วิไลพร',   emergency_contact_phone: '089-888-9999', emergency_contact_relation: 'สามี' },
    { full_name: 'สุรชัย เจริญ',       phone: '089-012-3456', id_card: '1-1001-00009-00-9', occupation: 'ฝ่ายบัญชี',         num_occupants: 2, emergency_contact_name: 'สุรีย์ เจริญ',   emergency_contact_phone: '090-999-0000', emergency_contact_relation: 'ภรรยา' },
    { full_name: 'พิมพ์ใจ นาคสุข',    phone: '090-123-4567', id_card: '1-1001-00010-01-0', occupation: 'นักออกแบบ',         num_occupants: 1, emergency_contact_name: 'พิมพา นาคสุข',   emergency_contact_phone: '091-000-1111', emergency_contact_relation: 'พี่สาว' },
    { full_name: 'ธนากร ลาภทวี',      phone: '091-234-5678', id_card: '1-1001-00011-01-1', occupation: 'ช่างซ่อม',          num_occupants: 2, emergency_contact_name: 'ธนัช ลาภทวี',    emergency_contact_phone: '092-111-2222', emergency_contact_relation: 'พ่อ' },
    { full_name: 'จิราภา พึ่งพา',     phone: '092-345-6789', id_card: '1-1001-00012-01-2', occupation: 'เลขานุการ',         num_occupants: 1, emergency_contact_name: 'จิระ พึ่งพา',    emergency_contact_phone: '093-222-3333', emergency_contact_relation: 'พ่อ' },
    { full_name: 'เกรียงศักดิ์ บุญมา', phone: '093-456-7890', id_card: '1-1001-00013-01-3', occupation: 'ผู้รับเหมา',       num_occupants: 2, emergency_contact_name: 'เกษม บุญมา',     emergency_contact_phone: '094-333-4444', emergency_contact_relation: 'พ่อ' },
    { full_name: 'ลัดดา วงษ์ศรี',     phone: '094-567-8901', id_card: '1-1001-00014-01-4', occupation: 'นักเรียน',          num_occupants: 1, emergency_contact_name: 'ลา วงษ์ศรี',     emergency_contact_phone: '095-444-5555', emergency_contact_relation: 'แม่' },
    // extra guests (not in contracts but in the system)
    { full_name: 'นพดล คงสุข',        phone: '095-678-9012', id_card: '', occupation: '', num_occupants: 1, emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '' },
    { full_name: 'สุดาพร เพ็ชรรัตน์', phone: '096-789-0123', id_card: '', occupation: '', num_occupants: 1, emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '' },
    { full_name: 'รัชนี ดวงแก้ว',    phone: '097-890-1234', id_card: '', occupation: '', num_occupants: 1, emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '' },
    { full_name: 'ชาญชัย ประดิษฐ์',   phone: '098-901-2345', id_card: '', occupation: '', num_occupants: 1, emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '' },
  ]
  const guests = guestDefs.map(g => insert('guests', { ...g, property_id: prop.id, is_blacklisted: false, photo_url: null, id_card_url: null, notes: '' }))

  // 14 active contracts  (rIdx=room index, gIdx=guest index, start year/month)
  const contractDefs = [
    { rIdx: 0,  gIdx: 0,  sy: 2025, sm: 6  },   // 101 สมชาย
    { rIdx: 1,  gIdx: 1,  sy: 2025, sm: 6  },   // 102 สมหญิง
    { rIdx: 2,  gIdx: 2,  sy: 2026, sm: 3  },   // 103 วิชัย (เช่าใหม่)
    { rIdx: 3,  gIdx: 3,  sy: 2026, sm: 2  },   // 104 นงเยาว์
    { rIdx: 4,  gIdx: 4,  sy: 2025, sm: 6  },   // 105 ประยุทธ์
    { rIdx: 5,  gIdx: 5,  sy: 2025, sm: 7  },   // 106 กนกวรรณ
    { rIdx: 7,  gIdx: 6,  sy: 2025, sm: 8  },   // 202 อนุวัฒน์
    { rIdx: 8,  gIdx: 7,  sy: 2025, sm: 9  },   // 203 มาลี
    { rIdx: 9,  gIdx: 8,  sy: 2025, sm: 6  },   // 204 สุรชัย
    { rIdx: 10, gIdx: 9,  sy: 2025, sm: 10 },   // 205 พิมพ์ใจ
    { rIdx: 11, gIdx: 10, sy: 2025, sm: 7  },   // 206 ธนากร
    { rIdx: 12, gIdx: 11, sy: 2025, sm: 6  },   // 301 จิราภา
    { rIdx: 13, gIdx: 12, sy: 2025, sm: 6  },   // 302 เกรียงศักดิ์
    { rIdx: 16, gIdx: 13, sy: 2026, sm: 1  },   // 305 ลัดดา
  ]

  const methods = ['cash', 'transfer', 'transfer', 'cash', 'transfer', 'cash']

  // helper: months from start to May 2026
  function monthRange(sy, sm) {
    const result = []
    let y = sy, m = sm
    while (y < 2026 || (y === 2026 && m <= 5)) {
      result.push({ y, m })
      m++; if (m > 12) { m = 1; y++ }
    }
    return result
  }

  // Water/electric usage per contract (deterministic)
  function waterUnits(ci) { return 8 + (ci % 14) }          // 8–21 units
  function elecUnits(ci)  { return 70 + (ci % 80) }         // 70–149 units
  function waterBase(ci)  { return 1000 + ci * 250 }
  function elecBase(ci)   { return 5000 + ci * 600 }

  contractDefs.forEach((def, ci) => {
    const room = rooms[def.rIdx]
    const guest = guests[def.gIdx]
    const months = monthRange(def.sy, def.sm)
    const startDate = `${def.sy}-${pad(def.sm)}-01`

    const contract = insert('contracts', {
      property_id: prop.id,
      room_id: room.id,
      guest_id: guest.id,
      start_date: startDate,
      end_date: null,
      monthly_rent: room.base_price,
      deposit_amount: room.base_price,
      deposit_paid: true,
      water_rate: 18,
      electric_rate: 5,
      status: 'active',
      notes: '',
      created_by: 'user-admin',
    })

    const wUnits = waterUnits(ci)
    const eUnits = elecUnits(ci)
    const wBase  = waterBase(ci)
    const eBase  = elecBase(ci)

    months.forEach(({ y, m }, monthIdx) => {
      const isMay2026 = y === 2026 && m === 5
      const isPaid = !isMay2026 || ci % 2 === 0  // half of May 2026 invoices are paid

      const wAmt = wUnits * 18
      const eAmt = eUnits * 5
      const total = room.base_price + wAmt + eAmt
      const dueDate = `${y}-${pad(m)}-05`
      const paidAt = `${y}-${pad(m)}-${pad(3 + (ci % 5))}T08:30:00.000Z`

      const inv = insert('monthly_invoices', {
        property_id: prop.id,
        contract_id: contract.id,
        room_id: room.id,
        guest_id: guest.id,
        year: y,
        month: m,
        due_date: dueDate,
        rent_amount: room.base_price,
        water_units: wUnits,
        water_amount: wAmt,
        electric_units: eUnits,
        electric_amount: eAmt,
        other_amount: 0,
        other_label: '',
        total_amount: total,
        status: isPaid ? 'paid' : 'pending',
        paid_at: isPaid ? paidAt : null,
        paid_amount: isPaid ? total : 0,
        payment_method: isPaid ? methods[ci % methods.length] : '',
        slip_url: null,
        note: '',
      })

      if (isPaid) {
        insert('payments', {
          booking_id: null,
          invoice_id: inv.id,
          property_id: prop.id,
          amount: total,
          payment_method: methods[ci % methods.length],
          payment_type: 'rent',
          slip_url: null,
          paid_at: paidAt,
          note: `ค่าเช่าเดือน ${m}/${y}`,
          created_by: 'user-admin',
        })
      }

      // Meter readings for last 4 months (Feb–May 2026)
      if ((y === 2026 && m >= 2) || (y === 2026 && m === 5)) {
        const offset = monthIdx  // cumulative month count
        insert('meter_readings', {
          property_id: prop.id,
          contract_id: contract.id,
          room_id: room.id,
          year: y,
          month: m,
          water_prev: wBase + (offset - 1) * wUnits,
          water_curr: wBase + offset * wUnits,
          electric_prev: eBase + (offset - 1) * eUnits,
          electric_curr: eBase + offset * eUnits,
          water_image_url: null,
          electric_image_url: null,
        })
      }
    })

    update('rooms', room.id, { status: 'occupied' })
  })

  // Ended contract (ห้อง303 เคยเช่า)
  const endedContract = insert('contracts', {
    property_id: prop.id,
    room_id: rooms[14].id,  // 303
    guest_id: guests[14].id,
    start_date: '2025-06-01',
    end_date: '2026-04-30',
    monthly_rent: 4800,
    deposit_amount: 4800,
    deposit_paid: true,
    water_rate: 18,
    electric_rate: 5,
    status: 'ended',
    notes: 'ย้ายออกปลายเมษา',
    created_by: 'user-admin',
  })
  // Invoice for ended contract (Jan–Apr 2026, all paid)
  ;[1, 2, 3, 4].forEach(m => {
    const paidAt = `2026-${pad(m)}-04T09:00:00.000Z`
    const total = 4800 + 12 * 18 + 100 * 5
    insert('monthly_invoices', {
      property_id: prop.id,
      contract_id: endedContract.id,
      room_id: rooms[14].id,
      guest_id: guests[14].id,
      year: 2026, month: m,
      due_date: `2026-${pad(m)}-05`,
      rent_amount: 4800, water_units: 12, water_amount: 216,
      electric_units: 100, electric_amount: 500,
      other_amount: 0, other_label: '',
      total_amount: total,
      status: 'paid', paid_at: paidAt, paid_amount: total,
      payment_method: 'transfer', slip_url: null, note: '',
    })
    insert('payments', {
      booking_id: null, invoice_id: endedContract.id,
      property_id: prop.id, amount: total,
      payment_method: 'transfer', payment_type: 'rent',
      slip_url: null, paid_at: paidAt,
      note: `ค่าเช่าเดือน ${m}/2026`,
      created_by: 'user-admin',
    })
  })

  // Room statuses
  update('rooms', rooms[6].id,  { status: 'maintenance' })  // 201
  update('rooms', rooms[14].id, { status: 'dirty' })         // 303 (หลัง ended contract)
  update('rooms', rooms[15].id, { status: 'maintenance' })  // 304
  update('rooms', rooms[17].id, { status: 'dirty' })         // 306

  // Expenses
  ;[
    { title: 'ค่าน้ำประปาส่วนกลาง',      amount: 2400, category: 'utilities', paid_at: '2026-05-05T09:00:00.000Z', note: 'ค่าน้ำประปาเดือนพ.ค.' },
    { title: 'ค่าไฟฟ้าส่วนกลาง',         amount: 860,  category: 'utilities', paid_at: '2026-05-05T09:30:00.000Z', note: 'ไฟทางเดิน/ส่วนกลาง' },
    { title: 'ซื้ออุปกรณ์ทำความสะอาด',   amount: 380,  category: 'supplies',  paid_at: '2026-04-12T10:00:00.000Z', note: 'น้ำยา, ไม้กวาด' },
    { title: 'ค่าซ่อมท่อน้ำส่วนกลาง',   amount: 1800, category: 'repair',    paid_at: '2026-03-20T14:00:00.000Z', note: 'ช่าง 1 คน ค่าอะไหล่รวม' },
    { title: 'ค่าสีทาผนังห้องโถง',       amount: 3200, category: 'repair',    paid_at: '2026-02-10T09:00:00.000Z', note: 'ทาสีใหม่ชั้น 1' },
    { title: 'ค่าน้ำประปาส่วนกลาง',      amount: 2200, category: 'utilities', paid_at: '2026-04-05T09:00:00.000Z', note: 'ค่าน้ำประปาเดือนเม.ย.' },
  ].forEach(e => insert('expenses', { ...e, property_id: prop.id, image_url: null, created_by: 'user-admin' }))

  // Housekeeping
  ;[
    { rIdx: 14, status: 'pending',     notes: 'รอทำความสะอาดหลัง check-out ห้อง 303', completed: null },
    { rIdx: 17, status: 'in_progress', notes: 'กำลังทำความสะอาดห้อง 306',              completed: null },
    { rIdx: 2,  status: 'done',        notes: '',                                       completed: '2026-05-01T14:00:00.000Z' },
    { rIdx: 6,  status: 'done',        notes: '',                                       completed: '2026-04-01T15:00:00.000Z' },
  ].forEach(h => insert('housekeeping_logs', {
    room_id: rooms[h.rIdx].id, assigned_to: 'user-housekeeper',
    status: h.status, notes: h.notes, completed_at: h.completed,
  }))

  // Maintenance
  ;[
    { rIdx: 15, title: 'แอร์ไม่เย็น',          priority: 'high',   status: 'in_progress', cost: null, resolved: null },
    { rIdx: 6,  title: 'ประตูล็อคไม่ได้',       priority: 'urgent', status: 'open',        cost: null, resolved: null },
    { rIdx: 3,  title: 'ก๊อกน้ำรั่ว',           priority: 'medium', status: 'resolved',    cost: 350,  resolved: '2026-04-15T10:00:00.000Z' },
    { rIdx: 9,  title: 'เครื่องทำน้ำอุ่นเสีย', priority: 'high',   status: 'resolved',    cost: 2800, resolved: '2026-03-10T10:00:00.000Z' },
    { rIdx: 1,  title: 'พัดลมมีเสียงดัง',       priority: 'low',    status: 'resolved',    cost: 200,  resolved: '2026-02-25T10:00:00.000Z' },
    { rIdx: 10, title: 'ท่อน้ำอุดตัน',          priority: 'medium', status: 'resolved',    cost: 800,  resolved: '2025-11-05T10:00:00.000Z' },
  ].forEach(m => insert('maintenance_requests', {
    room_id: rooms[m.rIdx].id, property_id: prop.id,
    title: m.title, description: '', priority: m.priority,
    status: m.status, resolved_at: m.resolved, cost: m.cost,
  }))

  // 2 nightly bookings (for demo of Bookings page)
  ;[
    { rIdx: 6, gIdx: 15, ci: '2026-05-16', co: '2026-05-18', amt: 1600, status: 'reserved' },
    { rIdx: 14, gIdx: 16, ci: '2026-05-20', co: '2026-05-22', amt: 2400, status: 'reserved' },
  ].forEach(b => {
    insert('bookings', {
      property_id: prop.id,
      room_id: rooms[b.rIdx].id,
      guest_id: guests[b.gIdx].id,
      booking_type: 'nightly',
      check_in_date: b.ci,
      check_out_date: b.co,
      actual_check_in: null,
      actual_check_out: null,
      status: b.status,
      total_amount: b.amt,
      deposit_amount: b.amt / 2,
      notes: '',
      created_by: 'user-admin',
    })
  })

  saveData(db)
}

// ===== Properties =====
export const propertiesService = {
  getAll: () => filterBy('properties', { is_active: true }),
  getById: (id) => findById('properties', id),
  getUserProperties: (userId) => {
    const user = findById('users', userId)
    if (user?.role === 'admin') {
      return filterBy('properties', { is_active: true }).map(p => ({ ...p, role: 'admin' }))
    }
    const ups = filterBy('user_properties', { user_id: userId })
    return ups.map(up => ({ ...findById('properties', up.property_id), role: up.role })).filter(Boolean)
  },
  create: (data) => {
    const prop = insert('properties', { ...data, is_active: true })
    getTable('users').forEach(u => insert('user_properties', { user_id: u.id, property_id: prop.id, role: u.role }))
    return prop
  },
  update: (id, data) => update('properties', id, data),
  delete: (id) => update('properties', id, { is_active: false }),
}

// ===== Floors =====
export const floorsService = {
  getByProperty: (propertyId) => filterBy('floors', { property_id: propertyId }).sort((a, b) => a.floor_number - b.floor_number),
  getById: (id) => findById('floors', id),
  create: (data) => insert('floors', data),
  update: (id, data) => update('floors', id, data),
  delete: (id) => remove('floors', id),
}

// ===== Rooms =====
export const roomsService = {
  getByProperty: (propertyId) => filterBy('rooms', { property_id: propertyId }),
  getByFloor: (floorId) => filterBy('rooms', { floor_id: floorId }),
  getById: (id) => findById('rooms', id),
  create: (data) => insert('rooms', data),
  bulkCreate: (rooms) => rooms.map(r => insert('rooms', r)),
  update: (id, data) => update('rooms', id, data),
  updateStatus: (id, status) => update('rooms', id, { status }),
  delete: (id) => remove('rooms', id),
}

// ===== Guests =====
export const guestsService = {
  getByProperty: (propertyId) => filterBy('guests', { property_id: propertyId }),
  getById: (id) => findById('guests', id),
  search: (propertyId, query) => {
    const q = query.toLowerCase()
    return filterBy('guests', { property_id: propertyId }).filter(g =>
      g.full_name.toLowerCase().includes(q) || (g.phone || '').includes(q)
    )
  },
  create: (data) => insert('guests', data),
  update: (id, data) => update('guests', id, data),
  setBlacklist: (id, isBlacklisted) => update('guests', id, { is_blacklisted: isBlacklisted }),
}

// ===== Contracts =====
export const contractsService = {
  getByProperty: (propertyId) => filterBy('contracts', { property_id: propertyId }),
  getActive: (propertyId) => filterBy('contracts', { property_id: propertyId, status: 'active' }),
  getByRoom: (roomId) => filterBy('contracts', { room_id: roomId }),
  getByGuest: (guestId) => filterBy('contracts', { guest_id: guestId }),
  getById: (id) => findById('contracts', id),
  create: (data) => {
    const contract = insert('contracts', { ...data, status: 'active' })
    roomsService.updateStatus(data.room_id, 'occupied')
    return contract
  },
  update: (id, data) => update('contracts', id, data),
  end: (id) => {
    const now = new Date().toISOString().split('T')[0]
    const contract = update('contracts', id, { status: 'ended', end_date: now })
    roomsService.updateStatus(contract.room_id, 'dirty')
    return contract
  },
}

// ===== Monthly Invoices =====
export const invoicesService = {
  getByProperty: (propertyId) => filterBy('monthly_invoices', { property_id: propertyId }),
  getByContract: (contractId) => filterBy('monthly_invoices', { contract_id: contractId })
    .sort((a, b) => b.year - a.year || b.month - a.month),
  getByMonth: (propertyId, year, month) =>
    filterBy('monthly_invoices', { property_id: propertyId, year, month }),
  generateForContract: (contractId, year, month) => {
    const contract = findById('contracts', contractId)
    if (!contract || contract.status !== 'active') return null
    const existing = filterBy('monthly_invoices', { contract_id: contractId, year, month })
    if (existing.length > 0) return existing[0]
    const pad = n => String(n).padStart(2, '0')
    return insert('monthly_invoices', {
      property_id: contract.property_id,
      contract_id: contractId,
      room_id: contract.room_id,
      guest_id: contract.guest_id,
      year, month,
      due_date: `${year}-${pad(month)}-05`,
      rent_amount: contract.monthly_rent,
      water_units: 0, water_amount: 0,
      electric_units: 0, electric_amount: 0,
      other_amount: 0, other_label: '',
      total_amount: contract.monthly_rent,
      status: 'pending',
      paid_at: null, paid_amount: 0, payment_method: '', slip_url: null, note: '',
    })
  },
  generateAllForMonth: (propertyId, year, month) => {
    const contracts = filterBy('contracts', { property_id: propertyId, status: 'active' })
    return contracts.map(c => invoicesService.generateForContract(c.id, year, month))
  },
  markPaid: (id, payData) => {
    const inv = update('monthly_invoices', id, {
      status: 'paid',
      paid_at: payData.paid_at || new Date().toISOString(),
      paid_amount: payData.paid_amount,
      payment_method: payData.payment_method,
      slip_url: payData.slip_url || null,
      note: payData.note || '',
    })
    insert('payments', {
      booking_id: null,
      invoice_id: id,
      property_id: inv.property_id,
      amount: payData.paid_amount,
      payment_method: payData.payment_method,
      payment_type: 'rent',
      slip_url: payData.slip_url || null,
      paid_at: payData.paid_at || new Date().toISOString(),
      note: payData.note || '',
      created_by: 'user-admin',
    })
    return inv
  },
  update: (id, data) => {
    const inv = update('monthly_invoices', id, data)
    // Recalculate total
    const updated = findById('monthly_invoices', id)
    if (updated) {
      const total = (updated.rent_amount || 0) + (updated.water_amount || 0) + (updated.electric_amount || 0) + (updated.other_amount || 0)
      update('monthly_invoices', id, { total_amount: total })
    }
    return inv
  },
}

// ===== Meter Readings =====
export const meterReadingsService = {
  getByContract: (contractId) =>
    filterBy('meter_readings', { contract_id: contractId })
      .sort((a, b) => b.year - a.year || b.month - a.month),
  getByMonth: (propertyId, year, month) =>
    filterBy('meter_readings', { property_id: propertyId, year, month }),
  getByContractMonth: (contractId, year, month) =>
    filterBy('meter_readings', { contract_id: contractId, year, month })[0] || null,
  save: (data) => {
    const existing = filterBy('meter_readings', { contract_id: data.contract_id, year: data.year, month: data.month })
    let reading
    if (existing.length > 0) {
      reading = update('meter_readings', existing[0].id, data)
    } else {
      reading = insert('meter_readings', data)
    }
    // Update invoice water/electric amounts
    const contract = findById('contracts', data.contract_id)
    const invoices = filterBy('monthly_invoices', { contract_id: data.contract_id, year: data.year, month: data.month })
    if (contract && invoices.length > 0) {
      const inv = invoices[0]
      const wUnits = Math.max(0, (data.water_curr || 0) - (data.water_prev || 0))
      const eUnits = Math.max(0, (data.electric_curr || 0) - (data.electric_prev || 0))
      const wAmt = wUnits * (contract.water_rate || 18)
      const eAmt = eUnits * (contract.electric_rate || 5)
      const total = inv.rent_amount + wAmt + eAmt + (inv.other_amount || 0)
      update('monthly_invoices', inv.id, {
        water_units: wUnits, water_amount: wAmt,
        electric_units: eUnits, electric_amount: eAmt,
        total_amount: total,
      })
    }
    return reading
  },
}

// ===== Expenses =====
export const expensesService = {
  getByProperty: (propertyId) =>
    filterBy('expenses', { property_id: propertyId })
      .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at)),
  getById: (id) => findById('expenses', id),
  create: (data) => insert('expenses', data),
  update: (id, data) => update('expenses', id, data),
  delete: (id) => remove('expenses', id),
}

// ===== Bookings (secondary — nightly stays) =====
export const bookingsService = {
  getByProperty: (propertyId) => filterBy('bookings', { property_id: propertyId }),
  getById: (id) => findById('bookings', id),
  getByRoom: (roomId) => filterBy('bookings', { room_id: roomId }),
  getActive: (propertyId) => filterBy('bookings', { property_id: propertyId }).filter(b =>
    ['reserved', 'checked_in'].includes(b.status)
  ),
  getTodayCheckins: (propertyId) => {
    const today = new Date().toISOString().split('T')[0]
    return filterBy('bookings', { property_id: propertyId }).filter(b =>
      b.check_in_date === today && b.status === 'reserved'
    )
  },
  getTodayCheckouts: (propertyId) => {
    const today = new Date().toISOString().split('T')[0]
    return filterBy('bookings', { property_id: propertyId }).filter(b =>
      b.check_out_date === today && b.status === 'checked_in'
    )
  },
  create: (data) => insert('bookings', data),
  update: (id, data) => update('bookings', id, data),
  checkIn: (id) => {
    const booking = update('bookings', id, { status: 'checked_in', actual_check_in: new Date().toISOString() })
    roomsService.updateStatus(booking.room_id, 'occupied')
    return booking
  },
  checkOut: (id) => {
    const booking = update('bookings', id, { status: 'checked_out', actual_check_out: new Date().toISOString() })
    roomsService.updateStatus(booking.room_id, 'dirty')
    return booking
  },
  cancel: (id) => {
    const booking = findById('bookings', id)
    const updated = update('bookings', id, { status: 'cancelled' })
    if (booking && booking.status === 'reserved') {
      roomsService.updateStatus(booking.room_id, 'available')
    }
    return updated
  },
}

// ===== Payments (revenue tracking) =====
export const paymentsService = {
  getByBooking: (bookingId) => filterBy('payments', { booking_id: bookingId }),
  getByProperty: (propertyId) => filterBy('payments', { property_id: propertyId }),
  create: (data) => insert('payments', data),
  getMonthlyRevenue: (propertyId, year, month) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return filterBy('payments', { property_id: propertyId })
      .filter(p => (p.paid_at || '').startsWith(prefix))
      .reduce((sum, p) => sum + p.amount, 0)
  },
  getRevenueByMonth: (propertyId, months = 6) => {
    const result = []
    const now = new Date()
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const prefix = `${year}-${String(month).padStart(2, '0')}`
      const total = filterBy('payments', { property_id: propertyId })
        .filter(p => (p.paid_at || '').startsWith(prefix))
        .reduce((sum, p) => sum + p.amount, 0)
      result.push({ month: `${month}/${year}`, total, year, monthNum: month })
    }
    return result
  },
}

// ===== Housekeeping =====
export const housekeepingService = {
  getByProperty: (propertyId) => {
    const propertyRooms = roomsService.getByProperty(propertyId).map(r => r.id)
    return filterBy('housekeeping_logs', {}).filter(h => propertyRooms.includes(h.room_id))
  },
  create: (data) => insert('housekeeping_logs', data),
  update: (id, data) => update('housekeeping_logs', id, data),
  complete: (id) => update('housekeeping_logs', id, { status: 'done', completed_at: new Date().toISOString() }),
}

// ===== Maintenance =====
export const maintenanceService = {
  getByProperty: (propertyId) => filterBy('maintenance_requests', { property_id: propertyId }),
  getById: (id) => findById('maintenance_requests', id),
  create: (data) => insert('maintenance_requests', data),
  update: (id, data) => update('maintenance_requests', id, data),
  resolve: (id, cost) => {
    const req = update('maintenance_requests', id, { status: 'resolved', resolved_at: new Date().toISOString(), cost })
    roomsService.updateStatus(req.room_id, 'available')
    return req
  },
}

// ===== Auth =====
export const authService = {
  login: (email, password) => {
    const user = getTable('users').find(u => u.email === email && u.password === password)
    if (!user) return { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
    const { password: _, ...safeUser } = user
    return { user: safeUser }
  },
  getUser: (id) => {
    const user = findById('users', id)
    if (!user) return null
    const { password: _, ...safeUser } = user
    return safeUser
  },
}
