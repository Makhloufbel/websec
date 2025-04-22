import { Router, Request, Response } from 'express';
import { createUser, getAllUsers, getUserByCredentials } from '../module/database';
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';

const router = Router();

router.get('/login', (req: Request, res: Response): void => {
  try {
    res.render('layout', {
      title: 'Login',
      user: null,
      body: ejs.render(fs.readFileSync(path.join(__dirname, '../views/login.ejs'), 'utf-8'), {
        user: null,
      }),
    });
  } catch (error) {
    console.error('Error rendering login page:', error);
    res.status(500).send('Internal server error');
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
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

router.get('/singup', (req: Request, res: Response): void => {
  res.render('layout', {
    title: 'Singup',
    user: null,
    body: ejs.render(fs.readFileSync(path.join(__dirname, '../views/singup.ejs'), 'utf-8'), {
      user: null,
    }),
  });
});

router.post('/singup', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  const users = await getAllUsers();
  if (users.find(user => user.username === username)) {
    res.status(400).send('User already exists');
    return;
  }
  try {
    await createUser(username, password);
    res.redirect('/login');
  } catch (error) {
    console.error('Singup error:', error);
    res.status(500).send('Internal server error');
  }
});

router.get('/logout', (req: Request, res: Response): void => {
  req.session.destroy((err: Error | null): void => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

export default router;
