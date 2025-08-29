// File: src/pages/admin/Dashboard.jsx
// Copy this entire code into your Dashboard.jsx file

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Bell, 
  Settings,
  Search,
  Download,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Car,
  UtensilsCrossed,
  Sparkles,
  Home,
  MapPin,
  Building
} from 'lucide-react';

const HotelAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('today');
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Mock data that matches your existing bookings from the screenshots
  const mockBookings = [
    {
      id: 7,
      guest_name: 'Nathan Johnson',
      room_number: '425',
      service_name: 'Le Jardin Restaurant',
      booking_type: 'dining',
      status: 'confirmed',
      requested_datetime: '2025-08-23T19:00:00',
      total_amount: 0,
      booking_details: JSON.stringify({ party_size: 2, time: '7:00 PM' }),
      icon: UtensilsCrossed,
      color: 'bg-orange-500'
    },
    {
      id: 237,
      guest_name: 'Nathan Johnson',
      room_number: '425',
      service_name: 'Club Sandwich',
      booking_type: 'room_service',
      status: 'preparing',
      requested_datetime: '2025-08-23T16:43:29',
      total_amount: 45,
      booking_details: JSON.stringify({ items: ['Club Sandwich'], eta: '30-45 minutes' }),
      icon: UtensilsCrossed,
      color: 'bg-green-500'
    },
    {
      id: 641,
      guest_name: 'Nathan Johnson',
      room_number: '425',
      service_name: 'Swedish Massage',
      booking_type: 'spa',
      status: 'scheduled',
      requested_datetime: '2025-08-23T16:43:21',
      total_amount: 120,
      booking_details: JSON.stringify({ duration: '60 min', therapist: 'Available' }),
      icon: Sparkles,
      color: 'bg-pink-500'
    },
    {
      id: 29,
      guest_name: 'Nathan Johnson',
      room_number: '425',
      service_name: 'Room Cleaning',
      booking_type: 'housekeeping',
      status: 'dispatched',
      requested_datetime: '2025-08-23T16:43:17',
      total_amount: 0,
      booking_details: JSON.stringify({ eta: '30 min' }),
      icon: Home,
      color: 'bg-purple-500'
    },
    {
      id: 641,
      guest_name: 'Nathan Johnson',
      room_number: '425',
      service_name: 'Art Museum Guide',
      booking_type: 'local_guide',
      status: 'info_sent',
      requested_datetime: '2025-08-23T16:43:11',
      total_amount: 0,
      booking_details: JSON.stringify({ distance: '0.8 km' }),
      icon: MapPin,
      color: 'bg-cyan-500'
    }
  ];

  const mockStats = {
    totalBookings: 142,
    activeGuests: 28,
    revenue: 12450,
    avgRating: 4.8,
    bookingsByCategory: {
      dining: 45,
      transportation: 32,
      spa: 28,
      housekeeping: 23,
      concierge: 14
    }
  };

  // API integration - connect to your backend
  useEffect(() => {
    fetchBookings();
    fetchStats();
  }, [timeRange]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      // Replace with your actual backend API endpoint
      const response = await fetch('http://localhost:5000/api/admin/bookings');
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      } else {
        // Use mock data if API fails
        setBookings(mockBookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      // Fallback to mock data
      setBookings(mockBookings);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        setStats(mockStats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(mockStats);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      preparing: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: Calendar },
      dispatched: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
      info_sent: { color: 'bg-purple-100 text-purple-800', icon: Eye },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const config = statusConfig[status] || statusConfig.confirmed;
    const StatusIcon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const StatsCard = ({ title, value, icon: Icon, trend, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className="text-sm text-green-600 mt-1 flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return {
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: date.toLocaleDateString('en-GB')
    };
  };

  const displayBookings = bookings.length > 0 ? bookings : mockBookings;
  const displayStats = Object.keys(stats).length > 0 ? stats : mockStats;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">The Grand Hotel Dubai</h1>
                  <p className="text-sm text-gray-600">Admin Dashboard</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2 inline" />
                Export
              </button>
              
              <div className="relative">
                <Bell className="w-6 h-6 text-gray-600 cursor-pointer" />
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</div>
              </div>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex space-x-6 mt-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'bookings', label: 'Live Bookings', icon: Calendar },
              { id: 'guests', label: 'Active Guests', icon: Users },
              { id: 'services', label: 'Services', icon: Settings }
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Bookings"
                value={displayStats.totalBookings}
                icon={Calendar}
                trend="+12% vs yesterday"
                color="bg-blue-500"
              />
              <StatsCard
                title="Active Guests"
                value={displayStats.activeGuests}
                icon={Users}
                trend="+3 new check-ins"
                color="bg-green-500"
              />
              <StatsCard
                title="Revenue (AED)"
                value={`${displayStats.revenue?.toLocaleString() || '0'}`}
                icon={DollarSign}
                trend="+18% vs yesterday"
                color="bg-purple-500"
              />
              <StatsCard
                title="Avg Rating"
                value={displayStats.avgRating}
                icon={TrendingUp}
                trend="+0.2 this week"
                color="bg-orange-500"
              />
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {displayBookings.slice(0, 5).map(booking => {
                  const ServiceIcon = booking.icon;
                  const { time, date } = formatDateTime(booking.requested_datetime);
                  return (
                    <div key={booking.id} className="flex items-center space-x-3 py-2">
                      <div className={`${booking.color} p-2 rounded-lg`}>
                        <ServiceIcon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Room {booking.room_number} - {booking.service_name}
                        </p>
                        <p className="text-xs text-gray-500">{time} • {date}</p>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Live Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search bookings..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select className="border border-gray-300 rounded-lg px-3 py-2">
                    <option>All Services</option>
                    <option>Dining</option>
                    <option>Transportation</option>
                    <option>Spa</option>
                    <option>Housekeeping</option>
                  </select>
                  <select className="border border-gray-300 rounded-lg px-3 py-2">
                    <option>All Status</option>
                    <option>Pending</option>
                    <option>Confirmed</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bookings List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Active Bookings</h3>
                {loading && <p className="text-sm text-gray-500">Loading...</p>}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayBookings.map(booking => {
                      const ServiceIcon = booking.icon;
                      const { time, date } = formatDateTime(booking.requested_datetime);
                      return (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className={`${booking.color} p-2 rounded-lg`}>
                                <ServiceIcon className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{booking.service_name}</div>
                                <div className="text-sm text-gray-500">#{booking.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{booking.guest_name}</div>
                              <div className="text-sm text-gray-500">Room {booking.room_number}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{time}</div>
                            <div className="text-sm text-gray-500">{date}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(booking.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {booking.total_amount > 0 ? `AED ${booking.total_amount}` : 'Complimentary'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-800 font-medium">View</button>
                              <button className="text-green-600 hover:text-green-800 font-medium">Update</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder tabs */}
        {activeTab === 'guests' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Active Guests Management</h3>
            <p className="text-gray-600 mt-2">Guest profiles, preferences, and booking history will be displayed here.</p>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Service Management</h3>
            <p className="text-gray-600 mt-2">Configure services, pricing, availability, and third-party integrations.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelAdminDashboard;