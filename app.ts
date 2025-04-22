import express, { Express, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import ejs from 'ejs';
import fs from 'fs';
import { getUserByCredentials, getUserById, updateUserRole, getAllUsers } from './module/database';

// Load environment variables
dotenv.config();

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: 'admin' | 'user';
      };
    }
  }
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
app.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.session.userId ? await getUserById(req.session.userId) : null;
    res.render('layout', {
      title: 'Admin Panel',
      user: user,
      body: ejs.render(fs.readFileSync(path.join(__dirname, 'views/index.ejs'), 'utf-8'), {
        user: user,
      }),
    });
  } catch (error) {
    console.error('Error rendering home page:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/login', (req: Request, res: Response): void => {
  try {
    res.render('layout', {
      title: 'Login',
      user: null,
      body: ejs.render(fs.readFileSync(path.join(__dirname, 'views/login.ejs'), 'utf-8'), {
        user: null,
      }),
    });
  } catch (error) {
    console.error('Error rendering login page:', error);
    res.status(500).send('Internal server error');
  }
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
    res.render('layout', {
      title: 'Profile',
      user: user,
      body: ejs.render(fs.readFileSync(path.join(__dirname, 'views/profile.ejs'), 'utf-8'), {
        user: user,
      }),
    });
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
  const user = await getUserById(req.session.userId);

  try {
    const users = await getAllUsers();
    console.log(users);
    res.render('layout', {
      title: 'Admin Panel',
      user: user,
      body: ejs.render(fs.readFileSync(path.join(__dirname, 'views/admin.ejs'), 'utf-8'), {
        users: users,
      }),
    });
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
