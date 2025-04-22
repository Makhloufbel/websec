import express, { Express, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Define interfaces
interface User {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'user';
}

interface SessionData {
  userId?: number;
  role?: 'admin' | 'user';
}

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    role?: 'admin' | 'user';
  }
}

const app: Express = express();
const port = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.static(path.join(__dirname, 'public')));

// In-memory user store
const users: User[] = [
  {
    id: 1,
    username: 'administrator',
    password: 'admin',
    role: 'admin',
  },
  {
    id: 2,
    username: 'wiener',
    password: 'peter',
    role: 'user',
  },
  { id: 3, username: 'carlos', password: 'carlos', role: 'user' },
];

// Routes
app.get('/', (req: Request, res: Response): void => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req: Request, res: Response): void => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    req.session.userId = user.id;
    req.session.role = user.role;
    res.redirect('/profile');
  } else {
    res.status(401).send('Invalid credentials');
  }
});

app.get('/logout', (req: Request, res: Response): void => {
  req.session.destroy((err: Error | null): void => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

app.get('/profile', (req: Request, res: Response): void => {
  if (!req.session.userId) {
    res.redirect('/login');
    return;
  }
  const user = users.find(u => u.id === req.session.userId);
  if (!user) {
    res.status(404).send('User not found');
    return;
  }
  res.send(`
        <h1>Profile</h1>
        <p>Username: ${user.username}</p>
        <p>Role: ${user.role}</p>
        <a href="/logout">Logout</a>
        ${user.role === 'admin' ? '<a href="/admin">Admin Panel</a>' : ''}
    `);
});

app.get('/admin', (req: Request, res: Response): void => {
  if (!req.session.userId) {
    res.redirect('/login');
    return;
  }
  if (req.session.role !== 'admin') {
    res.status(403).send('Access denied');
    return;
  }
  res.send(`
        <h1>Admin Panel</h1>
        <form action="/admin-roles" method="GET">
            <label>Username to promote:</label>
            <input type="text" name="username" required>
            <input type="hidden" name="action" value="upgrade">
            <button type="submit">Promote to Admin</button>
        </form>
        <a href="/profile">Back to Profile</a>
    `);
});

app.get('/admin-roles', (req: Request, res: Response): void => {
  if (!req.session.userId) {
    res.redirect('/login');
    return;
  }
  const referer = req.get('Referer');
  const { username, action } = req.query;

  if (referer && referer.includes('/admin') && action === 'upgrade') {
    const user = users.find(u => u.username === username);
    if (user) {
      user.role = 'admin';
      console.log(user);
      res.redirect('/profile');
      return;
    }
    res.status(404).send('User not found');
    return;
  }
  res.status(403).send('Unauthorized: Invalid Referer');
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
