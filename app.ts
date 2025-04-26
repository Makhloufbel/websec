import express, { Express, Request, Response } from 'express';
import session from 'express-session';
import path from 'path';
import ejs from 'ejs';
import fs from 'fs';
import { getUserById, initializeDatabase } from './module/database';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';

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

initializeDatabase();

app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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

app.use('/', authRoutes);
app.use('/', userRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
