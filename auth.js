const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database/db');
require('dotenv').config();

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// Middleware to protect routes
const authenticate = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const verified = jwt.verify(token.replace('Bearer ', ''), SECRET_KEY);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

// Signup Route
router.post('/signup', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['employer', 'jobseeker'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
            [name, email, hashedPassword, role],
            function (err) {
                if (err) {
                    return res.status(500).json({ message: 'Error creating user', error: err.message });
                }
                res.status(201).json({ message: 'User created successfully', userId: this.lastID });
            });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Login Route
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
    }

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ message: 'Server error', error: err.message });
        if (!user) return res.status(401).json({ message: 'Invalid email or password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token });
    });
});

// Get User Profile (Only logged-in users)
router.get('/profile', authenticate, (req, res) => {
    const userId = req.user.id;

    db.get(`SELECT id, name, email, role FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err) return res.status(500).json({ message: 'Server error', error: err.message });
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user);
    });
});

// Update User Profile
router.put('/profile', authenticate, async (req, res) => {
    const userId = req.user.id;
    const { name, email, password } = req.body;

    try {
        let updateFields = [];
        let values = [];

        if (name) {
            updateFields.push("name = ?");
            values.push(name);
        }

        if (email) {
            updateFields.push("email = ?");
            values.push(email);
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push("password = ?");
            values.push(hashedPassword);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No changes provided' });
        }

        values.push(userId);

        db.run(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`, values, function (err) {
            if (err) return res.status(500).json({ message: 'Error updating profile', error: err.message });
            res.json({ message: 'Profile updated successfully' });
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = { router, authenticate };
