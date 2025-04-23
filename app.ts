import express, { Express, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import ejs from 'ejs';
import fs from 'fs';
import { getUserById, initializeDatabase } from './module/database';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';

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

// db
initializeDatabase();

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

// Use the route files
app.use('/', authRoutes);
app.use('/', userRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
