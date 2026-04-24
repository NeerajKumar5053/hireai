const socketHandler = (io) => {
  // Rooms tracking
  const interviewRooms = new Map(); // roomId -> { participants }

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join user's personal room for notifications
    socket.on('join_user_room', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined personal room`);
    });

    // ─── WEBRTC SIGNALING ────────────────────────────────────────────────────

    // Join interview room
    socket.on('join_interview_room', ({ roomId, userId, userRole, userName }) => {
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userId = userId;
      socket.data.userRole = userRole;
      socket.data.userName = userName;

      if (!interviewRooms.has(roomId)) {
        interviewRooms.set(roomId, []);
      }
      const room = interviewRooms.get(roomId);
      room.push({ socketId: socket.id, userId, userRole, userName });

      // Notify others in room
      socket.to(roomId).emit('user_joined', { socketId: socket.id, userId, userRole, userName });

      // Send existing participants to new joiner
      const others = room.filter(p => p.socketId !== socket.id);
      socket.emit('room_participants', others);

      console.log(`🎥 ${userName} (${userRole}) joined room ${roomId}`);
    });

    // WebRTC Offer
    socket.on('webrtc_offer', ({ offer, targetSocketId, from }) => {
      io.to(targetSocketId).emit('webrtc_offer', { offer, from: socket.id, fromUser: from });
    });

    // WebRTC Answer
    socket.on('webrtc_answer', ({ answer, targetSocketId }) => {
      io.to(targetSocketId).emit('webrtc_answer', { answer, from: socket.id });
    });

    // ICE Candidate
    socket.on('ice_candidate', ({ candidate, targetSocketId }) => {
      io.to(targetSocketId).emit('ice_candidate', { candidate, from: socket.id });
    });

    // ─── VIDEO CALL EVENTS ───────────────────────────────────────────────────

    socket.on('toggle_video', ({ roomId, enabled }) => {
      socket.to(roomId).emit('participant_video_toggle', {
        socketId: socket.id,
        userId: socket.data.userId,
        enabled,
      });
    });

    socket.on('toggle_audio', ({ roomId, enabled }) => {
      socket.to(roomId).emit('participant_audio_toggle', {
        socketId: socket.id,
        userId: socket.data.userId,
        enabled,
      });
    });

    // In-call chat message
    socket.on('chat_message', ({ roomId, message, senderName }) => {
      io.to(roomId).emit('chat_message', {
        message,
        senderName,
        senderId: socket.data.userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Screen share
    socket.on('screen_share_started', ({ roomId }) => {
      socket.to(roomId).emit('screen_share_started', { socketId: socket.id });
    });

    socket.on('screen_share_stopped', ({ roomId }) => {
      socket.to(roomId).emit('screen_share_stopped', { socketId: socket.id });
    });

    // ─── AI INTERVIEW EVENTS ─────────────────────────────────────────────────

    // Recruiter can observe live AI interview
    socket.on('join_as_observer', ({ roomId }) => {
      socket.join(`observer_${roomId}`);
    });

    socket.on('ai_interview_transcript', ({ roomId, message }) => {
      socket.to(`observer_${roomId}`).emit('live_transcript', message);
    });

    // ─── INTERVIEW CONTROL ───────────────────────────────────────────────────

    socket.on('end_interview', ({ roomId }) => {
      io.to(roomId).emit('interview_ended', { endedBy: socket.data.userId });
    });

    // ─── DISCONNECT ──────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      if (roomId && interviewRooms.has(roomId)) {
        const room = interviewRooms.get(roomId);
        const updated = room.filter(p => p.socketId !== socket.id);
        if (updated.length === 0) {
          interviewRooms.delete(roomId);
        } else {
          interviewRooms.set(roomId, updated);
        }
        socket.to(roomId).emit('user_left', {
          socketId: socket.id,
          userId: socket.data.userId,
          userName: socket.data.userName,
        });
      }
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketHandler;
