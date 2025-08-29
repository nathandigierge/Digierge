const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);// Digierge Backend Server - Complete Implementation
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'digierge.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('📊 Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Hotels table
  db.run(`
    CREATE TABLE IF NOT EXISTS hotels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Bookings table
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      booking_id TEXT PRIMARY KEY,
      hotel_id TEXT,
      guest_name TEXT NOT NULL,
      guest_email TEXT,
      room_number TEXT,
      service_type TEXT NOT NULL,
      service_details TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      assigned_to TEXT DEFAULT 'unassigned',
      total_amount DECIMAL(10,2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hotel_id) REFERENCES hotels (id)
    )
  `);

  // Staff table
  db.run(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hotel_id TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar TEXT,
      status TEXT DEFAULT 'available',
      active_bookings INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hotel_id) REFERENCES hotels (id)
    )
  `);

  // Insert sample data
  insertSampleData();
}

function insertSampleData() {
  // Insert sample hotel
  db.run(`
    INSERT OR IGNORE INTO hotels (id, name, address, phone) 
    VALUES ('grand-hotel', 'The Grand Hotel', '123 Luxury Avenue', '+1-555-123-4567')
  `);

  // Insert sample staff
  const staff = [
    { hotel_id: 'grand-hotel', name: 'Marcus Chen', role: 'Concierge', avatar: '👨‍💼', status: 'available' },
    { hotel_id: 'grand-hotel', name: 'Isabella Rodriguez', role: 'Spa Manager', avatar: '👩‍⚕️', status: 'busy' },
    { hotel_id: 'grand-hotel', name: 'Ahmed Hassan', role: 'Transportation', avatar: '👨‍✈️', status: 'available' },
    { hotel_id: 'grand-hotel', name: 'Emma Thompson', role: 'Restaurant Manager', avatar: '👩‍🍳', status: 'available' }
  ];

  staff.forEach(member => {
    db.run(`
      INSERT OR IGNORE INTO staff (hotel_id, name, role, avatar, status) 
      VALUES (?, ?, ?, ?, ?)
    `, [member.hotel_id, member.name, member.role, member.avatar, member.status]);
  });

  console.log('✅ Sample data initialized');
}

// Utility functions
function generateBookingId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

function formatDateTime() {
  return new Date().toISOString();
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔗 User connected: ${socket.id}`);

  socket.on('join_room', (data) => {
    const { userType, hotelId, userId, roomNumber } = data;
    const roomName = `${hotelId}-${userType}`;
    
    socket.join(roomName);
    console.log(`👤 User ${userId} joined room: ${roomName}`);
    
    if (userType === 'guest') {
      socket.join(`${hotelId}-room-${roomNumber}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// API Routes

// Get all bookings
app.get('/api/bookings', (req, res) => {
  const { hotel_id } = req.query;
  
  const query = hotel_id 
    ? 'SELECT * FROM bookings WHERE hotel_id = ? ORDER BY created_at DESC'
    : 'SELECT * FROM bookings ORDER BY created_at DESC';
    
  const params = hotel_id ? [hotel_id] : [];

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Parse service_details JSON strings
    const bookings = rows.map(booking => ({
      ...booking,
      service_details: booking.service_details ? JSON.parse(booking.service_details) : {}
    }));

    res.json(bookings);
  });
});

// Create transportation booking
app.post('/api/bookings/transportation', (req, res) => {
  const bookingId = generateBookingId();
  const {
    guest_name,
    guest_email,
    room_number,
    hotel_id,
    service,
    destination
  } = req.body;

  const serviceDetails = JSON.stringify({
    service,
    destination
  });

  db.run(`
    INSERT INTO bookings (
      booking_id, hotel_id, guest_name, guest_email, room_number,
      service_type, service_details, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    bookingId, hotel_id, guest_name, guest_email, room_number,
    'transportation', serviceDetails, 'pending', formatDateTime(), formatDateTime()
  ], function(err) {
    if (err) {
      console.error('Error creating transportation booking:', err);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    const response = {
      success: true,
      booking_id: bookingId,
      message: `Transportation booked: ${service} to ${destination}`,
      service_type: 'transportation'
    };

    // Emit real-time notification to staff
    io.to(`${hotel_id}-staff`).emit('new_booking', {
      booking_id: bookingId,
      service_type: 'transportation',
      guest_name,
      room_number,
      message: `New transportation request from Room ${room_number}`
    });

    console.log(`🚗 Transportation booking created: ${bookingId}`);
    res.json(response);
  });
});

// Create restaurant booking
app.post('/api/bookings/restaurant', (req, res) => {
  const bookingId = generateBookingId();
  const {
    guest_name,
    guest_email,
    room_number,
    hotel_id,
    restaurant_name,
    date,
    time,
    party_size,
    special_requests
  } = req.body;

  const serviceDetails = JSON.stringify({
    restaurant_name,
    date,
    time,
    party_size,
    special_requests
  });

  db.run(`
    INSERT INTO bookings (
      booking_id, hotel_id, guest_name, guest_email, room_number,
      service_type, service_details, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    bookingId, hotel_id, guest_name, guest_email, room_number,
    'restaurant', serviceDetails, 'pending', formatDateTime(), formatDateTime()
  ], function(err) {
    if (err) {
      console.error('Error creating restaurant booking:', err);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    const response = {
      success: true,
      booking_id: bookingId,
      message: `Table reserved at ${restaurant_name} for ${date} at ${time}`,
      service_type: 'restaurant'
    };

    // Emit real-time notification to staff
    io.to(`${hotel_id}-staff`).emit('new_booking', {
      booking_id: bookingId,
      service_type: 'restaurant',
      guest_name,
      room_number,
      message: `New restaurant booking from Room ${room_number}`
    });

    console.log(`🍽️ Restaurant booking created: ${bookingId}`);
    res.json(response);
  });
});

// Create spa booking
app.post('/api/bookings/spa', (req, res) => {
  const bookingId = generateBookingId();
  const {
    guest_name,
    guest_email,
    room_number,
    hotel_id,
    treatment,
    duration,
    time,
    total_amount
  } = req.body;

  const serviceDetails = JSON.stringify({
    treatment,
    duration,
    time
  });

  db.run(`
    INSERT INTO bookings (
      booking_id, hotel_id, guest_name, guest_email, room_number,
      service_type, service_details, status, total_amount, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    bookingId, hotel_id, guest_name, guest_email, room_number,
    'spa', serviceDetails, 'pending', total_amount, formatDateTime(), formatDateTime()
  ], function(err) {
    if (err) {
      console.error('Error creating spa booking:', err);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    const response = {
      success: true,
      booking_id: bookingId,
      message: `Spa appointment booked: ${treatment}`,
      total_amount,
      service_type: 'spa'
    };

    // Emit real-time notification to staff
    io.to(`${hotel_id}-staff`).emit('new_booking', {
      booking_id: bookingId,
      service_type: 'spa',
      guest_name,
      room_number,
      message: `New spa booking from Room ${room_number}`
    });

    console.log(`🧘‍♀️ Spa booking created: ${bookingId}`);
    res.json(response);
  });
});

// Create housekeeping booking
app.post('/api/bookings/housekeeping', (req, res) => {
  const bookingId = generateBookingId();
  const {
    guest_name,
    guest_email,
    room_number,
    hotel_id,
    service,
    time
  } = req.body;

  const serviceDetails = JSON.stringify({
    service,
    time
  });

  db.run(`
    INSERT INTO bookings (
      booking_id, hotel_id, guest_name, guest_email, room_number,
      service_type, service_details, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    bookingId, hotel_id, guest_name, guest_email, room_number,
    'housekeeping', serviceDetails, 'pending', formatDateTime(), formatDateTime()
  ], function(err) {
    if (err) {
      console.error('Error creating housekeeping booking:', err);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    const response = {
      success: true,
      booking_id: bookingId,
      message: `Housekeeping requested: ${service}`,
      service_type: 'housekeeping'
    };

    // Emit real-time notification to staff
    io.to(`${hotel_id}-staff`).emit('new_booking', {
      booking_id: bookingId,
      service_type: 'housekeeping',
      guest_name,
      room_number,
      message: `New housekeeping request from Room ${room_number}`
    });

    console.log(`🧹 Housekeeping booking created: ${bookingId}`);
    res.json(response);
  });
});

// Create concierge booking
app.post('/api/bookings/concierge', (req, res) => {
  const bookingId = generateBookingId();
  const {
    guest_name,
    guest_email,
    room_number,
    hotel_id,
    request
  } = req.body;

  const serviceDetails = JSON.stringify({
    request
  });

  db.run(`
    INSERT INTO bookings (
      booking_id, hotel_id, guest_name, guest_email, room_number,
      service_type, service_details, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    bookingId, hotel_id, guest_name, guest_email, room_number,
    'concierge', serviceDetails, 'pending', formatDateTime(), formatDateTime()
  ], function(err) {
    if (err) {
      console.error('Error creating concierge booking:', err);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    const response = {
      success: true,
      booking_id: bookingId,
      message: `Concierge request submitted: ${request}`,
      service_type: 'concierge'
    };

    // Emit real-time notification to staff
    io.to(`${hotel_id}-staff`).emit('new_booking', {
      booking_id: bookingId,
      service_type: 'concierge',
      guest_name,
      room_number,
      message: `New concierge request from Room ${room_number}`
    });

    console.log(`🎭 Concierge booking created: ${bookingId}`);
    res.json(response);
  });
});

// Create business booking
app.post('/api/bookings/business', (req, res) => {
  const bookingId = generateBookingId();
  const {
    guest_name,
    guest_email,
    room_number,
    hotel_id,
    room,
    time
  } = req.body;

  const serviceDetails = JSON.stringify({
    room,
    time
  });

  db.run(`
    INSERT INTO bookings (
      booking_id, hotel_id, guest_name, guest_email, room_number,
      service_type, service_details, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    bookingId, hotel_id, guest_name, guest_email, room_number,
    'business', serviceDetails, 'pending', formatDateTime(), formatDateTime()
  ], function(err) {
    if (err) {
      console.error('Error creating business booking:', err);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    const response = {
      success: true,
      booking_id: bookingId,
      message: `Meeting room booked: ${room}`,
      service_type: 'business'
    };

    // Emit real-time notification to staff
    io.to(`${hotel_id}-staff`).emit('new_booking', {
      booking_id: bookingId,
      service_type: 'business',
      guest_name,
      room_number,
      message: `New meeting room booking from Room ${room_number}`
    });

    console.log(`💼 Business booking created: ${bookingId}`);
    res.json(response);
  });
});

// Update booking status
app.put('/api/bookings/:bookingId/status', (req, res) => {
  const { bookingId } = req.params;
  const { status, assigned_to, hotel_id } = req.body;

  let query = 'UPDATE bookings SET status = ?, updated_at = ?';
  let params = [status, formatDateTime()];

  if (assigned_to) {
    query += ', assigned_to = ?';
    params.push(assigned_to);
  }

  query += ' WHERE booking_id = ?';
  params.push(bookingId);

  db.run(query, params, function(err) {
    if (err) {
      console.error('Error updating booking status:', err);
      return res.status(500).json({ error: 'Failed to update booking' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Get booking details to send real-time update
    db.get('SELECT * FROM bookings WHERE booking_id = ?', [bookingId], (err, booking) => {
      if (err) {
        console.error('Error fetching booking:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const response = {
        success: true,
        booking_id: bookingId,
        status,
        assigned_to: assigned_to || booking.assigned_to
      };

      // Emit real-time update to guest
      io.to(`${hotel_id}-room-${booking.room_number}`).emit('booking_update', {
        booking_id: bookingId,
        status,
        message: `Your ${booking.service_type} booking has been ${status}`
      });

      // Emit real-time update to staff
      io.to(`${hotel_id}-staff`).emit('booking_update', {
        booking_id: bookingId,
        status,
        assigned_to: assigned_to || booking.assigned_to,
        message: `Booking ${bookingId} status updated to ${status}`
      });

      console.log(`📝 Booking ${bookingId} updated: ${status}`);
      res.json(response);
    });
  });
});

// Get staff members
app.get('/api/staff', (req, res) => {
  const { hotel_id } = req.query;
  
  const query = hotel_id 
    ? 'SELECT * FROM staff WHERE hotel_id = ?'
    : 'SELECT * FROM staff';
    
  const params = hotel_id ? [hotel_id] : [];

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get analytics/revenue data
app.get('/api/analytics/revenue', (req, res) => {
  const { hotel_id, period } = req.query;
  
  // Calculate date range based on period
  let dateFilter = '';
  const params = [];
  
  if (period === '7d') {
    dateFilter = "WHERE created_at >= datetime('now', '-7 days')";
  } else if (period === '30d') {
    dateFilter = "WHERE created_at >= datetime('now', '-30 days')";
  }
  
  if (hotel_id) {
    dateFilter = dateFilter ? `${dateFilter} AND hotel_id = ?` : 'WHERE hotel_id = ?';
    params.push(hotel_id);
  }

  const query = `
    SELECT 
      COUNT(*) as total_bookings,
      SUM(CASE WHEN total_amount IS NOT NULL THEN total_amount ELSE 0 END) as total_revenue,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings
    FROM bookings 
    ${dateFilter}
  `;

  db.get(query, params, (err, row) => {
    if (err) {
      console.error('Analytics error:', err);
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }

    res.json({
      total_bookings: row.total_bookings || 0,
      total_revenue: row.total_revenue || 0,
      pending_bookings: row.pending_bookings || 0,
      completed_bookings: row.completed_bookings || 0,
      period
    });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('\n🏨 ====================================');
  console.log('🏨  DIGIERGE BACKEND SERVER RUNNING');
  console.log('🏨 ====================================');
  console.log(`🏨  Server: http://localhost:${PORT}`);
  console.log(`🏨  Database: SQLite (digierge.db)`);
  console.log(`🏨  Real-time: Socket.IO enabled`);
  console.log(`🏨  Status: Ready for bookings`);
  console.log('🏨 ====================================\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🏨 Shutting down server...');
  
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('📊 Database connection closed');
    }
  });
  
  server.close(() => {
    console.log('🏨 Server shut down gracefully');
    process.exit(0);
  });
});