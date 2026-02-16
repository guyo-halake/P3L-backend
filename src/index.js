import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import healthRoutes from './routes/health.js';
import marketRoutes from './routes/market.js';
import { setIO } from './socket.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import clientRoutes from './routes/clients.js';
import emailRoutes from './routes/email.js';
import userSettingsRoutes from './routes/userSettings.js';
import githubRoutes from './routes/github.js';
import orgsRoutes from './routes/orgs.js';
import messageRoutes from './routes/messages.js';
import groupRoutes from './routes/groups.js';
import activityRoutes from './routes/activity.js';
import schoolsRoutes from './routes/schools.js';
import tryhackmeRoutes from './routes/tryhackme.js';
import notionRoutes from './routes/notionRoutes.js';
import notificationRoutes from './routes/notifications.js';
import inviteRoutes from './routes/invites.js';
// import mockRoutes from './routes/mock.js'; // Only enable in development
import { checkEmailReplies } from './services/emailListener.js';
import lecturerRoutes from './routes/lecturers.js';
import classroomRoutes from './routes/classrooms.js';
import classTimeRoutes from './routes/classTimes.js';
import examRoutes from './routes/exams.js';
import documentRoutes from './routes/documents.js';

dotenv.config();

// Debug: Print DB config values
console.log('DB config:', process.env.DB_HOST, process.env.DB_USER, process.env.DB_NAME);

// Start email listener loop (every 5 minutes)
const EMAIL_CHECK_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  checkEmailReplies().catch(err => console.error('Email check failed:', err));
}, EMAIL_CHECK_INTERVAL);

// Initial check on startup (delayed slightly to allow DB connection)
setTimeout(() => {
   checkEmailReplies().catch(err => console.error('Initial email check failed:', err));
}, 5000);


const app = express();
// Resolve project paths for static serving in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../dist');

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
setIO(io);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

import expressSession from 'express-session';

app.use(expressSession({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }, // 1 week
}));

// Health check route
app.use('/api', healthRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/tryhackme', tryhackmeRoutes);
app.use('/api/user-settings', userSettingsRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/messages', (req, res, next) => {
  // console.log removed for production
  next();
}, messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/schools', schoolsRoutes);
import assignmentsRoutes from './routes/assignments.js';
app.use('/api/assignments', assignmentsRoutes);
import labsRoutes from './routes/labs.js';
app.use('/api/labs', labsRoutes);
import feesRoutes from './routes/fees.js';
app.use('/api/fees', feesRoutes);
import reportsRoutes from './routes/reports.js';
app.use('/api/reports', reportsRoutes);
import unitsRoutes from './routes/units.js';
app.use('/api/units', unitsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/notion', notionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invitations', inviteRoutes);
app.use('/api/lecturers', lecturerRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/class-times', classTimeRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/documents', documentRoutes);
// Only enable mock routes in development
let mockRoutes;
if (process.env.NODE_ENV === 'development') {
  // Dynamically import mockRoutes only in development
  // import('./routes/mock.js').then(module => {
  //   mockRoutes = module.default;
  //   app.use('/api/mock', mockRoutes);
  // }
}


app.get('/', (req, res) => {
  res.send('P3L Backend API running');
});

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}


// --- Socket.IO events ---
const onlineUsers = new Map(); // userId -> socket.id

io.on('connection', (socket) => {
  // console.log removed for production

  // Listen for user identification
  socket.on('user_online', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });


  socket.on('send_message', (data) => {
    // data: { to, from, message, timestamp, groupId }
    if (data.groupId) {
      // Group message: broadcast to the group room
      io.to(`group_${data.groupId}`).emit('receive_message', data);
    } else {
      // Private message
      const targetSocketId = onlineUsers.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('receive_message', data);
      }
    }
  });

  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
    // console.log(`User joined group room group_${groupId}`);
  });

  socket.on('messages_read', ({ from, to, groupId }) => {
    if (groupId) {
      io.to(`group_${groupId}`).emit('messages_read', { from, groupId });
    } else {
      const targetSocketId = onlineUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('messages_read', { from });
      }
    }
  });

  socket.on('typing', ({ from, to }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('typing', { from });
    }
  });

  // --- In-app call signaling ---
  socket.on('call_offer', ({ to, from, signal }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_offer', { from, signal });
    }
  });
  socket.on('call_answer', ({ to, signal }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_answer', { signal });
    }
  });
  socket.on('call_end', ({ to }) => {
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_end');
    }
  });

  socket.on('disconnect', () => {
    // Remove user from onlineUsers
    for (const [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit('online_users', Array.from(onlineUsers.keys()));
    // console.log removed for production
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR HANDLER:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
