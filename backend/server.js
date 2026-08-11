require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const safePlaceRoutes = require('./routes/safeplace');
const journeyRoutes = require('./routes/journey');
const alertRoutes = require('./routes/alert');

// Import models for background checker
const Journey = require('./models/Journey');
const Alert = require('./models/Alert');
const Contact = require('./models/Contact');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Store io instance globally in app configuration
app.set('io', io);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/safeplaces', safePlaceRoutes);
app.use('/api/journey', journeyRoutes);
app.use('/api/alerts', alertRoutes);

app.get('/', (req, res) => {
  res.send('TravelSafetySOS API Server Running...');
});

// Socket.io Real-Time Event Handlers
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  socket.on('join_user', (userId) => {
    socket.join(userId);
    console.log(`Socket joined user room: ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// AUTOMATED TRAVEL SAFETY CHECKER LOOP (Runs every 10 seconds)
setInterval(async () => {
  try {
    const now = new Date();
    
    // Find journeys that are currently in progress or overdue
    const activeJourneys = await Journey.find({
      status: { $in: ['active', 'grace_period', 'check_in_requested'] }
    }).populate('user', 'name phone email');

    for (let journey of activeJourneys) {
      if (!journey.user) continue; // Skip if user no longer exists
      
      const user = journey.user;

      // 1. Check if 'active' journey has crossed expected reach time -> enter grace period
      if (journey.status === 'active' && now > journey.expectedReachTime) {
        journey.status = 'grace_period';
        await journey.save();
        
        console.log(`Journey ${journey._id} for ${user.name} entered GRACE_PERIOD`);
        io.emit('journey_grace_period', {
          journeyId: journey._id,
          userId: user._id,
          userName: user.name,
          gracePeriodEndsAt: journey.gracePeriodEndsAt,
        });
        
        // Notify the specific mobile client (room = user._id)
        io.to(user._id.toString()).emit('notify_check_in_alert', {
          journeyId: journey._id,
          message: 'Expected arrival time reached. Grace period started.',
          secondsRemaining: Math.max(0, Math.floor((journey.gracePeriodEndsAt - now) / 1000)),
        });
      }

      // 2. Check if 'grace_period' has expired -> request safety MPIN check-in
      else if (journey.status === 'grace_period' && now > journey.gracePeriodEndsAt) {
        journey.status = 'check_in_requested';
        await journey.save();

        console.log(`Journey ${journey._id} for ${user.name} requests CHECK-IN (MPIN required)`);
        io.emit('journey_check_in_requested', {
          journeyId: journey._id,
          userId: user._id,
          userName: user.name,
          checkInEndsAt: journey.checkInEndsAt,
        });

        // Trigger safety checkin screen on the mobile app
        io.to(user._id.toString()).emit('trigger_mpin_prompt', {
          journeyId: journey._id,
          message: 'SAFETY CHECK-IN: Please enter your MPIN within 5 minutes or an SOS alert will be sent automatically.',
          secondsRemaining: 300, // 5 minutes
        });
      }

      // 3. Check if 'check_in_requested' has expired -> ESCALATE TO SOS MODE
      else if (journey.status === 'check_in_requested' && now > journey.checkInEndsAt) {
        journey.status = 'sos_triggered';
        await journey.save();

        console.log(`Journey ${journey._id} for ${user.name} TIMED OUT. Escalating to SOS!`);

        // Check if an active alert already exists to prevent duplicate logs
        const existingAlert = await Alert.findOne({
          user: user._id,
          journey: journey._id,
          status: 'active'
        });

        if (!existingAlert) {
          // Log active SOS alert
          const alert = await Alert.create({
            user: user._id,
            journey: journey._id,
            latitude: journey.currentLatitude || journey.destinationLatitude,
            longitude: journey.currentLongitude || journey.destinationLongitude,
            triggerType: 'timeout',
            status: 'active'
          });

          // Fetch user's emergency contacts
          const contacts = await Contact.find({ user: user._id });

          // Broadcast emergency alert via WebSocket
          io.emit('sos_triggered', {
            alertId: alert._id,
            user: {
              id: user._id,
              name: user.name,
              phone: user.phone,
              email: user.email,
            },
            journey: {
              destinationName: journey.destinationName,
              travelMode: journey.travelMode,
              vehicleNumber: journey.vehicleNumber,
            },
            latitude: alert.latitude,
            longitude: alert.longitude,
            triggerType: alert.triggerType,
            contacts: contacts.map(c => ({ name: c.name, phone: c.phone, email: c.email })),
            createdAt: alert.createdAt,
          });

          // Notify the mobile client itself of emergency escalation
          io.to(user._id.toString()).emit('emergency_escalated', {
            alertId: alert._id,
            message: 'Emergency escalation triggered due to safety check-in timeout.',
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in travel safety background check loop:', error);
  }
}, 10000); // Check every 10 seconds

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
