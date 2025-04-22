import express, { Express, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { getUserByCredentials, getUserById, updateUserRole, getAllUsers } from './module/database';

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

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req: Request, res: Response): void => {
  res.render('index', { user: req.session.userId ? { role: req.session.role } : null });
});

app.get('/login', (req: Request, res: Response): void => {
  res.render('login', { user: null });
});

app.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  try {
    const user = await getUserByCredentials(username, password);
    if (user) {
      req.session.userId = user.id;
      req.session.role = user.role;
      res.redirect('/profile');
    } else {
      res.status(401).send('Invalid credentials');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Internal server error');
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

app.get('/profile', async (req: Request, res: Response): Promise<void> => {
  if (!req.session.userId) {
    res.redirect('/login');
    return;
  }
  try {
    const user = await getUserById(req.session.userId);
    if (!user) {
      res.status(404).send('User not found');
      return;
    }
    res.render('profile', { user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/admin', async (req: Request, res: Response): Promise<void> => {
  if (!req.session.userId) {
    res.redirect('/login');
    return;
  }
  if (req.session.role !== 'admin') {
    res.status(403).send('Access denied');
    return;
  }
  try {
    const users = await getAllUsers();
    res.render('admin', { user: { role: req.session.role }, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/admin-roles', async (req: Request, res: Response): Promise<void> => {
  if (!req.session.userId) {
    res.redirect('/login');
    return;
  }
  const referer = req.get('Referer');
  const { username, action } = req.query;

  if (referer && referer.includes('/admin') && (action === 'upgrade' || action === 'downgrade')) {
    try {
      const newRole = action === 'upgrade' ? 'admin' : 'user';
      await updateUserRole(username as string, newRole);
      res.redirect('/profile');
    } catch (error) {
      console.error('Role update error:', error);
      res.status(500).send('Internal server error');
    }
    return;
  }
  res.status(403).send('Unauthorized: Invalid Referer');
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
