import express from 'express';

const router = express.Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Users endpoint (example)
router.get('/users', (_req, res) => {
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ];
  
  res.json({
    success: true,
    data: users,
    count: users.length,
  });
});

// Get user by ID
router.get('/users/:id', (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);
  
  if (isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid user ID',
    });
  }
  
  // Mock user data
  const user = {
    id: userId,
    name: `User ${userId}`,
    email: `user${userId}@example.com`,
  };
  
  return res.json({
    success: true,
    data: user,
  });
});

// Create user endpoint
router.post('/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      error: 'Name and email are required',
    });
  }
  
  const newUser = {
    id: Date.now(),
    name,
    email,
    createdAt: new Date().toISOString(),
  };
  
  return res.status(201).json({
    success: true,
    data: newUser,
    message: 'User created successfully',
  });
});

export default router;