import { Router, Request, Response } from 'express';
import { getUserById, updateUserRole, getAllUsers } from '../module/database';
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';

const router = Router();

router.get('/profile', async (req: Request, res: Response): Promise<void> => {
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
      body: ejs.render(fs.readFileSync(path.join(__dirname, '../views/profile.ejs'), 'utf-8'), {
        user: user,
      }),
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).send('Internal server error');
  }
});

router.get('/admin', async (req: Request, res: Response): Promise<void> => {
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
    res.render('layout', {
      title: 'Admin Panel',
      user: user,
      body: ejs.render(fs.readFileSync(path.join(__dirname, '../views/admin.ejs'), 'utf-8'), {
        users: users,
      }),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Internal server error');
  }
});

router.post('/update', async (req: Request, res: Response): Promise<void> => {
  if (!req.session.userId) {
    res.redirect('/login');
    return;
  }

  if (req.body.username === 'admin') {
    res.redirect('/admin?error=Cannot modify admin user');
    return;
  }

  const referer = req.get('Referer');
  const { username, action } = req.body;

  if (referer && referer.includes('/admin') && (action === 'upgrade' || action === 'downgrade')) {
    try {
      await updateUserRole(username as string, action === 'upgrade' ? 'admin' : 'user');
      res.redirect('/admin?success=Role updated successfully');
    } catch (error) {
      console.error('Role update error:', error);
      res.status(500).send('Internal server error');
    }
    return;
  }
  res.status(403).send('Unauthorized: Invalid Referer');
});

export default router;
