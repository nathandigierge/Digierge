// Enhanced App.js with real-time WebSocket integration - COMPLETE VERSION
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

// API Configuration
const API_BASE = process.env.NODE_ENV === 'production' 
  ? '/api'  
  : 'http://localhost:5000/api';

const SOCKET_URL = process.env.NODE_ENV === 'production'
  ? window.location.origin
  : 'http://localhost:5000';

// Real-time Socket Hook
const useSocket = (guestProfile, userType = 'guest') => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'Welcome to Digierge! Your digital concierge is ready.', time: 'now', type: 'success' }
  ]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('🔗 Connected to real-time server');
      setIsConnected(true);
      
      // Join the appropriate room
      newSocket.emit('join_room', {
        userType,
        hotelId: 'grand-hotel',
        userId: guestProfile.name,
        roomNumber: guestProfile.room
      });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from real-time server');
      setIsConnected(false);
    });

    // Listen for real-time booking updates
    newSocket.on('booking_update', (data) => {
      console.log('📱 Real-time booking update:', data);
      const newNotification = {
        id: Date.now(),
        message: data.message,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        type: 'success',
        booking_id: data.booking_id
      };
      
      setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
      
      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Digierge Update', {
          body: data.message,
          icon: '/favicon.ico'
        });
      }
    });

    // Listen for new booking confirmations
    newSocket.on('new_booking', (data) => {
      if (userType === 'staff') {
        console.log('🆕 New booking received:', data);
        const newNotification = {
          id: Date.now(),
          message: `New ${data.service_type} booking from Room ${data.room_number}`,
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          type: 'urgent',
          booking_id: data.booking_id
        };
        
        setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [guestProfile.name, guestProfile.room, userType]);

  return { socket, notifications, setNotifications, isConnected };
};

// Enhanced Staff Dashboard with Real-Time Features
const HotelStaffDashboard = ({ notifications: socketNotifications, setNotifications }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState({
    name: 'Sarah Johnson',
    role: 'Front Desk Manager',
    avatar: '👩‍💼',
    permissions: ['all']
  });
  
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([
    { id: 1, name: 'Marcus Chen', role: 'Concierge', avatar: '👨‍💼', status: 'available', active_bookings: 0 },
    { id: 2, name: 'Isabella Rodriguez', role: 'Spa Manager', avatar: '👩‍⚕️', status: 'busy', active_bookings: 3 },
    { id: 3, name: 'Ahmed Hassan', role: 'Transportation', avatar: '👨‍✈️', status: 'available', active_bookings: 1 },
    { id: 4, name: 'Emma Thompson', role: 'Restaurant Manager', avatar: '👩‍🍳', status: 'available', active_bookings: 2 }
  ]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    total_revenue: 12450,
    bookings_today: 28,
    avg_response_time: 2.3
  });

  // Load data
  useEffect(() => {
    loadBookings();
    loadAnalytics();
  }, []);

  const loadBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE}/bookings?hotel_id=grand-hotel`);
      const bookingsData = response.data.map(booking => ({
        ...booking,
        service_details: typeof booking.service_details === 'string' 
          ? JSON.parse(booking.service_details || '{}') 
          : booking.service_details
      }));
      setBookings(bookingsData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await axios.get(`${API_BASE}/analytics/revenue?hotel_id=grand-hotel&period=7d`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const updateBookingStatus = async (bookingId, newStatus, assignedTo = null) => {
    try {
      await axios.put(`${API_BASE}/bookings/${bookingId}/status`, {
        status: newStatus,
        assigned_to: assignedTo,
        hotel_id: 'grand-hotel'
      });
      
      // Optimistic update
      setBookings(prev => prev.map(booking => 
        booking.booking_id === bookingId 
          ? { ...booking, status: newStatus, assigned_to: assignedTo || booking.assigned_to, updated_at: new Date().toISOString() }
          : booking
      ));
      
      // Success notification
      const successNotification = {
        id: Date.now(),
        message: `Booking ${bookingId} status updated to ${newStatus}`,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        type: 'success'
      };
      setNotifications(prev => [successNotification, ...prev.slice(0, 9)]);
      
    } catch (error) {
      console.error('Failed to update booking:', error);
      alert('Failed to update booking status. Please try again.');
    }
  };

  const assignStaff = async (bookingId, staffName) => {
    try {
      await axios.put(`${API_BASE}/bookings/${bookingId}/status`, {
        status: 'assigned',
        assigned_to: staffName,
        hotel_id: 'grand-hotel'
      });
      
      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.booking_id === bookingId 
          ? { ...booking, assigned_to: staffName, status: 'assigned', updated_at: new Date().toISOString() }
          : booking
      ));
      
      // Update staff status
      const staffMember = staff.find(s => s.name === staffName);
      if (staffMember) {
        setStaff(prev => prev.map(s => 
          s.name === staffName ? { ...s, status: 'busy', active_bookings: (s.active_bookings || 0) + 1 } : s
        ));
      }

      const assignmentNotification = {
        id: Date.now(),
        message: `${staffName} assigned to booking ${bookingId}`,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        type: 'info'
      };
      setNotifications(prev => [assignmentNotification, ...prev.slice(0, 9)]);
      
    } catch (error) {
      console.error('Failed to assign staff:', error);
      alert('Failed to assign staff. Please try again.');
    }
  };

  // Helper functions
  const getStatusColor = (status) => {
    const colors = {
      'pending': '#f59e0b',
      'confirmed': '#10b981',
      'assigned': '#8b5cf6',
      'in-progress': '#3b82f6',
      'completed': '#6b7280',
      'cancelled': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getTypeIcon = (type) => {
    const icons = {
      'transportation': '🚗',
      'restaurant': '🍽️',
      'spa': '🧘‍♀️',
      'housekeeping': '🧹',
      'concierge': '🎭',
      'business': '💼'
    };
    return icons[type] || '🏨';
  };

  const formatBookingDetails = (booking) => {
    const details = booking.service_details || {};
    switch (booking.service_type) {
      case 'transportation':
        return `${details.service || 'Transportation'} to ${details.destination || 'Destination'}`;
      case 'restaurant':
        return `${details.restaurant_name || 'Restaurant'} - ${details.time || 'Time TBD'}`;
      case 'spa':
        return `${details.treatment || 'Treatment'} (${details.duration || '60 min'})`;
      case 'housekeeping':
        return details.service || 'Room Service';
      case 'concierge':
        return details.request || 'Concierge Request';
      case 'business':
        return `${details.room || 'Meeting Room'} - ${details.time || 'Time TBD'}`;
      default:
        return booking.service_type;
    }
  };

  // Calculate real-time stats
  const stats = {
    totalBookings: bookings.length,
    pendingRequests: bookings.filter(b => b.status === 'pending').length,
    activeServices: bookings.filter(b => ['confirmed', 'assigned', 'in-progress'].includes(b.status)).length,
    todayRevenue: analytics.total_revenue || 0,
    availableStaff: staff.filter(s => s.status === 'available').length,
    avgResponseTime: '2.3 min'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Enhanced Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                🏨 Digierge Staff
              </div>
              <div style={{ color: '#6b7280', fontSize: '20px' }}>•</div>
              <div style={{ color: '#6b7280', fontWeight: '500' }}>The Grand Hotel</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', padding: '4px 8px', borderRadius: '12px' }}>
                <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#166534' }}>REAL-TIME</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <button style={{ 
                  padding: '10px', 
                  color: '#6b7280', 
                  background: '#f9fafb', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  cursor: 'pointer', 
                  position: 'relative',
                  transition: 'all 0.2s ease'
                }}>
                  <span style={{ fontSize: '18px' }}>🔔</span>
                  {stats.pendingRequests > 0 && (
                    <span style={{ 
                      position: 'absolute', 
                      top: '-2px', 
                      right: '-2px', 
                      background: '#ef4444', 
                      color: 'white', 
                      fontSize: '11px', 
                      borderRadius: '50%', 
                      width: '18px', 
                      height: '18px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: '600',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {stats.pendingRequests}
                    </span>
                  )}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '16px', borderLeft: '1px solid #e5e7eb' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', 
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}>
                  {user.avatar}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
                    {user.name}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    {user.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
          <nav style={{ display: 'flex', gap: '40px' }}>
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'bookings', label: 'Bookings', icon: '📋', badge: stats.pendingRequests },
              { id: 'staff', label: 'Staff', icon: '👥' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 4px',
                  borderBottom: activeTab === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    minWidth: '16px',
                    textAlign: 'center'
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Total Bookings</span>
                  <span style={{ fontSize: '20px' }}>📊</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>{stats.totalBookings}</div>
                <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>+12% from yesterday</div>
              </div>
              
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Pending</span>
                  <span style={{ fontSize: '20px' }}>⏰</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>{stats.pendingRequests}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Needs attention</div>
              </div>
              
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Revenue</span>
                  <span style={{ fontSize: '20px' }}>💰</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>${stats.todayRevenue.toLocaleString()}</div>
                <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>+18% vs last week</div>
              </div>
              
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Response Time</span>
                  <span style={{ fontSize: '20px' }}>⚡</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6' }}>{stats.avgResponseTime}</div>
                <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>-30s improvement</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>🚨 Priority Requests</h3>
                {bookings.filter(b => b.priority === 'high' || b.status === 'pending').slice(0, 5).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>✅</span>
                    <p>All caught up! No urgent requests.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {bookings.filter(b => b.priority === 'high' || b.status === 'pending').slice(0, 5).map(booking => (
                      <div key={booking.booking_id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '16px', 
                        background: booking.priority === 'high' ? '#fef2f2' : '#f9fafb', 
                        borderRadius: '12px',
                        border: `1px solid ${booking.priority === 'high' ? '#fecaca' : '#e5e7eb'}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '24px' }}>{getTypeIcon(booking.service_type)}</span>
                          <div>
                            <p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>
                              {booking.guest_name} - Room {booking.room_number}
                            </p>
                            <p style={{ fontSize: '14px', color: '#6b7280', margin: '2px 0 0 0' }}>
                              {formatBookingDetails(booking)}
                            </p>
                          </div>
                        </div>
                        {booking.status === 'pending' && (
                          <button 
                            onClick={() => updateBookingStatus(booking.booking_id, 'confirmed')}
                            style={{ 
                              background: '#10b981', 
                              color: 'white', 
                              padding: '6px 12px', 
                              borderRadius: '6px', 
                              border: 'none', 
                              fontSize: '12px', 
                              fontWeight: '600', 
                              cursor: 'pointer'
                            }}
                          >
                            Accept
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>🔔 Live Feed</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                  {socketNotifications.slice(0, 10).map(notif => (
                    <div key={notif.id} style={{ 
                      padding: '12px', 
                      background: notif.type === 'urgent' ? '#fef2f2' : '#f9fafb', 
                      borderRadius: '8px',
                      borderLeft: `3px solid ${notif.type === 'urgent' ? '#ef4444' : notif.type === 'success' ? '#10b981' : '#3b82f6'}`
                    }}>
                      <p style={{ fontSize: '13px', color: '#111827', margin: '0 0 2px 0' }}>
                        {notif.message}
                      </p>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                        {notif.time}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>All Bookings</h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Real-time booking management</p>
            </div>
            
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <p>Loading bookings...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <p>No bookings found</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '16px 20px', fontSize: '13px', fontWeight: '600' }}>Request</th>
                      <th style={{ textAlign: 'left', padding: '16px 20px', fontSize: '13px', fontWeight: '600' }}>Guest</th>
                      <th style={{ textAlign: 'left', padding: '16px 20px', fontSize: '13px', fontWeight: '600' }}>Service</th>
                      <th style={{ textAlign: 'left', padding: '16px 20px', fontSize: '13px', fontWeight: '600' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '16px 20px', fontSize: '13px', fontWeight: '600' }}>Staff</th>
                      <th style={{ textAlign: 'left', padding: '16px 20px', fontSize: '13px', fontWeight: '600' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(booking => (
                      <tr key={booking.booking_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '18px' }}>{getTypeIcon(booking.service_type)}</span>
                            <div>
                              <p style={{ fontWeight: '600', color: '#111827', margin: 0, fontSize: '14px' }}>
                                {booking.booking_id}
                              </p>
                              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                                {new Date(booking.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </td>
                        
                        <td style={{ padding: '16px 20px' }}>
                          <div>
                            <p style={{ fontWeight: '500', color: '#111827', margin: 0, fontSize: '14px' }}>
                              {booking.guest_name}
                            </p>
                            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                              Room {booking.room_number}
                            </p>
                          </div>
                        </td>
                        
                        <td style={{ padding: '16px 20px' }}>
                          <p style={{ color: '#111827', margin: 0, fontSize: '14px' }}>
                            {formatBookingDetails(booking)}
                          </p>
                        </td>
                        
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '16px', 
                            fontSize: '12px', 
                            fontWeight: '600',
                            background: `${getStatusColor(booking.status)}15`,
                            color: getStatusColor(booking.status)
                          }}>
                            {booking.status}
                          </span>
                        </td>
                        
                        <td style={{ padding: '16px 20px' }}>
                          {booking.assigned_to === 'unassigned' ? (
                            <select 
                              onChange={(e) => assignStaff(booking.booking_id, e.target.value)}
                              style={{ 
                                fontSize: '13px', 
                                border: '1px solid #d1d5db', 
                                borderRadius: '6px', 
                                padding: '6px 8px',
                                background: 'white',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="">Assign Staff</option>
                              {staff.filter(s => s.status === 'available').map(staffMember => (
                                <option key={staffMember.id} value={staffMember.name}>
                                  {staffMember.avatar} {staffMember.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ fontSize: '13px', color: '#111827' }}>
                              {booking.assigned_to}
                            </span>
                          )}
                        </td>
                        
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {booking.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => updateBookingStatus(booking.booking_id, 'confirmed')}
                                  style={{ 
                                    background: '#10b981', 
                                    color: 'white', 
                                    padding: '4px 8px', 
                                    borderRadius: '4px', 
                                    border: 'none', 
                                    fontSize: '11px', 
                                    cursor: 'pointer' 
                                  }}
                                >
                                  Accept
                                </button>
                                <button 
                                  onClick={() => updateBookingStatus(booking.booking_id, 'cancelled')}
                                  style={{ 
                                    background: '#ef4444', 
                                    color: 'white', 
                                    padding: '4px 8px', 
                                    borderRadius: '4px', 
                                    border: 'none', 
                                    fontSize: '11px', 
                                    cursor: 'pointer' 
                                  }}
                                >
                                  Decline
                                </button>
                              </>
                            )}
                            {booking.status === 'confirmed' && (
                              <button 
                                onClick={() => updateBookingStatus(booking.booking_id, 'in-progress')}
                                style={{ 
                                  background: '#f59e0b', 
                                  color: 'white', 
                                  padding: '4px 8px', 
                                  borderRadius: '4px', 
                                  border: 'none', 
                                  fontSize: '11px', 
                                  cursor: 'pointer' 
                                }}
                              >
                                Start
                              </button>
                            )}
                            {booking.status === 'in-progress' && (
                              <button 
                                onClick={() => updateBookingStatus(booking.booking_id, 'completed')}
                                style={{ 
                                  background: '#3b82f6', 
                                  color: 'white', 
                                  padding: '4px 8px', 
                                  borderRadius: '4px', 
                                  border: 'none', 
                                  fontSize: '11px', 
                                  cursor: 'pointer' 
                                }}
                              >
                                Complete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'staff' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Staff Management</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {staff.map(staffMember => (
                <div key={staffMember.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '20px', 
                  background: '#fafbfc', 
                  borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '32px' }}>{staffMember.avatar}</div>
                    <div>
                      <p style={{ fontWeight: '600', color: '#111827', margin: 0, fontSize: '16px' }}>
                        {staffMember.name}
                      </p>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                        {staffMember.role}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {staffMember.active_bookings} active
                    </span>
                    <span style={{ 
                      padding: '6px 12px', 
                      borderRadius: '20px', 
                      fontSize: '12px', 
                      fontWeight: '600',
                      background: staffMember.status === 'available' ? '#dcfce7' : '#fee2e2',
                      color: staffMember.status === 'available' ? '#166534' : '#991b1b'
                    }}>
                      {staffMember.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Guest App with Real-Time Features - MAIN APP
const App = () => {
  const [currentView, setCurrentView] = useState('home');
  const [selectedService, setSelectedService] = useState(null);
  const [language, setLanguage] = useState('en');
  const [darkMode, setDarkMode] = useState(false);
  const [guestProfile, setGuestProfile] = useState({
    name: 'Nathan',
    room: '425',
    preferences: ['Vegetarian', 'Window Seat'],
    loyaltyPoints: 2450
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: 22, condition: 'Clear', icon: '🌤️' });
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBookings, setShowBookings] = useState(false);

  // Real-time socket connection
  const { socket, notifications, setNotifications, isConnected } = useSocket(
    guestProfile, 
    currentView === 'staff' ? 'staff' : 'guest'
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load user bookings
  useEffect(() => {
    loadUserBookings();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const loadUserBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE}/bookings?hotel_id=grand-hotel`);
      const userBookings = response.data
        .filter(booking => booking.guest_name === guestProfile.name && booking.room_number === guestProfile.room)
        .map(booking => ({
          ...booking,
          service_details: typeof booking.service_details === 'string' 
            ? JSON.parse(booking.service_details || '{}') 
            : booking.service_details
        }));
      setBookings(userBookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  const translations = {
    en: {
      welcome: 'Welcome to',
      subtitle: 'How may we assist you today?',
      services: 'Hotel Services',
      reserve: 'Reserve Table',
      bookRide: 'Book Ride',
      quickOrder: 'Quick Order',
      backToHome: 'Back to Home',
      myBookings: 'My Bookings',
      notifications: 'Notifications',
      book: 'Book',
      order: 'Order',
      request: 'Request',
      explore: 'Explore',
      close: 'Close',
      connected: 'Connected',
      connecting: 'Connecting...',
      staffDashboard: 'Staff Dashboard'
    },
    es: {
      welcome: 'Bienvenido a',
      subtitle: '¿Cómo podemos ayudarle hoy?',
      services: 'Servicios del Hotel',
      reserve: 'Reservar Mesa',
      bookRide: 'Reservar Viaje',
      quickOrder: 'Pedido Rápido',
      backToHome: 'Volver al Inicio',
      myBookings: 'Mis Reservas',
      notifications: 'Notificaciones',
      book: 'Reservar',
      order: 'Pedir',
      request: 'Solicitar',
      explore: 'Explorar',
      close: 'Cerrar',
      connected: 'Conectado',
      connecting: 'Conectando...',
      staffDashboard: 'Panel de Personal'
    },
    ar: {
      welcome: 'مرحباً بك في',
      subtitle: 'كيف يمكننا مساعدتك اليوم؟',
      services: 'خدمات الفندق',
      reserve: 'حجز طاولة',
      bookRide: 'حجز رحلة',
      quickOrder: 'طلب سريع',
      backToHome: 'العودة للرئيسية',
      myBookings: 'حجوزاتي',
      notifications: 'الإشعارات',
      book: 'حجز',
      order: 'طلب',
      request: 'طلب',
      explore: 'استكشف',
      close: 'إغلاق',
      connected: 'متصل',
      connecting: 'جاري الاتصال...',
      staffDashboard: 'لوحة الموظفين'
    }
  };

  const t = translations[language];

  const services = [
    {
      id: 'transportation',
      title: { en: 'Transportation', es: 'Transporte', ar: 'النقل' },
      description: { en: 'Premium rides & transfers', es: 'Traslados premium', ar: 'نقل متميز' },
      icon: '🚗',
      color: 'linear-gradient(135deg, #3b82f6, #1e40af)'
    },
    {
      id: 'dining',
      title: { en: 'Dining', es: 'Restaurantes', ar: 'المطاعم' },
      description: { en: 'Fine dining & reservations', es: 'Alta cocina y reservas', ar: 'مطاعم راقية' },
      icon: '🍽️',
      color: 'linear-gradient(135deg, #f59e0b, #d97706)'
    },
    {
      id: 'roomservice',
      title: { en: 'Room Service', es: 'Servicio de Habitación', ar: 'خدمة الغرف' },
      description: { en: 'Order to your room', es: 'Pide a tu habitación', ar: 'اطلب لغرفتك' },
      icon: '🛎️',
      color: 'linear-gradient(135deg, #10b981, #059669)'
    },
    {
      id: 'housekeeping',
      title: { en: 'Housekeeping', es: 'Limpieza', ar: 'التنظيف' },
      description: { en: 'Cleaning & maintenance', es: 'Limpieza y mantenimiento', ar: 'التنظيف والصيانة' },
      icon: '🧹',
      color: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
    },
    {
      id: 'spa',
      title: { en: 'Spa & Wellness', es: 'Spa y Bienestar', ar: 'السبا والعافية' },
      description: { en: 'Relaxation & treatments', es: 'Relajación y tratamientos', ar: 'الاسترخاء والعلاجات' },
      icon: '🧘‍♀️',
      color: 'linear-gradient(135deg, #ec4899, #db2777)'
    },
    {
      id: 'concierge',
      title: { en: 'Concierge', es: 'Conserjería', ar: 'الكونسيرج' },
      description: { en: 'Local recommendations', es: 'Recomendaciones locales', ar: 'توصيات محلية' },
      icon: '🎭',
      color: 'linear-gradient(135deg, #f97316, #ea580c)'
    },
    {
      id: 'business',
      title: { en: 'Business Center', es: 'Centro de Negocios', ar: 'مركز الأعمال' },
      description: { en: 'Meeting rooms & services', es: 'Salas de reunión y servicios', ar: 'غرف الاجتماعات والخدمات' },
      icon: '💼',
      color: 'linear-gradient(135deg, #6366f1, #4f46e5)'
    },
    {
      id: 'localguide',
      title: { en: 'Local Guide', es: 'Guía Local', ar: 'دليل محلي' },
      description: { en: 'City attractions & events', es: 'Atracciones y eventos', ar: 'معالم المدينة والأحداث' },
      icon: '🗺️',
      color: 'linear-gradient(135deg, #06b6d4, #0891b2)'
    }
  ];

  const transportationOptions = [
    { name: 'Uber', icon: '🚗', time: '5 min', price: '$12', rating: 4.8 },
    { name: 'Lyft', icon: '🚕', time: '8 min', price: '$15', rating: 4.6 },
    { name: 'Bolt', icon: '⚡', time: '3 min', price: '$10', rating: 4.7 },
    { name: 'Careem', icon: '🏎️', time: '7 min', price: '$18', rating: 4.5 }
  ];

  const restaurants = [
    { name: { en: 'Le Jardin', es: 'El Jardín', ar: 'الحديقة' }, cuisine: { en: 'French', es: 'Francesa', ar: 'فرنسية' }, rating: 4.9, price: '$$$', image: '🌸', popular: true },
    { name: { en: 'Sakura', es: 'Sakura', ar: 'ساكورا' }, cuisine: { en: 'Japanese', es: 'Japonesa', ar: 'يابانية' }, rating: 4.7, price: '$$$$', image: '🍱', popular: false },
    { name: { en: 'Bistro 425', es: 'Bistro 425', ar: 'بيسترو ٤٢٥' }, cuisine: { en: 'Italian', es: 'Italiana', ar: 'إيطالية' }, rating: 4.8, price: '$$$', image: '🍷', popular: true },
    { name: { en: 'Rooftop Grill', es: 'Parrilla en Azotea', ar: 'شواء السطح' }, cuisine: { en: 'Steakhouse', es: 'Asador', ar: 'ستيك هاوس' }, rating: 4.6, price: '$$$$', image: '🥩', popular: false }
  ];

  const roomServiceItems = [
    { name: { en: 'Club Sandwich', es: 'Sándwich Club', ar: 'ساندويتش نادي' }, price: '$18', category: 'Light Meals', image: '🥪', popular: true },
    { name: { en: 'Caesar Salad', es: 'Ensalada César', ar: 'سلطة سيزر' }, price: '$16', category: 'Salads', image: '🥗', popular: false },
    { name: { en: 'Champagne', es: 'Champán', ar: 'شمبانيا' }, price: '$85', category: 'Beverages', image: '🍾', popular: true },
    { name: { en: 'Chocolate Cake', es: 'Pastel de Chocolate', ar: 'كيكة الشوكولاتة' }, price: '$12', category: 'Desserts', image: '🍰', popular: true }
  ];

  const spaServices = [
    { name: { en: 'Swedish Massage', es: 'Masaje Sueco', ar: 'تدليك سويدي' }, duration: '60 min', price: '$120', image: '💆‍♀️' },
    { name: { en: 'Facial Treatment', es: 'Tratamiento Facial', ar: 'علاج الوجه' }, duration: '45 min', price: '$90', image: '🧴' },
    { name: { en: 'Yoga Session', es: 'Sesión de Yoga', ar: 'جلسة يوغا' }, duration: '30 min', price: '$40', image: '🧘‍♀️' },
    { name: { en: 'Sauna Access', es: 'Acceso al Sauna', ar: 'دخول الساونا' }, duration: 'All day', price: '$25', image: '🔥' }
  ];

  const housekeepingServices = [
    { name: { en: 'Extra Towels', es: 'Toallas Extra', ar: 'مناشف إضافية' }, icon: '🏨', eta: '10 min' },
    { name: { en: 'Room Cleaning', es: 'Limpieza de Habitación', ar: 'تنظيف الغرفة' }, icon: '🧽', eta: '30 min' },
    { name: { en: 'Fresh Linens', es: 'Ropa de Cama Fresca', ar: 'أغطية السرير الجديدة' }, icon: '🛏️', eta: '15 min' },
    { name: { en: 'Maintenance', es: 'Mantenimiento', ar: 'الصيانة' }, icon: '🔧', eta: '45 min' }
  ];

  const localAttractions = [
    { name: { en: 'Art Museum', es: 'Museo de Arte', ar: 'متحف الفن' }, distance: '2 km', rating: 4.8, image: '🎨', type: 'Culture' },
    { name: { en: 'Central Park', es: 'Parque Central', ar: 'الحديقة المركزية' }, distance: '1.5 km', rating: 4.9, image: '🌳', type: 'Nature' },
    { name: { en: 'Shopping Mall', es: 'Centro Comercial', ar: 'مركز تسوق' }, distance: '3 km', rating: 4.5, image: '🛍️', type: 'Shopping' },
    { name: { en: 'Beach Club', es: 'Club de Playa', ar: 'نادي الشاطئ' }, distance: '5 km', rating: 4.7, image: '🏖️', type: 'Recreation' }
  ];

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { en: 'Good Morning', es: 'Buenos Días', ar: 'صباح الخير' };
    if (hour < 18) return { en: 'Good Afternoon', es: 'Buenas Tardes', ar: 'مساء الخير' };
    return { en: 'Good Evening', es: 'Buenas Noches', ar: 'مساء الخير' };
  };

  const getTheme = () => ({
    background: darkMode ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    cardBg: darkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255,255,255,0.95)',
    textPrimary: darkMode ? '#f9fafb' : '#1e293b',
    textSecondary: darkMode ? '#d1d5db' : '#64748b',
    headerBg: darkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255,255,255,0.95)'
  });

  const theme = getTheme();

  // Enhanced API Functions with real-time updates
  const bookService = async (endpoint, data) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/bookings/${endpoint}`, {
        ...data,
        guest_name: guestProfile.name,
        room_number: guestProfile.room,
        guest_email: 'nathan@example.com',
        hotel_id: 'grand-hotel'
      });
      
      // Add success notification
      const successNotification = {
        id: Date.now(),
        message: response.data.message,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        type: 'success',
        booking_id: response.data.booking_id
      };
      setNotifications(prev => [successNotification, ...prev.slice(0, 9)]);
      
      // Refresh bookings
      loadUserBookings();
      
      // Show alert with details
      const message = `✅ ${response.data.message}\nBooking ID: ${response.data.booking_id}${response.data.total_amount ? `\nAmount: $${response.data.total_amount}` : ''}`;
      alert(message);
    } catch (error) {
      console.error(`${endpoint} booking failed:`, error);
      const errorNotification = {
        id: Date.now(),
        message: `Booking failed: ${error.message}`,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        type: 'error'
      };
      setNotifications(prev => [errorNotification, ...prev.slice(0, 9)]);
      alert('❌ Booking failed. Please try again or contact front desk.');
    }
    setLoading(false);
  };

  const bookTransportation = (service, destination = 'Downtown') => 
    bookService('transportation', { service, destination });

  const bookRestaurant = (restaurantName, time = '7:00 PM', date = new Date().toLocaleDateString()) => 
    bookService('restaurant', { restaurant_name: restaurantName, date, time, party_size: 2 });

  const quickOrder = (itemName, price = '$18') => 
    bookService('restaurant', { 
      restaurant_name: 'Room Service', 
      date: new Date().toLocaleDateString(), 
      time: 'ASAP', 
      special_requests: `Quick order: ${itemName}`,
      total_amount: parseFloat(price.replace('$', ''))
    });

  const bookSpa = (treatment, duration, price) => 
    bookService('spa', { 
      treatment, 
      duration, 
      time: 'Next available',
      total_amount: parseFloat(price.replace('$', ''))
    });

  const requestHousekeeping = (service, eta) => 
    bookService('housekeeping', { service, time: `ETA: ${eta}` });

  const requestConcierge = (request, type = 'Local Guide') => 
    bookService('concierge', { request: `${type}: ${request}` });

  const bookBusiness = (room, time) => 
    bookService('business', { room, time });

  // Service Detail Components
  const TransportationView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
      {transportationOptions.map((option, index) => (
        <div key={index} style={{ 
          background: theme.cardBg, 
          padding: '24px', 
          borderRadius: '16px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>{option.icon}</span>
              <div>
                <h3 style={{ color: theme.textPrimary, margin: '0', fontSize: '18px', fontWeight: '600' }}>{option.name}</h3>
                <p style={{ color: theme.textSecondary, margin: '2px 0 0 0', fontSize: '14px' }}>⭐ {option.rating}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: theme.textPrimary, margin: '0', fontSize: '16px', fontWeight: '600' }}>{option.price}</p>
              <p style={{ color: theme.textSecondary, margin: '2px 0 0 0', fontSize: '12px' }}>{option.time} away</p>
            </div>
          </div>
          <button 
            onClick={() => bookTransportation(option.name)}
            disabled={loading}
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, #3b82f6, #1e40af)', 
              color: 'white', 
              padding: '12px', 
              borderRadius: '10px', 
              border: 'none', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontWeight: '600',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Booking...' : t.bookRide}
          </button>
        </div>
      ))}
    </div>
  );

  const DiningView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
      {restaurants.map((restaurant, index) => (
        <div key={index} style={{ 
          background: theme.cardBg, 
          padding: '24px', 
          borderRadius: '16px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
          position: 'relative'
        }}>
          {restaurant.popular && (
            <div style={{ 
              position: 'absolute', 
              top: '12px', 
              right: '12px', 
              background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
              color: 'white', 
              padding: '4px 8px', 
              borderRadius: '12px', 
              fontSize: '10px', 
              fontWeight: '600' 
            }}>
              POPULAR
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '40px' }}>{restaurant.image}</span>
            <div>
              <h3 style={{ color: theme.textPrimary, margin: '0', fontSize: '20px', fontWeight: '600' }}>
                {restaurant.name[language]}
              </h3>
              <p style={{ color: theme.textSecondary, margin: '4px 0', fontSize: '14px' }}>
                {restaurant.cuisine[language]} • {restaurant.price}
              </p>
              <p style={{ color: theme.textSecondary, margin: '2px 0 0 0', fontSize: '14px' }}>
                ⭐ {restaurant.rating} • Table available
              </p>
            </div>
          </div>
          <button 
            onClick={() => bookRestaurant(restaurant.name[language])}
            disabled={loading}
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
              color: 'white', 
              padding: '12px', 
              borderRadius: '10px', 
              border: 'none', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontWeight: '600',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Reserving...' : t.reserve}
          </button>
        </div>
      ))}
    </div>
  );

  const RoomServiceView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
      {roomServiceItems.map((item, index) => (
        <div key={index} style={{ 
          background: theme.cardBg, 
          padding: '24px', 
          borderRadius: '16px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
          position: 'relative'
        }}>
          {item.popular && (
            <div style={{ 
              position: 'absolute', 
              top: '12px', 
              right: '12px', 
              background: 'linear-gradient(135deg, #10b981, #059669)', 
              color: 'white', 
              padding: '4px 8px', 
              borderRadius: '12px', 
              fontSize: '10px', 
              fontWeight: '600' 
            }}>
              POPULAR
            </div>
          )}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>{item.image}</span>
            <h3 style={{ color: theme.textPrimary, margin: '0', fontSize: '18px', fontWeight: '600' }}>
              {item.name[language]}
            </h3>
            <p style={{ color: theme.textSecondary, margin: '4px 0', fontSize: '14px' }}>
              {item.category}
            </p>
            <p style={{ color: theme.textPrimary, margin: '8px 0 0 0', fontSize: '20px', fontWeight: '700' }}>
              {item.price}
            </p>
          </div>
          <button 
            onClick={() => quickOrder(item.name[language], item.price)}
            disabled={loading}
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, #10b981, #059669)', 
              color: 'white', 
              padding: '12px', 
              borderRadius: '10px', 
              border: 'none', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontWeight: '600',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Ordering...' : t.order}
          </button>
        </div>
      ))}
    </div>
  );

  const SpaView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
      {spaServices.map((service, index) => (
        <div key={index} style={{ 
          background: theme.cardBg, 
          padding: '24px', 
          borderRadius: '16px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>{service.image}</span>
            <h3 style={{ color: theme.textPrimary, margin: '0', fontSize: '18px', fontWeight: '600' }}>
              {service.name[language]}
            </h3>
            <p style={{ color: theme.textSecondary, margin: '4px 0', fontSize: '14px' }}>
              {service.duration}
            </p>
            <p style={{ color: theme.textPrimary, margin: '8px 0 0 0', fontSize: '20px', fontWeight: '700' }}>
              {service.price}
            </p>
          </div>
          <button 
            onClick={() => bookSpa(service.name[language], service.duration, service.price)}
            disabled={loading}
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, #ec4899, #db2777)', 
              color: 'white', 
              padding: '12px', 
              borderRadius: '10px', 
              border: 'none', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontWeight: '600',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Booking...' : t.book}
          </button>
        </div>
      ))}
    </div>
  );

  const HousekeepingView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
      {housekeepingServices.map((service, index) => (
        <div key={index} style={{ 
          background: theme.cardBg, 
          padding: '24px', 
          borderRadius: '16px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '32px' }}>{service.icon}</span>
            <div>
              <h3 style={{ color: theme.textPrimary, margin: '0', fontSize: '18px', fontWeight: '600' }}>
                {service.name[language]}
              </h3>
              <p style={{ color: theme.textSecondary, margin: '4px 0', fontSize: '14px' }}>
                ETA: {service.eta}
              </p>
            </div>
          </div>
          <button 
            onClick={() => requestHousekeeping(service.name[language], service.eta)}
            disabled={loading}
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', 
              color: 'white', 
              padding: '12px', 
              borderRadius: '10px', 
              border: 'none', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontWeight: '600',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Requesting...' : t.request}
          </button>
        </div>
      ))}
    </div>
  );

  const LocalGuideView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
      {localAttractions.map((attraction, index) => (
        <div key={index} style={{ 
          background: theme.cardBg, 
          padding: '24px', 
          borderRadius: '16px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>{attraction.image}</span>
            <h3 style={{ color: theme.textPrimary, margin: '0', fontSize: '18px', fontWeight: '600' }}>
              {attraction.name[language]}
            </h3>
            <p style={{ color: theme.textSecondary, margin: '4px 0', fontSize: '14px' }}>
              {attraction.type} • {attraction.distance}
            </p>
            <p style={{ color: theme.textSecondary, margin: '2px 0 0 0', fontSize: '14px' }}>
              ⭐ {attraction.rating}
            </p>
          </div>
          <button 
            onClick={() => requestConcierge(attraction.name[language], 'Directions')}
            disabled={loading}
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, #06b6d4, #0891b2)', 
              color: 'white', 
              padding: '12px', 
              borderRadius: '10px', 
              border: 'none', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontWeight: '600',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Getting info...' : t.explore}
          </button>
        </div>
      ))}
    </div>
  );

  const ConciergeView = () => (
    <div style={{ maxWidth: '600px', margin: '20px auto', background: theme.cardBg, padding: '32px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>🎭</span>
        <h2 style={{ color: theme.textPrimary, fontSize: '24px', fontWeight: '600' }}>Concierge Service</h2>
        <p style={{ color: theme.textSecondary, fontSize: '16px', margin: '8px 0' }}>
          How can we assist you today?
        </p>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          'Restaurant recommendations',
          'Theatre tickets',
          'City tour booking',
          'Shopping assistance',
          'Local events',
          'Transportation arrangement'
        ].map((request, index) => (
          <button 
            key={index}
            onClick={() => requestConcierge(request)}
            disabled={loading}
            style={{ 
              padding: '16px', 
              background: theme.cardBg, 
              border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)', 
              borderRadius: '12px', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              color: theme.textPrimary,
              fontWeight: '500',
              textAlign: 'left',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.background = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.target.style.background = theme.cardBg;
              }
            }}
          >
            {loading ? 'Processing...' : request}
          </button>
        ))}
      </div>
    </div>
  );

  const BusinessView = () => (
    <div style={{ maxWidth: '800px', margin: '20px auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        {[
          { name: 'Conference Room A', capacity: '12 people', features: 'Projector, WiFi, Whiteboard', price: '$50/hour', available: true },
          { name: 'Meeting Room B', capacity: '6 people', features: 'Video Call Setup, WiFi', price: '$30/hour', available: true },
          { name: 'Executive Boardroom', capacity: '20 people', features: 'Premium AV, Catering', price: '$100/hour', available: false }
        ].map((room, index) => (
          <div key={index} style={{ 
            background: theme.cardBg, 
            padding: '24px', 
            borderRadius: '16px', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
            opacity: room.available ? 1 : 0.6
          }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ color: theme.textPrimary, margin: '0', fontSize: '20px', fontWeight: '600' }}>
                {room.name}
              </h3>
              <p style={{ color: theme.textSecondary, margin: '4px 0', fontSize: '14px' }}>
                {room.capacity} • {room.features}
              </p>
              <p style={{ color: theme.textPrimary, margin: '8px 0 0 0', fontSize: '18px', fontWeight: '600' }}>
                {room.price}
              </p>
            </div>
            <button 
              onClick={() => bookBusiness(room.name, 'Next available')}
              disabled={loading || !room.available}
              style={{ 
                width: '100%', 
                background: room.available ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#9ca3af', 
                color: 'white', 
                padding: '12px', 
                borderRadius: '10px', 
                border: 'none', 
                cursor: (loading || !room.available) ? 'not-allowed' : 'pointer', 
                fontWeight: '600',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Booking...' : room.available ? t.book : 'Not Available'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // Render service details
  const renderServiceDetail = () => {
    switch (selectedService.id) {
      case 'transportation': return <TransportationView />;
      case 'dining': return <DiningView />;
      case 'roomservice': return <RoomServiceView />;
      case 'spa': return <SpaView />;
      case 'housekeeping': return <HousekeepingView />;
      case 'concierge': return <ConciergeView />;
      case 'business': return <BusinessView />;
      case 'localguide': return <LocalGuideView />;
      default: return null;
    }
  };

  // Staff Dashboard View
  if (currentView === 'staff') {
    return <HotelStaffDashboard notifications={notifications} setNotifications={setNotifications} />;
  }

  // Service Detail View
  if (currentView === 'service' && selectedService) {
    return (
      <div style={{ minHeight: '100vh', background: theme.background, direction: language === 'ar' ? 'rtl' : 'ltr' }}>
        {/* Header */}
        <div style={{ background: theme.headerBg, padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '600', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>digierge</h1>
            <div style={{ color: theme.textSecondary, fontSize: '16px', fontWeight: '500' }}>
              <span style={{ color: theme.textPrimary, fontWeight: '600' }}>The Grand Hotel</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isConnected ? '#f0fdf4' : '#fef2f2', padding: '4px 8px', borderRadius: '12px' }}>
              <div style={{ width: '6px', height: '6px', background: isConnected ? '#10b981' : '#ef4444', borderRadius: '50%' }}></div>
              <span style={{ fontSize: '11px', fontWeight: '600', color: isConnected ? '#166534' : '#991b1b' }}>
                {isConnected ? t.connected : t.connecting}
              </span>
            </div>
          </div>
          <button onClick={() => setCurrentView('home')} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', color: '#3b82f6', cursor: 'pointer' }}>
            ← {t.backToHome}
          </button>
        </div>

        {/* Service Content */}
        <div style={{ padding: '40px' }}>
          <div style={{ marginBottom: '32px', background: theme.cardBg, borderRadius: '24px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <div style={{ width: '64px', height: '64px', background: selectedService.color, borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                {selectedService.icon}
              </div>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: '600', color: theme.textPrimary, marginBottom: '6px' }}>
                  {selectedService.title[language]}
                </h1>
                <p style={{ fontSize: '18px', color: theme.textSecondary }}>
                  {selectedService.description[language]}
                </p>
              </div>
            </div>

            {renderServiceDetail()}
          </div>
        </div>
      </div>
    );
  }

  // Notifications Panel
  if (showNotifications) {
    return (
      <div style={{ minHeight: '100vh', background: theme.background }}>
        <div style={{ background: theme.headerBg, padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            {t.notifications}
          </h1>
          <button onClick={() => setShowNotifications(false)} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', color: '#3b82f6', cursor: 'pointer' }}>
            ← {t.backToHome}
          </button>
        </div>
        
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: theme.cardBg, borderRadius: '20px' }}>
              <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>🔔</span>
              <h3 style={{ color: theme.textPrimary, fontSize: '20px', marginBottom: '8px' }}>No notifications</h3>
              <p style={{ color: theme.textSecondary }}>You're all caught up!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {notifications.map(notif => (
                <div key={notif.id} style={{ 
                  background: theme.cardBg, 
                  padding: '20px', 
                  borderRadius: '16px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  borderLeft: `4px solid ${notif.type === 'success' ? '#10b981' : notif.type === 'error' ? '#ef4444' : '#3b82f6'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ color: theme.textPrimary, margin: '0', fontSize: '16px', flex: 1 }}>
                      {notif.message}
                    </p>
                    <span style={{ color: theme.textSecondary, fontSize: '12px', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                      {notif.time}
                    </span>
                  </div>
                  {notif.booking_id && (
                    <p style={{ color: theme.textSecondary, margin: '8px 0 0 0', fontSize: '12px' }}>
                      Booking ID: {notif.booking_id}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // My Bookings Panel
  if (showBookings) {
    return (
      <div style={{ minHeight: '100vh', background: theme.background }}>
        <div style={{ background: theme.headerBg, padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            {t.myBookings}
          </h1>
          <button onClick={() => setShowBookings(false)} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', color: '#3b82f6', cursor: 'pointer' }}>
            ← {t.backToHome}
          </button>
        </div>
        
        <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
          {bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: theme.cardBg, borderRadius: '20px' }}>
              <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>📋</span>
              <h3 style={{ color: theme.textPrimary, fontSize: '20px', marginBottom: '8px' }}>No bookings yet</h3>
              <p style={{ color: theme.textSecondary }}>Start by booking a service!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
              {bookings.map(booking => {
                const serviceDetails = booking.service_details || {};
                return (
                  <div key={booking.booking_id} style={{ 
                    background: theme.cardBg, 
                    padding: '24px', 
                    borderRadius: '16px', 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ color: theme.textPrimary, margin: '0', fontSize: '18px', fontWeight: '600' }}>
                          {booking.service_type.charAt(0).toUpperCase() + booking.service_type.slice(1)}
                        </h3>
                        <p style={{ color: theme.textSecondary, margin: '4px 0 0 0', fontSize: '12px' }}>
                          {booking.booking_id}
                        </p>
                      </div>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        fontSize: '11px', 
                        fontWeight: '600',
                        background: booking.status === 'confirmed' ? '#dcfce7' : booking.status === 'pending' ? '#fef3c7' : '#fee2e2',
                        color: booking.status === 'confirmed' ? '#166534' : booking.status === 'pending' ? '#92400e' : '#991b1b'
                      }}>
                        {booking.status}
                      </span>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      {booking.service_type === 'restaurant' && (
                        <>
                          <p style={{ color: theme.textPrimary, margin: '0', fontSize: '14px' }}>
                            📍 {serviceDetails.restaurant_name || 'Restaurant'}
                          </p>
                          <p style={{ color: theme.textSecondary, margin: '4px 0', fontSize: '12px' }}>
                            📅 {serviceDetails.date} at {serviceDetails.time}
                          </p>
                        </>
                      )}
                      {booking.service_type === 'transportation' && (
                        <>
                          <p style={{ color: theme.textPrimary, margin: '0', fontSize: '14px' }}>
                            🚗 {serviceDetails.service || 'Transportation'}
                          </p>
                          <p style={{ color: theme.textSecondary, margin: '4px 0', fontSize: '12px' }}>
                            📍 To {serviceDetails.destination || 'Destination'}
                          </p>
                        </>
                      )}
                      {booking.service_type === 'spa' && (
                        <>
                          <p style={{ color: theme.textPrimary, margin: '0', fontSize: '14px' }}>
                            🧘‍♀️ {serviceDetails.treatment || 'Treatment'}
                          </p>
                          <p style={{ color: theme.textSecondary, margin: '4px 0', fontSize: '12px' }}>
                            ⏰ {serviceDetails.duration || '60 min'}
                          </p>
                        </>
                      )}
                      {booking.service_type === 'housekeeping' && (
                        <p style={{ color: theme.textPrimary, margin: '0', fontSize: '14px' }}>
                          🧹 {serviceDetails.service || 'Housekeeping Service'}
                        </p>
                      )}
                      {booking.service_type === 'concierge' && (
                        <p style={{ color: theme.textPrimary, margin: '0', fontSize: '14px' }}>
                          🎭 {serviceDetails.request || 'Concierge Request'}
                        </p>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ color: theme.textSecondary, fontSize: '12px' }}>
                        {new Date(booking.created_at).toLocaleDateString()}
                      </span>
                      {booking.total_amount && (
                        <span style={{ color: theme.textPrimary, fontWeight: '600', fontSize: '14px' }}>
                          ${booking.total_amount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Home View
  return (
    <div style={{ minHeight: '100vh', background: theme.background, direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      {/* Header */}
      <div style={{ background: theme.headerBg, padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>digierge</h1>
          <div style={{ color: theme.textSecondary, fontSize: '16px', fontWeight: '500' }}>
            <span style={{ color: theme.textPrimary, fontWeight: '600' }}>The Grand Hotel</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isConnected ? '#f0fdf4' : '#fef2f2', padding: '4px 8px', borderRadius: '12px' }}>
            <div style={{ width: '6px', height: '6px', background: isConnected ? '#10b981' : '#ef4444', borderRadius: '50%' }}></div>
            <span style={{ fontSize: '11px', fontWeight: '600', color: isConnected ? '#166534' : '#991b1b' }}>
              {isConnected ? t.connected : t.connecting}
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => setShowNotifications(true)} style={{ position: 'relative', padding: '10px', color: theme.textSecondary, background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
            <span style={{ fontSize: '18px' }}>🔔</span>
            {notifications.length > 1 && (
              <span style={{ position: 'absolute', top: '2px', right: '2px', background: '#ef4444', color: 'white', fontSize: '10px', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {notifications.length - 1}
              </span>
            )}
          </button>
          
          <button onClick={() => setShowBookings(true)} style={{ padding: '10px', color: theme.textSecondary, background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
            <span style={{ fontSize: '18px' }}>📋</span>
          </button>

          <button onClick={() => setCurrentView('staff')} style={{ padding: '8px 12px', color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
            {t.staffDashboard}
          </button>

          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)} 
            style={{ padding: '8px', borderRadius: '6px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)', background: theme.cardBg, color: theme.textPrimary }}
          >
            <option value="en">🇺🇸 EN</option>
            <option value="es">🇪🇸 ES</option>
            <option value="ar">🇸🇦 AR</option>
          </select>
          
          <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '10px', color: theme.textSecondary, background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{ padding: '60px 40px', textAlign: 'center', background: `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1)), url('data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="50" r="0.5" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grain)"/></svg>')}')` }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: language === 'ar' ? '48px' : '56px', fontWeight: '700', color: theme.textPrimary, marginBottom: '20px', lineHeight: '1.1' }}>
            {getGreeting()[language]}, {guestProfile.name}
          </h1>
          <h2 style={{ fontSize: '32px', fontWeight: '300', color: theme.textPrimary, marginBottom: '32px', lineHeight: '1.3' }}>
            {t.welcome} <span style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '600' }}>The Grand Hotel</span>
          </h2>
          <p style={{ fontSize: '20px', color: theme.textSecondary, marginBottom: '40px' }}>
            Room {guestProfile.room} • {t.subtitle}
          </p>
          
          {/* Status Info */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>{weather.icon}</span>
              <span style={{ color: theme.textPrimary, fontSize: '16px', fontWeight: '500' }}>{weather.temp}°C</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>⏰</span>
              <span style={{ color: theme.textPrimary, fontSize: '16px', fontWeight: '500' }}>
                {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>⭐</span>
              <span style={{ color: theme.textPrimary, fontSize: '16px', fontWeight: '500' }}>
                {guestProfile.loyaltyPoints.toLocaleString()} pts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div style={{ padding: '0 40px 60px 40px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '28px', fontWeight: '600', color: theme.textPrimary, marginBottom: '32px', textAlign: 'center' }}>
            {t.services}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {services.map((service, index) => (
              <div
                key={service.id}
                onClick={() => {
                  setSelectedService(service);
                  setCurrentView('service');
                }}
                style={{
                  background: theme.cardBg,
                  padding: '32px',
                  borderRadius: '20px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: 'translateY(0)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)';
                }}
              >
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  height: '4px', 
                  background: service.color 
                }}></div>
                
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    background: service.color, 
                    borderRadius: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '24px',
                    marginRight: '16px'
                  }}>
                    {service.icon}
                  </div>
                  <div>
                    <h4 style={{ 
                      fontSize: '20px', 
                      fontWeight: '600', 
                      color: theme.textPrimary, 
                      margin: '0 0 4px 0' 
                    }}>
                      {service.title[language]}
                    </h4>
                    <p style={{ 
                      fontSize: '14px', 
                      color: theme.textSecondary, 
                      margin: 0 
                    }}>
                      {service.description[language]}
                    </p>
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  alignItems: 'center' 
                }}>
                  <span style={{ 
                    fontSize: '24px', 
                    color: theme.textSecondary,
                    transform: language === 'ar' ? 'rotate(180deg)' : 'none'
                  }}>
                    →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div style={{ padding: '0 40px 60px 40px', background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ fontSize: '24px', fontWeight: '600', color: theme.textPrimary, marginBottom: '32px' }}>
            Quick Actions
          </h3>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => bookRestaurant('Le Jardin')}
              disabled={loading}
              style={{ 
                background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
                color: 'white', 
                padding: '16px 24px', 
                borderRadius: '12px', 
                border: 'none', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                fontWeight: '600',
                fontSize: '16px',
                opacity: loading ? 0.7 : 1,
                minWidth: '160px'
              }}
            >
              {loading ? 'Reserving...' : t.reserve}
            </button>
            
            <button 
              onClick={() => bookTransportation('Uber')}
              disabled={loading}
              style={{ 
                background: 'linear-gradient(135deg, #3b82f6, #1e40af)', 
                color: 'white', 
                padding: '16px 24px', 
                borderRadius: '12px', 
                border: 'none', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                fontWeight: '600',
                fontSize: '16px',
                opacity: loading ? 0.7 : 1,
                minWidth: '160px'
              }}
            >
              {loading ? 'Booking...' : t.bookRide}
            </button>
            
            <button 
              onClick={() => quickOrder('Club Sandwich', '$18')}
              disabled={loading}
              style={{ 
                background: 'linear-gradient(135deg, #10b981, #059669)', 
                color: 'white', 
                padding: '16px 24px', 
                borderRadius: '12px', 
                border: 'none', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                fontWeight: '600',
                fontSize: '16px',
                opacity: loading ? 0.7 : 1,
                minWidth: '160px'
              }}
            >
              {loading ? 'Ordering...' : t.quickOrder}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '40px', textAlign: 'center', borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)' }}>
        <p style={{ color: theme.textSecondary, fontSize: '14px', margin: 0 }}>
          Need immediate assistance? Call front desk: +1 (555) 123-4567
        </p>
      </div>
    </div>
  );
};

export default App;// Updated Fri 29 Aug 2025 17:17:32 BST
// Updated Fri 29 Aug 2025 17:17:36 BST
