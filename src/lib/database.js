// Supabase data services — drop-in replacement for mockData.js
import { supabase } from './supabase'

// ─── helpers ────────────────────────────────────────────────────────────────

async function q(builder) {
  const { data, error } = await builder
  if (error) throw error
  return data ?? []
}

async function q1(builder) {
  const { data, error } = await builder.maybeSingle()
  if (error) throw error
  return data
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// ─── Properties ─────────────────────────────────────────────────────────────

export const propertiesService = {
  getAll: () =>
    q(supabase.from('properties').select('*').eq('is_active', true).order('name')),

  getById: (id) =>
    q1(supabase.from('properties').select('*').eq('id', id)),

  getUserProperties: async (userId) => {
    const profile = await q1(supabase.from('profiles').select('role').eq('id', userId))
    if (profile?.role === 'admin') {
      const props = await q(supabase.from('properties').select('*').eq('is_active', true).order('name'))
      return props.map(p => ({ ...p, role: 'admin' }))
    }
    const rows = await q(
      supabase.from('user_properties')
        .select('role, properties(*)')
        .eq('user_id', userId)
    )
    return rows
      .map(r => ({ ...r.properties, role: r.role }))
      .filter(p => p?.id && p?.is_active)
  },

  create: async (data) => {
    const rows = await q(supabase.from('properties').insert({ ...data, is_active: true }).select())
    const prop = rows[0]
    // Auto-assign all existing users to the new property
    const users = await q(supabase.from('profiles').select('id, role'))
    if (users.length > 0) {
      await q(supabase.from('user_properties').insert(
        users.map(u => ({ user_id: u.id, property_id: prop.id, role: u.role }))
      ).select())
    }
    return prop
  },

  update: async (id, data) => {
    const rows = await q(supabase.from('properties').update(data).eq('id', id).select())
    return rows[0]
  },

  delete: (id) =>
    q(supabase.from('properties').update({ is_active: false }).eq('id', id)),
}

// ─── Floors ──────────────────────────────────────────────────────────────────

export const floorsService = {
  getByProperty: (propertyId) =>
    q(supabase.from('floors').select('*').eq('property_id', propertyId).order('floor_number')),

  getById: (id) =>
    q1(supabase.from('floors').select('*').eq('id', id)),

  create: async (data) => {
    const rows = await q(supabase.from('floors').insert(data).select())
    return rows[0]
  },

  update: async (id, data) => {
    const rows = await q(supabase.from('floors').update(data).eq('id', id).select())
    return rows[0]
  },

  delete: (id) =>
    q(supabase.from('floors').delete().eq('id', id)),
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

export const roomsService = {
  getByProperty: (propertyId) =>
    q(supabase.from('rooms').select('*').eq('property_id', propertyId)),

  getByFloor: (floorId) =>
    q(supabase.from('rooms').select('*').eq('floor_id', floorId)),

  getById: (id) =>
    q1(supabase.from('rooms').select('*').eq('id', id)),

  create: async (data) => {
    const rows = await q(supabase.from('rooms').insert(data).select())
    return rows[0]
  },

  bulkCreate: async (rooms) =>
    q(supabase.from('rooms').insert(rooms).select()),

  update: async (id, data) => {
    const rows = await q(supabase.from('rooms').update(data).eq('id', id).select())
    return rows[0]
  },

  updateStatus: async (id, status) => {
    const rows = await q(supabase.from('rooms').update({ status }).eq('id', id).select())
    return rows[0]
  },

  delete: (id) =>
    q(supabase.from('rooms').delete().eq('id', id)),
}

// ─── Guests ──────────────────────────────────────────────────────────────────

export const guestsService = {
  getByProperty: (propertyId) =>
    q(supabase.from('guests').select('*').eq('property_id', propertyId).order('full_name')),

  getById: (id) =>
    q1(supabase.from('guests').select('*').eq('id', id)),

  search: async (propertyId, query) => {
    const all = await q(supabase.from('guests').select('*').eq('property_id', propertyId))
    const q_lower = query.toLowerCase()
    return all.filter(g =>
      g.full_name.toLowerCase().includes(q_lower) ||
      (g.phone || '').replace(/-/g, '').includes(q_lower.replace(/-/g, ''))
    )
  },

  create: async (data) => {
    const rows = await q(supabase.from('guests').insert(data).select())
    return rows[0]
  },

  update: async (id, data) => {
    const rows = await q(supabase.from('guests').update(data).eq('id', id).select())
    return rows[0]
  },

  setBlacklist: async (id, isBlacklisted) => {
    const rows = await q(supabase.from('guests').update({ is_blacklisted: isBlacklisted }).eq('id', id).select())
    return rows[0]
  },
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export const contractsService = {
  getByProperty: (propertyId) =>
    q(supabase.from('contracts').select('*').eq('property_id', propertyId).order('created_at', { ascending: false })),

  getActive: (propertyId) =>
    q(supabase.from('contracts').select('*').eq('property_id', propertyId).eq('status', 'active')),

  getByRoom: (roomId) =>
    q(supabase.from('contracts').select('*').eq('room_id', roomId)),

  getByGuest: (guestId) =>
    q(supabase.from('contracts').select('*').eq('guest_id', guestId)),

  getById: (id) =>
    q1(supabase.from('contracts').select('*').eq('id', id)),

  create: async (data) => {
    const uid = await currentUserId()
    const rows = await q(
      supabase.from('contracts').insert({ ...data, status: 'active', created_by: uid }).select()
    )
    const contract = rows[0]
    await q(supabase.from('rooms').update({ status: 'occupied' }).eq('id', data.room_id))
    return contract
  },

  update: async (id, data) => {
    const rows = await q(supabase.from('contracts').update(data).eq('id', id).select())
    return rows[0]
  },

  end: async (id) => {
    const today = new Date().toISOString().split('T')[0]
    const rows = await q(
      supabase.from('contracts').update({ status: 'ended', end_date: today }).eq('id', id).select()
    )
    const contract = rows[0]
    await q(supabase.from('rooms').update({ status: 'dirty' }).eq('id', contract.room_id))
    return contract
  },
}

// ─── Monthly Invoices ────────────────────────────────────────────────────────

export const invoicesService = {
  getByProperty: (propertyId) =>
    q(supabase.from('monthly_invoices').select('*').eq('property_id', propertyId)),

  getByContract: (contractId) =>
    q(supabase.from('monthly_invoices').select('*').eq('contract_id', contractId)
      .order('year', { ascending: false }).order('month', { ascending: false })),

  getByMonth: (propertyId, year, month) =>
    q(supabase.from('monthly_invoices').select('*')
      .eq('property_id', propertyId).eq('year', year).eq('month', month)),

  generateForContract: async (contractId, year, month) => {
    const contract = await q1(
      supabase.from('contracts').select('*').eq('id', contractId).eq('status', 'active')
    )
    if (!contract) return null

    // Return existing if already generated
    const existing = await q1(
      supabase.from('monthly_invoices').select('*')
        .eq('contract_id', contractId).eq('year', year).eq('month', month)
    )
    if (existing) return existing

    const pad = n => String(n).padStart(2, '0')
    const rows = await q(
      supabase.from('monthly_invoices').insert({
        property_id:     contract.property_id,
        contract_id:     contractId,
        room_id:         contract.room_id,
        guest_id:        contract.guest_id,
        year, month,
        due_date:        `${year}-${pad(month)}-05`,
        rent_amount:     contract.monthly_rent,
        water_units:     0, water_amount:    0,
        electric_units:  0, electric_amount: 0,
        other_amount:    0, other_label:     '',
        total_amount:    contract.monthly_rent,
        status:          'pending',
        paid_at:         null, paid_amount: 0, payment_method: '', slip_url: null, note: '',
      }).select()
    )
    return rows[0]
  },

  generateAllForMonth: async (propertyId, year, month) => {
    const contracts = await q(
      supabase.from('contracts').select('*').eq('property_id', propertyId).eq('status', 'active')
    )
    return Promise.all(contracts.map(c => invoicesService.generateForContract(c.id, year, month)))
  },

  markPaid: async (id, payData) => {
    const rows = await q(
      supabase.from('monthly_invoices').update({
        status:         'paid',
        paid_at:        payData.paid_at || new Date().toISOString(),
        paid_amount:    payData.paid_amount,
        payment_method: payData.payment_method,
        slip_url:       payData.slip_url || null,
        note:           payData.note || '',
      }).eq('id', id).select()
    )
    const inv = rows[0]
    const uid = await currentUserId()
    await q(supabase.from('payments').insert({
      invoice_id:     id,
      property_id:    inv.property_id,
      amount:         payData.paid_amount,
      payment_method: payData.payment_method,
      payment_type:   'rent',
      slip_url:       payData.slip_url || null,
      paid_at:        payData.paid_at || new Date().toISOString(),
      note:           payData.note || '',
      created_by:     uid,
    }).select())
    return inv
  },

  update: async (id, data) => {
    const rows = await q(supabase.from('monthly_invoices').update(data).eq('id', id).select())
    const inv = rows[0]
    const total =
      (inv.rent_amount     || 0) +
      (inv.water_amount    || 0) +
      (inv.electric_amount || 0) +
      (inv.other_amount    || 0)
    const updated = await q(
      supabase.from('monthly_invoices').update({ total_amount: total }).eq('id', id).select()
    )
    return updated[0]
  },
}

// ─── Meter Readings ──────────────────────────────────────────────────────────

export const meterReadingsService = {
  getByContract: (contractId) =>
    q(supabase.from('meter_readings').select('*').eq('contract_id', contractId)
      .order('year', { ascending: false }).order('month', { ascending: false })),

  getByMonth: (propertyId, year, month) =>
    q(supabase.from('meter_readings').select('*')
      .eq('property_id', propertyId).eq('year', year).eq('month', month)),

  getByContractMonth: (contractId, year, month) =>
    q1(supabase.from('meter_readings').select('*')
      .eq('contract_id', contractId).eq('year', year).eq('month', month)),

  save: async (data) => {
    const existing = await q1(
      supabase.from('meter_readings').select('id')
        .eq('contract_id', data.contract_id).eq('year', data.year).eq('month', data.month)
    )

    let reading
    if (existing) {
      const rows = await q(supabase.from('meter_readings').update(data).eq('id', existing.id).select())
      reading = rows[0]
    } else {
      const rows = await q(supabase.from('meter_readings').insert(data).select())
      reading = rows[0]
    }

    // Recalculate invoice water/electric amounts
    const contract = await q1(supabase.from('contracts').select('*').eq('id', data.contract_id))
    const invoices = await q(
      supabase.from('monthly_invoices').select('*')
        .eq('contract_id', data.contract_id).eq('year', data.year).eq('month', data.month)
    )
    if (contract && invoices.length > 0) {
      const inv = invoices[0]
      const wUnits = Math.max(0, (data.water_curr    || 0) - (data.water_prev    || 0))
      const eUnits = Math.max(0, (data.electric_curr || 0) - (data.electric_prev || 0))
      const wAmt   = wUnits * (contract.water_rate    || 18)
      const eAmt   = eUnits * (contract.electric_rate || 5)
      const total  = (inv.rent_amount || 0) + wAmt + eAmt + (inv.other_amount || 0)
      await q(supabase.from('monthly_invoices').update({
        water_units:    wUnits, water_amount:    wAmt,
        electric_units: eUnits, electric_amount: eAmt,
        total_amount:   total,
      }).eq('id', inv.id))
    }
    return reading
  },
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export const expensesService = {
  getByProperty: (propertyId) =>
    q(supabase.from('expenses').select('*').eq('property_id', propertyId)
      .order('paid_at', { ascending: false })),

  getById: (id) =>
    q1(supabase.from('expenses').select('*').eq('id', id)),

  create: async (data) => {
    const uid = await currentUserId()
    const rows = await q(supabase.from('expenses').insert({ ...data, created_by: uid }).select())
    return rows[0]
  },

  update: async (id, data) => {
    const rows = await q(supabase.from('expenses').update(data).eq('id', id).select())
    return rows[0]
  },

  delete: (id) =>
    q(supabase.from('expenses').delete().eq('id', id)),
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export const bookingsService = {
  getByProperty: (propertyId) =>
    q(supabase.from('bookings').select('*').eq('property_id', propertyId)
      .order('created_at', { ascending: false })),

  getById: (id) =>
    q1(supabase.from('bookings').select('*').eq('id', id)),

  getByRoom: (roomId) =>
    q(supabase.from('bookings').select('*').eq('room_id', roomId)),

  getActive: (propertyId) =>
    q(supabase.from('bookings').select('*').eq('property_id', propertyId)
      .in('status', ['reserved', 'checked_in'])),

  getTodayCheckins: (propertyId) => {
    const today = new Date().toISOString().split('T')[0]
    return q(supabase.from('bookings').select('*')
      .eq('property_id', propertyId).eq('check_in_date', today).eq('status', 'reserved'))
  },

  getTodayCheckouts: (propertyId) => {
    const today = new Date().toISOString().split('T')[0]
    return q(supabase.from('bookings').select('*')
      .eq('property_id', propertyId).eq('check_out_date', today).eq('status', 'checked_in'))
  },

  create: async (data) => {
    const uid = await currentUserId()
    const rows = await q(supabase.from('bookings').insert({ ...data, created_by: uid }).select())
    return rows[0]
  },

  update: async (id, data) => {
    const rows = await q(supabase.from('bookings').update(data).eq('id', id).select())
    return rows[0]
  },

  checkIn: async (id) => {
    const rows = await q(
      supabase.from('bookings')
        .update({ status: 'checked_in', actual_check_in: new Date().toISOString() })
        .eq('id', id).select()
    )
    const booking = rows[0]
    await q(supabase.from('rooms').update({ status: 'occupied' }).eq('id', booking.room_id))
    return booking
  },

  checkOut: async (id) => {
    const rows = await q(
      supabase.from('bookings')
        .update({ status: 'checked_out', actual_check_out: new Date().toISOString() })
        .eq('id', id).select()
    )
    const booking = rows[0]
    await q(supabase.from('rooms').update({ status: 'dirty' }).eq('id', booking.room_id))
    return booking
  },

  cancel: async (id) => {
    const booking = await q1(supabase.from('bookings').select('status, room_id').eq('id', id))
    const rows = await q(supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id).select())
    if (booking?.status === 'reserved') {
      await q(supabase.from('rooms').update({ status: 'available' }).eq('id', booking.room_id))
    }
    return rows[0]
  },
}

// ─── Payments ────────────────────────────────────────────────────────────────

export const paymentsService = {
  getByBooking: (bookingId) =>
    q(supabase.from('payments').select('*').eq('booking_id', bookingId)),

  getByProperty: (propertyId) =>
    q(supabase.from('payments').select('*').eq('property_id', propertyId)
      .order('paid_at', { ascending: false })),

  create: async (data) => {
    const uid = await currentUserId()
    const rows = await q(supabase.from('payments').insert({ ...data, created_by: uid }).select())
    return rows[0]
  },

  getMonthlyRevenue: async (propertyId, year, month) => {
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to   = `${year}-${String(month).padStart(2, '0')}-31`
    const rows = await q(
      supabase.from('payments').select('amount')
        .eq('property_id', propertyId).gte('paid_at', from).lte('paid_at', to + 'T23:59:59')
    )
    return rows.reduce((s, p) => s + (p.amount || 0), 0)
  },

  getRevenueByMonth: async (propertyId, months = 6) => {
    const result = []
    const now = new Date()
    for (let i = months - 1; i >= 0; i--) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year  = d.getFullYear()
      const month = d.getMonth() + 1
      const from  = `${year}-${String(month).padStart(2, '0')}-01`
      const to    = `${year}-${String(month).padStart(2, '0')}-31`
      const rows  = await q(
        supabase.from('payments').select('amount')
          .eq('property_id', propertyId).gte('paid_at', from).lte('paid_at', to + 'T23:59:59')
      )
      const total = rows.reduce((s, p) => s + (p.amount || 0), 0)
      result.push({ month: `${month}/${year}`, total, year, monthNum: month })
    }
    return result
  },
}

// ─── Housekeeping ────────────────────────────────────────────────────────────

export const housekeepingService = {
  getByProperty: async (propertyId) => {
    const rooms = await q(supabase.from('rooms').select('id').eq('property_id', propertyId))
    const roomIds = rooms.map(r => r.id)
    if (!roomIds.length) return []
    return q(supabase.from('housekeeping_logs').select('*').in('room_id', roomIds)
      .order('created_at', { ascending: false }))
  },

  create: async (data) => {
    const rows = await q(supabase.from('housekeeping_logs').insert(data).select())
    return rows[0]
  },

  update: async (id, data) => {
    const rows = await q(supabase.from('housekeeping_logs').update(data).eq('id', id).select())
    return rows[0]
  },

  complete: async (id) => {
    const rows = await q(
      supabase.from('housekeeping_logs')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', id).select()
    )
    return rows[0]
  },
}

// ─── Maintenance ─────────────────────────────────────────────────────────────

export const maintenanceService = {
  getByProperty: (propertyId) =>
    q(supabase.from('maintenance_requests').select('*').eq('property_id', propertyId)
      .order('created_at', { ascending: false })),

  getById: (id) =>
    q1(supabase.from('maintenance_requests').select('*').eq('id', id)),

  create: async (data) => {
    const rows = await q(supabase.from('maintenance_requests').insert(data).select())
    return rows[0]
  },

  update: async (id, data) => {
    const rows = await q(supabase.from('maintenance_requests').update(data).eq('id', id).select())
    return rows[0]
  },

  resolve: async (id, cost) => {
    const rows = await q(
      supabase.from('maintenance_requests')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), cost })
        .eq('id', id).select()
    )
    const req = rows[0]
    await q(supabase.from('rooms').update({ status: 'available' }).eq('id', req.room_id))
    return req
  },
}
