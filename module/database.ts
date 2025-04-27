import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

dotenv.config();

interface User {
  id?: number;
  username: string;
  password: string;
  role: 'admin' | 'user';
  created_at?: string;
}

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');

const getDbConnection = (): sqlite3.Database => {
  return new sqlite3.Database(
    dbPath,
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    (err: Error | null) => {
      if (err) {
        console.error('Error connecting to database:', err.message);
        console.error('Database path:', dbPath);
        console.error('Current working directory:', process.cwd());
      }
    }
  );
};

const initializeDatabase = (): void => {
  const db = getDbConnection();
  db.serialize(() => {
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const users: User[] = [
      { username: 'admin', password: 'admin', role: 'admin' },
      { username: 'ahmed', password: 'password', role: 'user' },
      { username: 'mohamed', password: 'password', role: 'user' },
      { username: 'yousef', password: 'password', role: 'user' },
      { username: 'sara', password: 'password', role: 'user' },
    ];

    db.run('BEGIN TRANSACTION');

    users.forEach(user => {
      db.run(
        'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)',
        [user.username, user.password, user.role],
        function (err: Error | null) {
          if (err) {
            console.error(`Error inserting user ${user.username}:`, err.message);
          } else if (this.changes > 0) {
            console.log(`Inserted new user: ${user.username}`);
          }
        }
      );
    });

    db.run('COMMIT', (err: Error | null) => {
      if (err) {
        console.error('Error committing transaction:', err.message);
      }
      db.close();
    });
  });
};

// Add new functions for user operations
const getUserByCredentials = (username: string, password: string): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    const db = getDbConnection();
    db.get(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password],
      (err: Error | null, row: any) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      }
    );
  });
};

const getUserById = (id: number): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    const db = getDbConnection();
    db.get('SELECT * FROM users WHERE id = ?', [id], (err: Error | null, row: any) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
};

const updateUserRole = (username: string, role: 'admin' | 'user'): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = getDbConnection();
    db.run(
      'UPDATE users SET role = ? WHERE username = ?',
      [role, username],
      (err: Error | null) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};

const getAllUsers = (): Promise<User[]> => {
  return new Promise((resolve, reject) => {
    const db = getDbConnection();
    db.all(
      'SELECT username, role FROM users ORDER BY username',
      (err: Error | null, rows: User[]) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
};

const createUser = (username: string, password: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = getDbConnection();
    db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, password, 'user'],
      (err: Error | null) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};
export {
  getDbConnection,
  initializeDatabase,
  getUserByCredentials,
  getUserById,
  updateUserRole,
  createUser,
  getAllUsers,
};
export type { User };
