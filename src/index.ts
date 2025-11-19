import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';

const app = new Elysia()
  
.use(cors({
  origin: [
    'https://event-monolith-app-shgj.onrender.com',
    'http://localhost:3000' // for local development
  ],
  credentials: true
}))
  .use(swagger({
    documentation: {
      info: {
        title: 'Event Management API',
        version: '1.0.0',
        description: 'A simple monolith event management application with realtime features',
      },
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Events', description: 'Event management endpoints' },
      ],
    },
  }))
  // Serve frontend files manually
  .get('/', () => Bun.file('public/index.html'))
  .get('/styles.css', () => Bun.file('public/styles.css'))
  .get('/app.js', () => Bun.file('public/app.js'))
  .get('/health', () => ({ status: 'OK', timestamp: new Date().toISOString() }))
  
  // Auth endpoints - WITH VALIDATION
  .post('/auth/signup', ({ body, set }) => {
    const { email, password, role } = body as any;
    
    // Basic validation
    if (!email || !password) {
      set.status = 400;
      return { error: 'Email and password required' };
    }
    
    if (!email.includes('@')) {
      set.status = 400;
      return { error: 'Invalid email format' };
    }
    
    if (password.length < 3) {
      set.status = 400;
      return { error: 'Password must be at least 3 characters' };
    }
    
    // Mock success response
    return { 
      message: 'User created successfully', 
      user: { 
        id: 'mock-id', 
        email: email, 
        role: role || 'ATTENDEE' 
      } 
    };
  })
  .post('/auth/login', ({ body, set }) => {
    const { email, password } = body as any;
    
    // Basic validation
    if (!email || !password) {
      set.status = 400;
      return { error: 'Email and password required' };
    }
    
    if (!email.includes('@')) {
      set.status = 400;
      return { error: 'Invalid email format' };
    }
    
    if (password.length < 3) {
      set.status = 400;
      return { error: 'Password must be at least 3 characters' };
    }
    
    // Mock success response
    return { 
      message: 'Login successful', 
      token: 'mock-jwt-token-12345',
      user: { 
        id: 'mock-id', 
        email: email, 
        role: 'ATTENDEE' 
      }
    };
  })
  
  // Event endpoints
  .get('/events', () => ({ 
    events: [
      { 
        id: '1', 
        title: 'Welcome Party 🎉', 
        description: 'Welcome event for all new users to network and connect', 
        date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        location: 'Main Conference Hall', 
        approved: true,
        organizer: { email: 'admin@eventapp.com' }
      },
      { 
        id: '2', 
        title: 'Tech Conference 2024', 
        description: 'Annual technology conference featuring the latest innovations', 
        date: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
        location: 'Convention Center', 
        approved: false,
        organizer: { email: 'organizer@eventapp.com' }
      }
    ] 
  }))
  .post('/events', ({ body }) => ({ 
    message: 'Event created successfully',
    event: {
      id: 'event-' + Math.random().toString(36).substr(2, 9),
      ...(body as any),
      approved: false,
      createdAt: new Date().toISOString(),
      organizer: { email: 'current-user@eventapp.com' }
    }
  }))
  .put('/events/:id/approve', ({ params }) => ({
    message: 'Event approved successfully',
    event: {
      id: params.id,
      approved: true
    }
  }))
  .post('/events/:id/rsvp', ({ params, body }) => ({
    message: `RSVP ${(body as any).status} successful`,
    rsvp: {
      id: 'rsvp-' + Math.random().toString(36).substr(2, 9),
      eventId: params.id,
      status: (body as any).status,
      user: { email: 'current-user@eventapp.com' }
    }
  }))
  
  // WebSocket for realtime updates
  .ws('/ws', {
    open(ws) {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({ 
        type: 'CONNECTED', 
        message: 'Welcome to Event Management WebSocket',
        timestamp: new Date().toISOString()
      }));
    },
    message(ws, message) {
      console.log('WebSocket message received:', message);
      ws.send(JSON.stringify({
        type: 'BROADCAST',
        message: 'This is a realtime update!',
        data: message,
        timestamp: new Date().toISOString()
      }));
    }
  });

const PORT = process.env.PORT || 3000;
app.listen({
  port: PORT,
  hostname: '0.0.0.0'
}, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Swagger docs at http://localhost:${PORT}/swagger`);
  console.log(`🎨 Frontend available at https://event-monolith-app-shgj.onrender.com`);
});