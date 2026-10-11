import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import {
  Armchair,
  ArrowDownRight,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  DoorOpen,
  FileDown,
  Info,
  KeyRound,
  Megaphone,
  Medal,
  MapPin,
  ReceiptText,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  UsersRound,
  X,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import './App.css'

type SeatStatus = 'available' | 'reserved' | 'occupied'
type Location = {
  id: string
  name: string
  shortName: string
  sectionLabel: string
  floorLabel: string
  mapTitle: string
  mapLabel: string
  hours: string
  areaLabels: Record<string, string>
  tableLabels: Record<string, string>
}
type Seat = {
  id: string
  code: string
  locationId: string
  area: string
  table: string
  status: SeatStatus
  studentNumber: string | null
  expiresAt: number | null
  checkedInAt: number | null
  estimatedLeaveAt: string | null
  receiptCode: string | null
}
type StudySession = {
  studentNumber: string
  seatId: string
  locationId: string
  area: string
  startedAt: number
  endedAt: number | null
}
type DashboardView = 'map' | 'leaderboard'

const SEAT_STORAGE_KEY = 'kampus-masa-seats-v1'
const STUDY_SESSION_STORAGE_KEY = 'kampus-masa-study-sessions-v1'
const STUDENT_STORAGE_KEY = 'kampus-masa-student-v1'
const locations: Location[] = [
  {
    id: 'merkez-kutuphanesi',
    name: 'Merkez Kütüphane',
    shortName: 'Merkez',
    sectionLabel: 'KÜTÜPHANE · 2. KAT',
    floorLabel: '2. Kat',
    mapTitle: '2. kat yerleşimi',
    mapLabel: '2. KAT · SALON B',
    hours: '08.00 — 22.00',
    areaLabels: { 'Pencere önü': 'Pencere önü', 'Sessiz salon': 'Sessiz salon', 'Grup masaları': 'Grup masaları' },
    tableLabels: { 'Pencere 01': 'Pencere 01', 'Sessiz 01': 'Sessiz 01', 'Pencere 02': 'Pencere 02', 'Grup 01': 'Grup 01' },
  },
  {
    id: 'genc-ofis',
    name: 'Genç Ofis',
    shortName: 'Genç Ofis',
    sectionLabel: 'GENÇ OFİS · ANA SALON',
    floorLabel: 'Zemin Kat',
    mapTitle: 'Genç Ofis yerleşimi',
    mapLabel: 'GENÇ OFİS · ANA SALON',
    hours: '08.00 — 22.00',
    areaLabels: { 'Pencere önü': 'Açık çalışma', 'Sessiz salon': 'Odak alanı', 'Grup masaları': 'Ortak çalışma' },
    tableLabels: { 'Pencere 01': 'Ofis masası 01', 'Sessiz 01': 'Odak masası 01', 'Pencere 02': 'Ofis masası 02', 'Grup 01': 'Ortak masa 01' },
  },
  {
    id: 'isletme-fakultesi',
    name: 'İşletme Fakültesi çalışma alanı',
    shortName: 'İşletme',
    sectionLabel: 'İŞLETME FAKÜLTESİ · ÇALIŞMA ALANI',
    floorLabel: '1. Kat',
    mapTitle: 'Fakülte çalışma alanı',
    mapLabel: 'İŞLETME FAKÜLTESİ · 1. KAT',
    hours: '08.00 — 22.00',
    areaLabels: { 'Pencere önü': 'Açık çalışma', 'Sessiz salon': 'Bireysel alan', 'Grup masaları': 'Grup çalışma' },
    tableLabels: { 'Pencere 01': 'İşletme 01', 'Sessiz 01': 'Bireysel 01', 'Pencere 02': 'İşletme 02', 'Grup 01': 'Grup masası 01' },
  },
  {
    id: 'bilgisayar-binasi',
    name: 'Bilgisayar Binası çalışma alanı',
    shortName: 'Bilgisayar',
    sectionLabel: 'BİLGİSAYAR BİNASI · ÇALIŞMA ALANI',
    floorLabel: 'Zemin Kat',
    mapTitle: 'Bilgisayar Binası yerleşimi',
    mapLabel: 'BİLGİSAYAR BİNASI · ANA SALON',
    hours: '08.00 — 22.00',
    areaLabels: { 'Pencere önü': 'Açık bilgisayar alanı', 'Sessiz salon': 'Sessiz çalışma', 'Grup masaları': 'Grup çalışma' },
    tableLabels: { 'Pencere 01': 'Bilgisayar masası 01', 'Sessiz 01': 'Sessiz masa 01', 'Pencere 02': 'Bilgisayar masası 02', 'Grup 01': 'Grup masası 01' },
  },
]
const CENTRAL_LOCATION_ID = locations[0].id
const seatDefinitions = [
  { id: 'P-01', area: 'Pencere önü', table: 'Pencere 01', status: 'occupied' },
  { id: 'P-02', area: 'Pencere önü', table: 'Pencere 01', status: 'reserved' },
  { id: 'P-03', area: 'Pencere önü', table: 'Pencere 01', status: 'available' },
  { id: 'P-04', area: 'Pencere önü', table: 'Pencere 01', status: 'available' },
  { id: 'S-01', area: 'Sessiz salon', table: 'Sessiz 01', status: 'available' },
  { id: 'S-02', area: 'Sessiz salon', table: 'Sessiz 01', status: 'occupied' },
  { id: 'S-03', area: 'Sessiz salon', table: 'Sessiz 01', status: 'available' },
  { id: 'S-04', area: 'Sessiz salon', table: 'Sessiz 01', status: 'reserved' },
  { id: 'O-01', area: 'Pencere önü', table: 'Pencere 02', status: 'occupied' },
  { id: 'O-02', area: 'Pencere önü', table: 'Pencere 02', status: 'available' },
  { id: 'O-03', area: 'Pencere önü', table: 'Pencere 02', status: 'available' },
  { id: 'O-04', area: 'Pencere önü', table: 'Pencere 02', status: 'available' },
  { id: 'G-01', area: 'Grup masaları', table: 'Grup 01', status: 'available' },
  { id: 'G-02', area: 'Grup masaları', table: 'Grup 01', status: 'occupied' },
  { id: 'G-03', area: 'Grup masaları', table: 'Grup 01', status: 'available' },
  { id: 'G-04', area: 'Grup masaları', table: 'Grup 01', status: 'available' },
] as const

function createInitialSeats(): Seat[] {
  const now = Date.now()
  const occupiedDurations = [89, 63, 47, 31]
  return locations.flatMap((location, locationIndex) => {
    let occupiedIndex = 0
    return seatDefinitions.map((definition, index) => {
      const startedAt = definition.status === 'occupied'
        ? now - (occupiedDurations[occupiedIndex++] + locationIndex * 3) * 60_000
        : null
      const studentSuffix = String(index + 134 + locationIndex * 16).padStart(4, '0')
      return {
        ...definition,
        id: `${location.id}:${definition.id}`,
        code: definition.id,
        locationId: location.id,
        area: location.areaLabels[definition.area],
        table: location.tableLabels[definition.table],
        status: definition.status,
        studentNumber: definition.status === 'occupied' ? `2024${studentSuffix}` : null,
        expiresAt: definition.status === 'reserved' ? now + (index === 1 ? 8 : 12) * 60_000 : null,
        checkedInAt: startedAt,
        estimatedLeaveAt: definition.status === 'occupied' && index % 2 === 0 ? formatClock(now + 55 * 60_000) : null,
        receiptCode: definition.status === 'occupied' ? `KM-2026-${location.id.slice(0, 2).toUpperCase()}-${definition.id.replace('-', '')}` : null,
      }
    })
  })
}

function readSeats(): Seat[] {
  try {
    const stored = localStorage.getItem(SEAT_STORAGE_KEY)
    if (stored) {
      const savedSeats = JSON.parse(stored) as Seat[]
      const migratedSeats = savedSeats.map((seat) => {
        const locationId = seat.locationId ?? CENTRAL_LOCATION_ID
        const seatIdParts = seat.id.split(':')
        const code = seat.code ?? seatIdParts[seatIdParts.length - 1] ?? seat.id
        return {
          ...seat,
          id: seat.locationId ? seat.id : `${locationId}:${code}`,
          code,
          locationId,
          estimatedLeaveAt: seat.estimatedLeaveAt ?? null,
        }
      })
      const savedLocationIds = new Set(migratedSeats.map((seat) => seat.locationId))
      const newLocations = createInitialSeats().filter((seat) => !savedLocationIds.has(seat.locationId))
      return [...migratedSeats, ...newLocations]
    }
  } catch {
    localStorage.removeItem(SEAT_STORAGE_KEY)
  }
  return createInitialSeats()
}

function readStudySessions(): StudySession[] {
  try {
    const stored = localStorage.getItem(STUDY_SESSION_STORAGE_KEY)
    if (!stored) return []
    const sessions = JSON.parse(stored) as StudySession[]
    return Array.isArray(sessions) ? sessions.map((session) => {
      const locationId = session.locationId ?? CENTRAL_LOCATION_ID
      const seatCode = session.seatId ?? ''
      return {
        ...session,
        seatId: session.locationId || !seatCode || seatCode.includes(':') ? seatCode : `${locationId}:${seatCode}`,
        locationId,
        area: session.area ?? '',
      }
    }) : []
  } catch {
    localStorage.removeItem(STUDY_SESSION_STORAGE_KEY)
    return []
  }
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function formatClock(timestamp: number | null) {
  if (!timestamp) return '—'
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(timestamp)
}

function formatDuration(startedAt: number | null, currentTime: number) {
  if (!startedAt) return '—'
  return formatElapsed(currentTime - startedAt)
}

function formatElapsed(milliseconds: number) {
  const minutes = Math.floor(Math.max(0, milliseconds) / 60_000)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours === 0) return `${minutes} dk`
  return remainingMinutes === 0 ? `${hours} sa` : `${hours} sa ${remainingMinutes} dk`
}

function formatStudentAlias(studentNumber: string) {
  return `Öğrenci ···· ${studentNumber.slice(-4)}`
}

function isValidClockTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function App() {
  const [seats, setSeats] = useState<Seat[]>(readSeats)
  const [studySessions, setStudySessions] = useState<StudySession[]>(readStudySessions)
  const [studentNumber, setStudentNumber] = useState(() => localStorage.getItem(STUDENT_STORAGE_KEY) ?? '')
  const [activeView, setActiveView] = useState<DashboardView>('map')
  const [selectedLocationId, setSelectedLocationId] = useState(CENTRAL_LOCATION_ID)
  const [selectedSeatId, setSelectedSeatId] = useState(`${CENTRAL_LOCATION_ID}:P-03`)
  const [activeArea, setActiveArea] = useState('Tüm alanlar')
  const [searchQuery, setSearchQuery] = useState('')
  const [now, setNow] = useState(Date.now())
  const [estimatedLeaveAt, setEstimatedLeaveAt] = useState('')
  const [estimateError, setEstimateError] = useState('')
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginValue, setLoginValue] = useState('')
  const [loginError, setLoginError] = useState('')
  const [pendingAction, setPendingAction] = useState<'reserve' | 'walk-in' | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerMode, setScannerMode] = useState<'reservation' | 'walk-in' | null>(null)
  const [scannerMessage, setScannerMessage] = useState('')
  const [receiptSeatId, setReceiptSeatId] = useState<string | null>(null)
  const [receiptPdfUrl, setReceiptPdfUrl] = useState<string | null>(null)
  const [receiptPdfError, setReceiptPdfError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedLocation = locations.find((location) => location.id === selectedLocationId) ?? locations[0]
  const floorBadge = selectedLocation.floorLabel.match(/\d+/)?.[0].padStart(2, '0') ?? 'Z'
  const locationSeats = useMemo(() => seats.filter((seat) => seat.locationId === selectedLocationId), [seats, selectedLocationId])
  const locationAreas = useMemo(() => ['Tüm alanlar', ...new Set(locationSeats.map((seat) => seat.area))], [locationSeats])
  const selectedSeat = seats.find((seat) => seat.id === selectedSeatId) ?? locationSeats[0]
  const receiptSeat = seats.find((seat) => seat.id === receiptSeatId) ?? null
  const counts = useMemo(() => locationSeats.reduce(
    (total, seat) => ({ ...total, [seat.status]: total[seat.status] + 1 }),
    { available: 0, reserved: 0, occupied: 0 },
  ), [locationSeats])
  const allCounts = useMemo(() => seats.reduce(
    (total, seat) => ({ ...total, [seat.status]: total[seat.status] + 1 }),
    { available: 0, reserved: 0, occupied: 0 },
  ), [seats])
  const mySeat = seats.find((seat) => seat.studentNumber === studentNumber && seat.status !== 'available')
  const favoritePreference = useMemo(() => {
    const seatUsage = new Map<string, { seatId: string; area: string; visits: number; duration: number; lastUsedAt: number }>()
    studySessions.forEach((session) => {
      if (session.studentNumber !== studentNumber || session.locationId !== selectedLocationId || !session.seatId) return
      const current = seatUsage.get(session.seatId) ?? {
        seatId: session.seatId,
        area: session.area,
        visits: 0,
        duration: 0,
        lastUsedAt: 0,
      }
      seatUsage.set(session.seatId, {
        ...current,
        area: session.area || current.area,
        visits: current.visits + 1,
        duration: current.duration + Math.max(0, (session.endedAt ?? now) - session.startedAt),
        lastUsedAt: Math.max(current.lastUsedAt, session.startedAt),
      })
    })
    return [...seatUsage.values()].sort((first, second) => (
      second.visits - first.visits || second.duration - first.duration || second.lastUsedAt - first.lastUsedAt
    ))[0] ?? null
  }, [now, selectedLocationId, studentNumber, studySessions])
  const personalizedRecommendations = useMemo(() => {
    if (!favoritePreference) return []
    const favoriteSeat = locationSeats.find((seat) => seat.id === favoritePreference.seatId)
    return locationSeats.filter((seat) => seat.status === 'available').map((seat) => {
      if (seat.id === favoritePreference.seatId) {
        return { seat, score: 1000 + favoritePreference.visits, reason: `Daha önce ${favoritePreference.visits} kez kullandın; şimdi boş.` }
      }
      if (favoriteSeat && seat.table === favoriteSeat.table) {
        return { seat, score: 500 + favoritePreference.visits, reason: `${favoriteSeat.table} içindeki benzer bir masa.` }
      }
      if (seat.area === favoritePreference.area) {
        return { seat, score: 200 + favoritePreference.visits, reason: `Sık kullandığın ${favoritePreference.area} alanında.` }
      }
      return null
    }).filter((recommendation): recommendation is NonNullable<typeof recommendation> => recommendation !== null)
      .sort((first, second) => second.score - first.score || first.seat.id.localeCompare(second.seat.id))
      .slice(0, 3)
  }, [favoritePreference, locationSeats])
  const leaderboardRows = useMemo(() => {
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const totals = new Map<string, { duration: number; active: boolean }>()
    const addDuration = (number: string, startedAt: number, endedAt: number | null) => {
      const start = Math.max(startedAt, startOfDay.getTime())
      const end = Math.min(endedAt ?? now, now)
      if (endedAt !== null && end <= start) return
      const current = totals.get(number) ?? { duration: 0, active: false }
      totals.set(number, { duration: current.duration + Math.max(0, end - start), active: current.active || endedAt === null })
    }

    studySessions.forEach((session) => addDuration(session.studentNumber, session.startedAt, session.endedAt))
    seats.forEach((seat) => {
      if (seat.status !== 'occupied' || !seat.studentNumber || !seat.checkedInAt) return
      const alreadyTracked = studySessions.some((session) => (
        session.studentNumber === seat.studentNumber && session.locationId === seat.locationId && session.seatId === seat.id && session.startedAt === seat.checkedInAt && session.endedAt === null
      ))
      if (!alreadyTracked) addDuration(seat.studentNumber, seat.checkedInAt, null)
    })

    return [...totals.entries()]
      .map(([number, total]) => ({ studentNumber: number, ...total }))
      .sort((first, second) => second.duration - first.duration || first.studentNumber.localeCompare(second.studentNumber))
  }, [now, seats, studySessions])
  const todayLabel = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)

  useEffect(() => {
    setEstimatedLeaveAt(selectedSeat?.estimatedLeaveAt ?? '')
    setEstimateError('')
  }, [selectedSeat?.estimatedLeaveAt, selectedSeat?.id])
  const visibleGroups = useMemo(() => {
    const grouped = locationSeats.reduce<Record<string, Seat[]>>((result, seat) => {
      if (activeArea !== 'Tüm alanlar' && seat.area !== activeArea) return result
      if (searchQuery && !`${seat.code} ${seat.table} ${seat.area}`.toLocaleLowerCase('tr').includes(searchQuery.toLocaleLowerCase('tr'))) return result
      ;(result[seat.table] ??= []).push(seat)
      return result
    }, {})
    return Object.entries(grouped)
  }, [activeArea, locationSeats, searchQuery])
  const completeCheckIn = useCallback((seatId: string, mode: 'reservation' | 'walk-in') => {
    const seat = seats.find((item) => item.id === seatId)
    const canCheckIn = mode === 'reservation'
      ? seat?.status === 'reserved' && seat.studentNumber === studentNumber
      : seat?.status === 'available'
    if (!seat || !canCheckIn) {
      setScannerMessage(mode === 'reservation'
        ? 'Bu masa için geçerli bir rezervasyon bulunamadı.'
        : 'Bu masa artık boş değil. Haritadan başka bir masa seçin.')
      return
    }
    const timestamp = Date.now()
    const receiptCode = `KM-${new Date(timestamp).getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    setSeats((previous) => previous.map((item) => item.id === seatId
      && (mode === 'reservation'
        ? item.status === 'reserved' && item.studentNumber === studentNumber
        : item.status === 'available')
      ? {
        ...item,
        status: 'occupied',
        studentNumber,
        expiresAt: null,
        checkedInAt: timestamp,
        estimatedLeaveAt: estimatedLeaveAt || seat.estimatedLeaveAt || null,
        receiptCode,
      }
      : item))
    setStudySessions((previous) => [...previous, {
      studentNumber,
      seatId: seat.id,
      locationId: seat.locationId,
      area: seat.area,
      startedAt: timestamp,
      endedAt: null,
    }])
    setScannerOpen(false)
    setScannerMode(null)
    setScannerMessage('')
    setReceiptSeatId(seatId)
    setNotice('QR doğrulandı. Masanız kullanımda olarak işaretlendi.')
  }, [estimatedLeaveAt, seats, studentNumber])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentTime = Date.now()
      setNow(currentTime)
      setSeats((previous) => {
        if (!previous.some((seat) => seat.status === 'reserved' && seat.expiresAt !== null && seat.expiresAt <= currentTime)) return previous
        return previous.map((seat) => (
          seat.status === 'reserved' && seat.expiresAt !== null && seat.expiresAt <= currentTime
            ? { ...seat, status: 'available', studentNumber: null, expiresAt: null, estimatedLeaveAt: null }
            : seat
        ))
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem(SEAT_STORAGE_KEY, JSON.stringify(seats))
  }, [seats])

  useEffect(() => {
    localStorage.setItem(STUDY_SESSION_STORAGE_KEY, JSON.stringify(studySessions))
  }, [studySessions])

  useEffect(() => {
    if (!scannerOpen || !selectedSeat) return
    let active = true
    let scanner: import('html5-qrcode').Html5Qrcode | undefined
    let scannerStart: Promise<unknown> | undefined
    void import('html5-qrcode').then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      if (!active) return
      scanner = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })
      scannerStart = scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decodedText) => {
          if (!active || !scannerMode) return
          const expectedCode = `KUTUPHANE:${selectedSeat.locationId}:${selectedSeat.code}`
          const legacyCentralCode = selectedSeat.locationId === CENTRAL_LOCATION_ID && decodedText.trim() === `KUTUPHANE:${selectedSeat.code}`
          if (decodedText.trim() === expectedCode || legacyCentralCode) completeCheckIn(selectedSeat.id, scannerMode)
          else setScannerMessage('Bu QR seçili masaya ait değil. Masanın üzerindeki etiketi okutun.')
        },
        () => undefined,
      )
      return scannerStart
    }).catch(() => {
      if (active) setScannerMessage('Kamera açılamadı. Tarayıcı izinlerini kontrol edin veya demo okutmayı kullanın.')
    })
    return () => {
      active = false
      if (!scanner) return
      void Promise.resolve(scannerStart)
        .catch(() => undefined)
        .then(async () => {
          if (scanner?.isScanning) await scanner.stop().catch(() => undefined)
          scanner?.clear()
        })
        .catch(() => undefined)
    }
  }, [scannerOpen, scannerMode, selectedSeat, completeCheckIn])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  function reserveSeat(seatId: string, owner: string, leaveAt: string) {
    const expiresAt = Date.now() + 15 * 60_000
    setSeats((previous) => previous.map((seat) => seat.id === seatId && seat.status === 'available'
      ? { ...seat, status: 'reserved', studentNumber: owner, expiresAt, estimatedLeaveAt: leaveAt || null }
      : seat))
    setNotice('Masanız 15 dakika için ayrıldı.')
  }

  function startWalkInCheckIn() {
    setScannerMessage('')
    setScannerMode('walk-in')
    setScannerOpen(true)
  }

  function validateEstimatedLeaveTime() {
    if (!estimatedLeaveAt || isValidClockTime(estimatedLeaveAt)) {
      setEstimateError('')
      return true
    }
    setEstimateError('Saati 24 saat biçiminde yaz (ör. 18:30).')
    return false
  }

  function handleAction(action: 'reserve' | 'walk-in') {
    if (!selectedSeat) return
    if (selectedSeat.status !== 'available') return
    if (!validateEstimatedLeaveTime()) return
    if (!studentNumber) {
      setPendingAction(action)
      setLoginValue('')
      setLoginError('')
      setLoginOpen(true)
      return
    }
    if (action === 'reserve') reserveSeat(selectedSeat.id, studentNumber, estimatedLeaveAt)
    else startWalkInCheckIn()
  }

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = loginValue.trim()
    if (!/^\d{7,12}$/.test(value)) {
      setLoginError('Öğrenci numarası 7–12 rakamdan oluşmalı.')
      return
    }
    setStudentNumber(value)
    localStorage.setItem(STUDENT_STORAGE_KEY, value)
    setLoginOpen(false)
    if (pendingAction && selectedSeat?.status === 'available') {
      if (pendingAction === 'reserve') reserveSeat(selectedSeat.id, value, estimatedLeaveAt)
      else startWalkInCheckIn()
    }
    setPendingAction(null)
  }

  function endSession(seat: Seat) {
    if (seat.studentNumber && seat.checkedInAt) {
      const endedAt = Date.now()
      setStudySessions((previous) => {
        const activeSessionIndex = previous.reduce((lastIndex, session, index) => (
          session.studentNumber === seat.studentNumber && session.locationId === seat.locationId && session.seatId === seat.id && session.startedAt === seat.checkedInAt && session.endedAt === null
            ? index
            : lastIndex
        ), -1)
        if (activeSessionIndex < 0) {
          return [...previous, {
            studentNumber: seat.studentNumber!,
            seatId: seat.id,
            locationId: seat.locationId,
            area: seat.area,
            startedAt: seat.checkedInAt!,
            endedAt,
          }]
        }
        return previous.map((session, index) => index === activeSessionIndex ? { ...session, endedAt } : session)
      })
    }
    setSeats((previous) => previous.map((item) => item.id === seat.id
      ? { ...item, status: 'available', studentNumber: null, expiresAt: null, checkedInAt: null, estimatedLeaveAt: null, receiptCode: null }
      : item))
    setReceiptSeatId(null)
    setSelectedSeatId(seat.id)
    setNotice('Oturum kapatıldı. Masa yeniden boş olarak işaretlendi.')
  }

  const buildReceiptPdf = useCallback(async (seat: Seat): Promise<Blob> => {
    const locationName = locations.find((location) => location.id === seat.locationId)?.name ?? seat.locationId
    const receiptCode = seat.receiptCode ?? `KM-${new Date().getFullYear()}-${seat.code.replace('-', '')}`
    const generatedAt = Date.now()

      const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/vfs_fonts'),
      ])
      Object.assign(pdfMake, { vfs: pdfFonts })
      const documentDefinition: TDocumentDefinitions = {
        pageSize: 'A4' as const,
        pageMargins: [46, 42, 46, 48] as [number, number, number, number],
        info: {
          title: `Kütüphane kullanım fişi ${receiptCode}`,
          author: 'Kampüs Masa',
          subject: 'Doğrulanmış masa oturumu',
        },
        content: [
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: 'KAMPÜS MASA', style: 'brand' },
                  { text: 'KÜTÜPHANE · DİJİTAL KULLANIM BELGESİ', style: 'eyebrow' },
                ],
              },
              {
                width: 104,
                stack: [
                  { text: 'OTURUM DURUMU', style: 'smallLabel', alignment: 'right' },
                  { text: 'AKTİF', style: 'activeStatus', alignment: 'right' },
                ],
              },
            ],
          },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 518, y2: 0, lineWidth: 1, lineColor: '#dfe7dd' }], margin: [0, 16, 0, 25] },
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: 'MASA KULLANIM FİŞİ', style: 'eyebrow' },
                  { text: 'Oturum onaylandı', style: 'title' },
                  { text: 'Kütüphane çalışma alanı kullanım belgesi', style: 'subtitle' },
                ],
              },
              {
                width: 160,
                table: {
                  widths: ['*'],
                  body: [[{
                    stack: [
                      { text: 'FİŞ NUMARASI', style: 'smallLabel' },
                      { text: receiptCode, style: 'receiptCode' },
                    ],
                    fillColor: '#f1f6ee',
                    margin: [12, 11, 12, 11],
                  }]],
                },
                layout: 'noBorders',
              },
            ],
            columnGap: 18,
          },
          { text: 'OTURUM BİLGİLERİ', style: 'sectionTitle', margin: [0, 30, 0, 10] },
          {
            table: {
              widths: ['*', '*'],
              body: [
                [
                  { stack: [{ text: 'ÖĞRENCİ NUMARASI', style: 'smallLabel' }, { text: seat.studentNumber ?? '—', style: 'fieldValue' }], margin: [12, 12, 12, 12], fillColor: '#f7f9f5' },
                  { stack: [{ text: 'GİRİŞ SAATİ', style: 'smallLabel' }, { text: formatClock(seat.checkedInAt), style: 'fieldValue' }], margin: [12, 12, 12, 12], fillColor: '#f7f9f5' },
                ],
                [
                  { stack: [{ text: 'ÇALIŞMA NOKTASI', style: 'smallLabel' }, { text: locationName, style: 'fieldValue' }], margin: [12, 12, 12, 12], fillColor: '#f7f9f5' },
                  { stack: [{ text: 'MASA', style: 'smallLabel' }, { text: `${seat.code} · ${seat.table}`, style: 'fieldValue' }], margin: [12, 12, 12, 12], fillColor: '#f7f9f5' },
                ],
                [
                  { stack: [{ text: 'ÇALIŞMA ALANI', style: 'smallLabel' }, { text: seat.area, style: 'fieldValue' }], margin: [12, 12, 12, 12], fillColor: '#f7f9f5' },
                  { stack: [{ text: 'TAHMİNİ ÇIKIŞ', style: 'smallLabel' }, { text: seat.estimatedLeaveAt || 'Belirtilmedi', style: 'fieldValue' }], margin: [12, 12, 12, 12], fillColor: '#f7f9f5' },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 5,
              vLineWidth: () => 8,
              hLineColor: () => '#ffffff',
              vLineColor: () => '#ffffff',
            },
          },
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: 'QR DOĞRULAMA', style: 'sectionTitle' },
                  { text: 'Bu kod, fiş numarası ve masa oturumuyla eşleşir.', style: 'subtitle', margin: [0, 6, 0, 0] },
                  { text: `Belge oluşturulma saati · ${formatClock(generatedAt)}`, style: 'smallLabel', margin: [0, 15, 0, 0] },
                ],
                margin: [0, 18, 0, 0],
              },
              {
                width: 136,
                stack: [
                  { qr: `KUTUPHANE-FIS:${receiptCode}`, fit: 112, eccLevel: 'M', foreground: '#204936', background: '#ffffff', alignment: 'center' },
                  { text: 'DOĞRULAMA KODU', style: 'smallLabel', alignment: 'center', margin: [0, 7, 0, 0] },
                ],
              },
            ],
            columnGap: 14,
            margin: [0, 24, 0, 0],
          },
        ],
        footer: (currentPage: number, pageCount: number) => ({
          columns: [
            { text: 'KAMPÜS MASA · KÜTÜPHANE OTURUM BELGESİ', alignment: 'left' },
            { text: `${currentPage} / ${pageCount}`, alignment: 'right' },
          ],
          margin: [46, 0, 46, 20],
          fontSize: 8,
          color: '#819084',
        }),
        defaultStyle: { font: 'Roboto', color: '#263a2d' },
        styles: {
          brand: { fontSize: 12, bold: true, color: '#204936', characterSpacing: 1.1 },
          eyebrow: { fontSize: 8, bold: true, color: '#758579', characterSpacing: 1 },
          smallLabel: { fontSize: 7, bold: true, color: '#829084', characterSpacing: .6 },
          activeStatus: { fontSize: 10, bold: true, color: '#4e8155', margin: [0, 4, 0, 0] },
          title: { fontSize: 23, bold: true, color: '#1f3f2e', margin: [0, 8, 0, 5] },
          subtitle: { fontSize: 9, color: '#748176', lineHeight: 1.35 },
          receiptCode: { fontSize: 12, bold: true, color: '#254b36', margin: [0, 5, 0, 0] },
          sectionTitle: { fontSize: 9, bold: true, color: '#335741', characterSpacing: .8 },
          fieldValue: { fontSize: 10, bold: true, color: '#34493a', margin: [0, 5, 0, 0], lineHeight: 1.25 },
        },
      }

      const pdfDocument = pdfMake.createPdf(documentDefinition) as ReturnType<typeof pdfMake.createPdf> & {
        getBlob: (callback: (blob: Blob) => void) => void
      }
      return await new Promise<Blob>((resolve, reject) => {
        try {
          pdfDocument.getBlob(resolve)
        } catch (error) {
          reject(error)
        }
      })
  }, [])

  useEffect(() => {
    if (!receiptSeat) {
      setReceiptPdfUrl(null)
      setReceiptPdfError('')
      return
    }
    let active = true
    let generatedUrl = ''
    setReceiptPdfUrl(null)
    setReceiptPdfError('')
    void buildReceiptPdf(receiptSeat).then((blob) => {
      generatedUrl = URL.createObjectURL(blob)
      if (active) setReceiptPdfUrl(generatedUrl)
      else URL.revokeObjectURL(generatedUrl)
    }).catch(() => {
      if (active) setReceiptPdfError('PDF hazırlanamadı. Fiş ekranda geçerliliğini koruyor.')
    })
    return () => {
      active = false
      if (generatedUrl) window.setTimeout(() => URL.revokeObjectURL(generatedUrl), 60_000)
    }
  }, [buildReceiptPdf, receiptSeat])

  function statusLabel(status: SeatStatus) {
    return status === 'available' ? 'Boş' : status === 'reserved' ? 'Rezerve' : 'Dolu'
  }

  function changeLocation(locationId: string) {
    setSelectedLocationId(locationId)
    setActiveArea('Tüm alanlar')
    setSearchQuery('')
    const nextSeat = seats.find((seat) => seat.locationId === locationId && seat.status === 'available')
      ?? seats.find((seat) => seat.locationId === locationId)
    if (nextSeat) setSelectedSeatId(nextSeat.id)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Kampüs Masa ana sayfa">
          <span className="brand-mark"><BookOpen size={19} strokeWidth={2.4} /></span>
          <span className="brand-copy"><strong>kampüs</strong><small>MASA & KÜTÜPHANE</small></span>
        </a>
        <div className="sidebar-campus"><span className="campus-dot" /> {selectedLocation.shortName}</div>
        <div className="nav-label">ÇALIŞMA ALANI</div>
        <nav className="primary-nav" aria-label="Ana menü">
          <button className={`nav-item ${activeView === 'map' ? 'active' : ''}`} type="button" onClick={() => setActiveView('map')}><MapPin size={18} /> Masa haritası <span className="nav-count">{counts.available}</span></button>
          <button className={`nav-item ${activeView === 'leaderboard' ? 'active' : ''}`} type="button" onClick={() => setActiveView('leaderboard')}><Trophy size={18} /> Günün kazananı</button>
          <button className="nav-item" type="button" onClick={() => mySeat ? setReceiptSeatId(mySeat.id) : setNotice('Henüz aktif bir masa fişiniz yok.')}><ReceiptText size={18} /> Fişlerim</button>
        </nav>

        <div className="sidebar-rule" />
        <div className="nav-label">BUGÜN KÜTÜPHANE</div>
        <div className="hours-row"><Clock3 size={16} /><span>Açık · 22.00’ye kadar</span></div>
        <div className="occupancy-block">
          <div className="occupancy-head"><span>Anlık doluluk</span><strong>{Math.round((counts.occupied / locationSeats.length) * 100)}%</strong></div>
          <div className="occupancy-track"><span style={{ width: `${Math.round((counts.occupied / locationSeats.length) * 100)}%` }} /></div>
                    <small>{counts.occupied} masa kullanımda · {counts.available} masa boş</small>
        </div>

        <div className="sidebar-bottom">
          <div className="help-box"><span className="help-icon"><CircleHelp size={17} /></span><div><strong>Yardıma mı ihtiyacın var?</strong><span>Kütüphane danışma</span></div><ArrowRight size={15} /></div>
          <div className="prototype-note"><ShieldCheck size={14} /> Öğrenci kullanımına özel</div>
        </div>
      </aside>

      <main className="main-area" id="top">
        <header className="topbar">
          <div className="breadcrumb"><span>Kampüs</span><span className="crumb-slash">/</span><strong>{activeView === 'map' ? selectedLocation.name : 'Tüm çalışma noktaları'}</strong></div>
          <div className="topbar-actions">
            <div className="live-indicator"><span /> Canlı doluluk</div>
            {studentNumber ? (
              <button className="user-button" type="button" onClick={() => { setStudentNumber(''); localStorage.removeItem(STUDENT_STORAGE_KEY); setNotice('Oturum kapatıldı.') }} title="Oturumu kapat">
                <span className="user-avatar">{studentNumber.slice(-2)}</span><span className="user-number">{studentNumber}</span><ChevronDown size={15} />
              </button>
            ) : (
              <button className="login-button" type="button" onClick={() => { setLoginValue(''); setLoginError(''); setLoginOpen(true) }}><KeyRound size={15} /> Öğrenci girişi</button>
            )}
          </div>
        </header>

        <div className="page-content">
          <section className="page-intro">
            <div>
              <div className="eyebrow"><span className="eyebrow-mark">{activeView === 'map' ? <Sparkles size={13} /> : <Trophy size={13} />}</span> {activeView === 'map' ? selectedLocation.sectionLabel : 'GÜNLÜK SIRALAMA · TÜM ÇALIŞMA NOKTALARI'}</div>
              {activeView === 'map' ? <><h1>Yerini bul.<br /><span>Rahatça çalış.</span></h1><p>{selectedLocation.name} alanlarını ve boş masaları görüntüle.</p></> : <><h1>Bugünün<br /><span>çalışma liderleri.</span></h1><p>Tüm çalışma noktalarındaki toplam oturum süreleri.</p></>}
            </div>
            <div className="intro-meta"><span className="meta-icon">{activeView === 'map' ? <Clock3 size={17} /> : <Medal size={17} />}</span><div><span>{activeView === 'map' ? 'Bugün çalışma saatleri' : 'Sıralama tarihi'}</span><strong>{activeView === 'map' ? selectedLocation.hours : todayLabel}</strong></div></div>
          </section>

          {activeView === 'map' && <div className="location-toolbar"><div><span className="section-kicker">KAMPÜS ÇALIŞMA NOKTALARI</span><strong>Çalışma alanı seç</strong></div><label className="location-select"><MapPin size={16} /><select aria-label="Çalışma alanı" value={selectedLocationId} onChange={(event) => changeLocation(event.target.value)}>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select><ChevronDown size={15} /></label></div>}

          <section className="summary-strip" aria-label={activeView === 'map' ? `${selectedLocation.name} masa durumları` : 'Tüm kampüs masa durumları'}>
            <div className="summary-title"><span className="summary-live" /> ŞU AN <strong>{activeView === 'map' ? selectedLocation.shortName : 'TÜM NOKTALAR'}</strong></div>
            <div className="summary-divider" />
            <div className="summary-stat"><span className="summary-dot available-dot" /><span>Boş</span><strong>{activeView === 'map' ? counts.available : allCounts.available}</strong></div>
            <div className="summary-stat"><span className="summary-dot reserved-dot" /><span>Rezerve</span><strong>{activeView === 'map' ? counts.reserved : allCounts.reserved}</strong></div>
            <div className="summary-stat"><span className="summary-dot occupied-dot" /><span>Dolu</span><strong>{activeView === 'map' ? counts.occupied : allCounts.occupied}</strong></div>
            <span className="summary-refresh">Güncel <span>şimdi</span></span>
          </section>

          {activeView === 'map' && studentNumber && <section className="recommendation-strip" aria-label="Sana özel masa önerileri">
            <div className="recommendation-heading"><span className="recommendation-kicker"><Sparkles size={13} /> SANA ÖZEL</span><strong>Bir sonraki masan</strong><span>{favoritePreference ? `${favoritePreference.visits} geçmiş oturumuna göre` : 'Tercihlerin oluştukça öneriler kişiselleşir.'}</span></div>
            {personalizedRecommendations.length > 0 ? <div className="recommendation-list">
              {personalizedRecommendations.map(({ seat, reason }) => <button className="recommendation-item" key={seat.id} type="button" onClick={() => {
                setActiveArea('Tüm alanlar')
                setSearchQuery('')
                setSelectedSeatId(seat.id)
              }}>
                <span className="recommendation-seat"><MapPin size={14} /> {seat.code}</span>
                <span className="recommendation-reason">{reason}</span>
                <span className="recommendation-available"><i /> Şimdi boş</span>
                <ArrowRight className="recommendation-arrow" size={15} />
              </button>)}
            </div> : <div className="recommendation-empty">{favoritePreference ? 'Tercih ettiğin alanlarda şu an boş masa yok.' : 'İlk masa oturumundan sonra sana uygun boş masaları burada göstereceğim.'}</div>}
          </section>}

          <div className="workspace-grid" hidden={activeView !== 'map'}>
            <section className="map-panel">
              <div className="panel-heading">
                <div><span className="section-kicker">KAT PLANI · {selectedLocation.name.toLocaleUpperCase('tr-TR')}</span><h2>{selectedLocation.mapTitle}</h2></div>
                <button className="floor-select" type="button"><span className="floor-icon">{floorBadge}</span> {selectedLocation.floorLabel} <ChevronDown size={15} /></button>
              </div>
              <div className="map-toolbar">
                <div className="area-tabs" role="tablist" aria-label="Alan seçimi">
                  {locationAreas.map((area) => <button className={activeArea === area ? 'area-tab selected' : 'area-tab'} key={area} type="button" role="tab" aria-selected={activeArea === area} onClick={() => setActiveArea(area)}>{area}</button>)}
                </div>
                <label className="map-search"><Search size={15} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Masa ara" aria-label="Masa ara" /><kbd>⌘ K</kbd></label>
              </div>

              <div className="floor-map">
                <div className="map-edge-label"><span>CAM CEPHE</span><span className="window-line" /></div>
                <div className="map-content">
                  <div className="map-side-label"><span>SESSİZ ÇALIŞMA</span><span className="side-rail" /></div>
                  <div className="table-grid">
                    {visibleGroups.map(([tableName, tableSeats], index) => (
                      <article className={`table-card table-card-${index % 4}`} key={tableName}>
                        <div className="table-card-heading"><span className="table-symbol"><Armchair size={15} /></span><div><strong>{tableName}</strong><small>{tableSeats[0]?.area}</small></div><span className="table-capacity">{tableSeats.filter((seat) => seat.status === 'available').length}/{tableSeats.length}</span></div>
                        <div className="table-layout">
                          <div className="seat-row">{tableSeats.slice(0, 2).map((seat) => <button key={seat.id} className={`seat ${seat.status} ${selectedSeatId === seat.id ? 'is-selected' : ''} ${seat.studentNumber === studentNumber && studentNumber ? 'mine' : ''}`} onClick={() => setSelectedSeatId(seat.id)} type="button" aria-label={`${seat.code}, ${statusLabel(seat.status)}`} title={`${seat.code} · ${statusLabel(seat.status)}`}><span>{seat.code.slice(-2)}</span></button>)}</div>
                          <div className="desk-surface"><span className="desk-notch" /><span>{tableName.replace(' ', '\u00a0')}</span><span className="desk-notch" /></div>
                          <div className="seat-row">{tableSeats.slice(2, 4).map((seat) => <button key={seat.id} className={`seat ${seat.status} ${selectedSeatId === seat.id ? 'is-selected' : ''} ${seat.studentNumber === studentNumber && studentNumber ? 'mine' : ''}`} onClick={() => setSelectedSeatId(seat.id)} type="button" aria-label={`${seat.code}, ${statusLabel(seat.status)}`} title={`${seat.code} · ${statusLabel(seat.status)}`}><span>{seat.code.slice(-2)}</span></button>)}</div>
                        </div>
                      </article>
                    ))}
                    {visibleGroups.length === 0 && <div className="empty-map"><Search size={20} /><strong>Masa bulunamadı</strong><span>Başka bir masa numarası deneyin.</span></div>}
                  </div>
                  <div className="map-side-label right-side-label"><span>GRUP ÇALIŞMA</span><span className="side-rail" /></div>
                </div>
                <div className="map-bottom"><span className="door-marker"><DoorOpen size={15} /> GİRİŞ</span><span className="map-dimensions">{selectedLocation.mapLabel}</span><span className="stairs-marker"><ArrowDownRight size={14} /> Merdiven</span></div>
              </div>

              <div className="map-legend">
                <span><i className="legend-dot available-dot" /> Boş</span><span><i className="legend-dot reserved-dot" /> Rezerve</span><span><i className="legend-dot occupied-dot" /> Dolu</span>
                <span className="legend-hint"><Info size={13} /> Durum için masaya dokun</span>
              </div>
            </section>

            <aside className="detail-panel">
              <div className="detail-header"><div><span className="section-kicker">MASA DETAYI</span><h2>{selectedSeat?.code ?? 'Masa seç'}</h2></div>{selectedSeat && <span className={`status-pill ${selectedSeat.status}`}><i />{statusLabel(selectedSeat.status)}</span>}</div>
              {selectedSeat && selectedSeat.locationId === selectedLocationId ? (
                <>
                  <div className="selected-location"><span className="location-pin"><MapPin size={17} /></span><div><strong>{selectedLocation.name} · {selectedSeat.table}</strong><span>{selectedLocation.floorLabel} · {selectedSeat.area}</span></div></div>
                  <div className={`availability-card ${selectedSeat.status}`}>
                    <div className="availability-icon">{selectedSeat.status === 'available' ? <Check size={19} /> : selectedSeat.status === 'reserved' ? <Clock3 size={19} /> : <UsersRound size={19} />}</div>
                    <div className="availability-copy">
                      <strong>{selectedSeat.status === 'available' ? 'Bu masa seni bekliyor' : selectedSeat.studentNumber === studentNumber && studentNumber ? 'Bu masa senin' : selectedSeat.status === 'reserved' ? 'Kısa süreli rezerve' : 'Şu an kullanımda'}</strong>
                      <span>{selectedSeat.status === 'available' ? 'Hemen oturabilir veya 15 dk ayırabilirsin.' : selectedSeat.status === 'reserved' ? selectedSeat.studentNumber === studentNumber ? 'QR’ı okutarak girişini tamamla.' : 'Rezervasyon onaylanınca tekrar boşalabilir.' : selectedSeat.studentNumber === studentNumber ? 'E-fişin masanın sana ait olduğunu gösterir.' : 'Bu masada şu anda bir öğrenci çalışıyor.'}</span>
                    </div>
                  </div>

                  {selectedSeat.status === 'reserved' && selectedSeat.expiresAt && (
                    <div className="countdown-card"><span className="countdown-icon"><Clock3 size={17} /></span><div><span>Rezervasyonun bitmesine</span><strong>{formatTime(selectedSeat.expiresAt - now)}</strong></div><small>15 dk</small></div>
                  )}

                  <div className="detail-facts"><div><span>Oturma düzeni</span><strong>Bireysel masa</strong></div><div><span>Priz</span><strong className="fact-yes"><Check size={13} /> Var</strong></div></div>

                  {(selectedSeat.status === 'available' || (selectedSeat.status === 'reserved' && selectedSeat.studentNumber === studentNumber)) && <>
                    <label className="estimate-field"><span>Tahmini çıkış <small>İsteğe bağlı</small></span><input type="text" inputMode="numeric" autoComplete="off" maxLength={5} placeholder="Örn. 18:30" value={estimatedLeaveAt} aria-invalid={Boolean(estimateError)} onBlur={validateEstimatedLeaveTime} onChange={(event) => {
                      const value = event.target.value
                      setEstimatedLeaveAt(value)
                      setEstimateError(value && !isValidClockTime(value) ? 'Saati SS:DD biçiminde yaz (ör. 18:30).' : '')
                      if (selectedSeat.status === 'reserved' && (!value || isValidClockTime(value))) {
                        setSeats((previous) => previous.map((seat) => seat.id === selectedSeat.id ? { ...seat, estimatedLeaveAt: value || null } : seat))
                      }
                    }} /></label>
                    {estimateError && <span className="estimate-error" role="alert">{estimateError}</span>}
                  </>}

                  {selectedSeat.status === 'occupied' && <div className="occupancy-facts"><div><span>Ne zamandır dolu?</span><strong>{formatDuration(selectedSeat.checkedInAt, now)}</strong></div><div><span>Tahmini çıkış</span><strong>{selectedSeat.estimatedLeaveAt || 'Belirtilmedi'}</strong></div></div>}

                  {selectedSeat.status === 'available' && <div className="action-stack"><button className="primary-action" type="button" onClick={() => handleAction('reserve')}><Clock3 size={17} /> 15 dk ayır <ArrowRight size={16} /></button><button className="secondary-action" type="button" onClick={() => handleAction('walk-in')}><ScanLine size={17} /> QR okutarak otur</button><span className="action-footnote"><Info size={13} /> Oturmadan önce masadaki QR kodunu kamerayla okut.</span></div>}
                  {selectedSeat.status === 'reserved' && selectedSeat.studentNumber === studentNumber && <div className="action-stack"><button className="primary-action" type="button" onClick={() => { if (!validateEstimatedLeaveTime()) return; setScannerMessage(''); setScannerMode('reservation'); setScannerOpen(true) }}><ScanLine size={17} /> Masa QR’ını okut <ArrowRight size={16} /></button><span className="action-footnote"><ShieldCheck size={13} /> 15 dk içinde masadaki QR’ı tarayarak girişini doğrula.</span></div>}
                  {selectedSeat.status === 'occupied' && selectedSeat.studentNumber === studentNumber && <div className="action-stack"><button className="primary-action receipt-action" type="button" onClick={() => setReceiptSeatId(selectedSeat.id)}><ReceiptText size={17} /> E-fişimi göster <ArrowRight size={16} /></button><button className="text-action" type="button" onClick={() => endSession(selectedSeat)}>Oturumu bitir</button></div>}
                  {selectedSeat.status !== 'available' && selectedSeat.studentNumber !== studentNumber && <div className="quiet-notice"><ShieldCheck size={15} /> Öğrenci bilgileri gizli tutulur.</div>}
                </>
              ) : <div className="empty-detail">Devam etmek için haritadan bir masa seç.</div>}
              <div className="desk-help"><span className="help-dot"><Info size={14} /></span><span>Masanın QR kodunu okut<strong>Oturma onayı masadaki QR taranınca tamamlanır.</strong></span></div>
            </aside>
          </div>
          <section className="leaderboard-view" hidden={activeView !== 'leaderboard'} aria-labelledby="leaderboard-title">
            <header className="leaderboard-heading">
              <div><span className="section-kicker">BUGÜN · {todayLabel.toLocaleUpperCase('tr-TR')}</span><h2 id="leaderboard-title">Çalışma sıralaması</h2><p>Aktif ve tamamlanan masa oturumlarının toplamı.</p></div>
              <div className="leaderboard-total"><span>Toplam çalışma</span><strong>{formatElapsed(leaderboardRows.reduce((total, row) => total + row.duration, 0))}</strong><small>{leaderboardRows.length} öğrenci</small></div>
            </header>
            <div className="leaderboard-grid">
              <section className="ranking-panel" aria-label="Öğrenci sıralaması">
                <div className="ranking-panel-heading"><div><span className="section-kicker">BUGÜNÜN LİSTESİ</span><h3>En uzun çalışanlar</h3></div><span className="ranking-period"><Clock3 size={13} /> Günlük</span></div>
                <div className="ranking-column-head"><span>SIRA</span><span>ÖĞRENCİ</span><span>SÜRE</span></div>
                {leaderboardRows.length > 0 ? leaderboardRows.slice(0, 10).map((row, index) => (
                  <div className={`ranking-row ${index === 0 ? 'top-ranked' : ''}`} key={row.studentNumber}>
                    <span className="rank-number">{index === 0 ? <Trophy size={16} /> : String(index + 1).padStart(2, '0')}</span>
                    <span className="rank-avatar">{row.studentNumber.slice(-2)}</span>
                    <div className="rank-student"><strong>{formatStudentAlias(row.studentNumber)}</strong><span>{row.active ? 'Şu anda çalışıyor' : 'Oturumunu tamamladı'}</span></div>
                    <strong className="rank-duration">{formatElapsed(row.duration)}</strong>
                  </div>
                )) : <div className="ranking-empty"><Clock3 size={20} /><strong>Bugün henüz oturum yok</strong><span>İlk çalışma oturumu başladığında sıralama burada görünür.</span></div>}
                <div className="ranking-privacy"><ShieldCheck size={14} /> Öğrenci numaraları gizlilik için maskelenir.</div>
              </section>

              <aside className="leaderboard-side">
                <section className="winner-panel">
                  <span className="winner-eyebrow"><Trophy size={14} /> GÜNÜN KAZANANI</span>
                  {leaderboardRows[0] ? <><strong className="winner-name">{formatStudentAlias(leaderboardRows[0].studentNumber)}</strong><span className="winner-caption">{leaderboardRows[0].active ? 'Çalışmaya devam ediyor' : 'Bugünkü toplam çalışma süresi'}</span><span className="winner-duration">{formatElapsed(leaderboardRows[0].duration)}</span></> : <><strong className="winner-name">Henüz belli değil</strong><span className="winner-caption">İlk oturumla birlikte liderlik yarışı başlar.</span></>}
                  <span className="winner-ribbon"><Sparkles size={13} /> İstikrarlı çalışma, güzel sonuçlar getirir.</span>
                </section>
                <section className="announcement-section" aria-labelledby="announcements-title">
                  <div className="announcement-heading"><Megaphone size={16} /><h3 id="announcements-title">Duyurular</h3></div>
                  <div className="announcement-row"><span className="announcement-marker green-marker" /><div><strong>Kütüphane bugün açık</strong><span>Çalışma alanları 22.00’ye kadar kullanılabilir.</span></div></div>
                  <div className="announcement-row"><span className="announcement-marker yellow-marker" /><div><strong>Rezervasyon hatırlatması</strong><span>Ayırdığın masaya 15 dakika içinde QR ile giriş yap.</span></div></div>
                  {leaderboardRows[0] && <div className="announcement-row winner-announcement"><span className="announcement-marker coral-marker" /><div><strong>Günün lideri belli oldu</strong><span>{formatStudentAlias(leaderboardRows[0].studentNumber)} · {formatElapsed(leaderboardRows[0].duration)}</span></div></div>}
                </section>
              </aside>
            </div>
          </section>
          <footer className="page-footer"><span>© 2026 Kampüs Masa</span><span>Mahremiyet önceliğimizdir</span><span className="prototype-label"><span /> PROTOTİP</span></footer>
        </div>
      </main>

      {notice && <div className="toast" role="status"><span className="toast-check"><Check size={15} /></span>{notice}<button type="button" onClick={() => setNotice('')} aria-label="Bildirimi kapat"><X size={15} /></button></div>}

      {loginOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLoginOpen(false) }}>
        <section className="dialog login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title">
          <button className="dialog-close" type="button" onClick={() => setLoginOpen(false)} aria-label="Kapat"><X size={18} /></button>
          <span className="dialog-icon"><KeyRound size={20} /></span><span className="section-kicker">KAMPÜS HESABI</span><h2 id="login-title">Öğrenci girişi</h2><p>Rezervasyon ve masa fişin için öğrenci numaranla devam et.</p>
          <form onSubmit={handleLogin}>
            <label className="input-label" htmlFor="student-number">Öğrenci numarası</label>
            <input id="student-number" className="student-input" value={loginValue} onChange={(event) => { setLoginValue(event.target.value.replace(/\D/g, '').slice(0, 12)); setLoginError('') }} placeholder="Örn. 202412345" inputMode="numeric" autoFocus />
            {loginError && <span className="form-error">{loginError}</span>}
            <button className="primary-action modal-submit" type="submit">Giriş yap <ArrowRight size={16} /></button>
          </form>
          <div className="login-assurance"><ShieldCheck size={15} /><span>Bu prototipte numara yalnızca bu tarayıcıda saklanır.</span></div>
        </section>
      </div>}

      {scannerOpen && selectedSeat && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setScannerOpen(false) }}>
        <section className="dialog scanner-dialog" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
          <button className="dialog-close" type="button" onClick={() => setScannerOpen(false)} aria-label="Kapat"><X size={18} /></button>
          <span className="dialog-icon scan-dialog-icon"><ScanLine size={21} /></span><span className="section-kicker">{selectedLocation.name.toLocaleUpperCase('tr-TR')} · MASA {selectedSeat.code}</span><h2 id="scanner-title">QR kodunu tara</h2><p>{scannerMode === 'reservation' ? 'Rezervasyonunu doğrulamak için masanın QR kodunu kamerayla okut.' : 'Oturduğun masayı onaylamak için üzerindeki QR kodunu kamerayla okut.'}</p>
          <div className="scanner-frame"><div id="qr-reader" /><div className="scanner-target"><span /></div></div>
          {scannerMessage && <div className="scanner-message" role="status"><Info size={15} />{scannerMessage}</div>}
          <button className="demo-scan" type="button" onClick={() => scannerMode && completeCheckIn(selectedSeat.id, scannerMode)}><ScanLine size={15} /> Demo: QR okutuldu</button>
          <span className="scanner-caption">Kamera izni bu sayfada kullanılır, görüntü kaydedilmez.</span>
        </section>
      </div>}

      {receiptSeat && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReceiptSeatId(null) }}>
        <section className="dialog receipt-dialog" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
          <button className="dialog-close" type="button" onClick={() => setReceiptSeatId(null)} aria-label="Kapat"><X size={18} /></button>
          <div className="receipt-topline"><span className="receipt-brand-mark"><BookOpen size={16} /></span><div className="receipt-brand-copy"><strong>KAMPÜS MASA</strong><span>DİJİTAL KÜTÜPHANE BELGESİ</span></div><span className="receipt-live"><i /> OTURUM AKTİF</span></div>
          <div className="receipt-document-head"><div><span className="section-kicker">MASA KULLANIM FİŞİ</span><h2 id="receipt-title">Oturum onaylandı</h2><p>{locations.find((location) => location.id === receiptSeat.locationId)?.name} · {receiptSeat.table}</p></div><div className="receipt-number-box"><span>FİŞ NUMARASI</span><strong>{receiptSeat.receiptCode ?? '—'}</strong></div></div>
          <div className="receipt-content"><div className="receipt-details"><div className="receipt-detail-row"><span>ÖĞRENCİ NUMARASI</span><strong>{receiptSeat.studentNumber ?? '—'}</strong></div><div className="receipt-detail-row"><span>MASA</span><strong>{receiptSeat.code} · {receiptSeat.area}</strong></div><div className="receipt-detail-row"><span>GİRİŞ SAATİ</span><strong>{formatClock(receiptSeat.checkedInAt)}</strong></div><div className="receipt-detail-row"><span>OTURUM SÜRESİ</span><strong>{formatDuration(receiptSeat.checkedInAt, now)}</strong></div><div className="receipt-detail-row"><span>TAHMİNİ ÇIKIŞ</span><strong>{receiptSeat.estimatedLeaveAt || 'Belirtilmedi'}</strong></div></div><div className="receipt-qr"><QRCodeSVG value={`KUTUPHANE-FIS:${receiptSeat.receiptCode ?? receiptSeat.id}`} size={120} level="Q" includeMargin /><strong>QR DOĞRULAMA</strong><span>Bu fiş, aktif masa oturumuna özeldir.</span></div></div>
          <div className="receipt-status-band"><span className="receipt-status-icon"><ShieldCheck size={17} /></span><div><strong>Masa kullanımı doğrulandı</strong><span>Görevliye göstermek için bu belgeyi açık tutabilir veya PDF indirebilirsin.</span></div><span className="receipt-live"><i /> GEÇERLİ</span></div>
          <div className="receipt-actions"><a className={`primary-action pdf-action ${receiptPdfUrl ? '' : 'pdf-pending'}`} href={receiptPdfUrl ?? undefined} download={`kampus-masa-${receiptSeat.locationId}-${receiptSeat.code.toLowerCase()}-fis.pdf`} aria-disabled={!receiptPdfUrl} onClick={(event) => { if (!receiptPdfUrl) event.preventDefault() }}><FileDown size={17} /> {receiptPdfUrl ? 'PDF olarak indir' : receiptPdfError ? 'PDF hazırlanamadı' : 'PDF hazırlanıyor'}</a><button className="secondary-action" type="button" onClick={() => setReceiptSeatId(null)}>Kapat</button></div>
          {receiptPdfError && <span className="receipt-pdf-error" role="alert">{receiptPdfError}</span>}
          <div className="receipt-footnote"><ShieldCheck size={14} /> Fiş, oturum kapanana kadar geçerlidir.</div>
        </section>
      </div>}
    </div>
  )
}

export default App
