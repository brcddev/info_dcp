const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const USERS_FILE = path.join(__dirname, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_me';
const TOKEN_EXPIRY = '7d';

// Загрузка пользователей
let users = {};
function loadUsers() {
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } else {
    // Создаём пользователя по умолчанию (admin)
    const defaultPassword = bcrypt.hashSync('admin', 10);
    users = {
      admin: { password: defaultPassword, role: 'admin' }
    };
    saveUsers();
  }
}

function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Проверка логина/пароля
function authenticateUser(username, password) {
  const user = users[username];
  if (!user) return false;
  return bcrypt.compareSync(password, user.password);
}

// Генерация JWT
function generateToken(username) {
  return jwt.sign({ username, role: users[username].role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Middleware для проверки JWT
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Добавление нового пользователя (только для админа)
function addUser(username, password, role = 'user') {
  if (users[username]) throw new Error('User already exists');
  users[username] = {
    password: bcrypt.hashSync(password, 10),
    role
  };
  saveUsers();
}

loadUsers();

module.exports = {
  authenticateUser,
  generateToken,
  verifyToken,
  addUser,
  getUsers: () => users
};