require('dotenv').config();
const express = require('express');
const sequelize = require('./models/index'); // Import Sequelize setup
const app = express();

const PORT = process.env.PORT || 3000;

// Home Route
app.get('/', (req, res) => {
    res.send('Job Board API is running!');
});

sequelize.sync()
  .then(() => {
    console.log('Database connected & synced!');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });

app.get('/', (req, res) => {
  res.send('Backend is running successfully!');
});

// Auth Routes
app.use('/api/auth', authRoutes.router);
app.use('/api/jobs', jobRoutes);


// ✅ Protected Route - Post a Job (Employers Only)
app.post('/api/jobs', authenticate, (req, res) => {
    if (req.user.role !== 'employer') {
        return res.status(403).json({ message: 'Access denied. Only employers can post jobs.' });
    }

    const { title, location, description } = req.body;
    if (!title || !location || !description) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    db.run(
        `INSERT INTO jobs (employer_id, title, location, description) VALUES (?, ?, ?, ?)`,
        [req.user.id, title, location, description],
        function (err) {
            if (err) {
                return res.status(500).json({ message: 'Error posting job', error: err.message });
            }
            res.status(201).json({ message: 'Job posted successfully', jobId: this.lastID });
        }
    );
});

// ✅ Public Route - Get All Jobs
app.get('/api/jobs', (req, res) => {
    db.all("SELECT * FROM jobs", [], (err, jobs) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching jobs', error: err.message });
        }
        res.json(jobs);
    });
});

// ✅ Protected Route - Get Employer's Jobs
app.get('/api/jobs/my', authenticate, (req, res) => {
    if (req.user.role !== 'employer') {
        return res.status(403).json({ message: 'Access denied. Only employers can view their posted jobs.' });
    }

    db.all("SELECT * FROM jobs WHERE employer_id = ?", [req.user.id], (err, jobs) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching jobs', error: err.message });
        }
        res.json(jobs);
    });
});

// Test Route to Check Database
app.get('/test-db', (req, res) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
        res.json({ tables: rows });
        }
    });
});

// Add this below your other job routes in index.js

// Edit a Job (Only employer who created it can edit)
app.put('/api/jobs/:id', authenticate, (req, res) => {
    const jobId = req.params.id;
    const { title, location, description } = req.body;
    const employerId = req.user.id; // Authenticated employer

    // Check if the job exists and belongs to the employer
    db.get(`SELECT * FROM jobs WHERE id = ? AND employer_id = ?`, [jobId, employerId], (err, job) => {
        if (err) return res.status(500).json({ message: 'Server error', error: err.message });
        if (!job) return res.status(403).json({ message: 'Unauthorized or job not found' });

        // Update the job details
        db.run(
            `UPDATE jobs SET title = ?, location = ?, description = ? WHERE id = ?`,
            [title, location, description, jobId],
            function (err) {
                if (err) return res.status(500).json({ message: 'Error updating job', error: err.message });
                res.json({ message: 'Job updated successfully' });
            }
        );
    });
});

// Delete a Job (Only employer who created it can delete)
app.delete('/api/jobs/:id', authenticate, (req, res) => {
    const jobId = req.params.id;
    const employerId = req.user.id;

    // Check if the job exists and belongs to the employer
    db.get(`SELECT * FROM jobs WHERE id = ? AND employer_id = ?`, [jobId, employerId], (err, job) => {
        if (err) return res.status(500).json({ message: 'Server error', error: err.message });
        if (!job) return res.status(403).json({ message: 'Unauthorized or job not found' });

        // Delete the job
        db.run(`DELETE FROM jobs WHERE id = ?`, [jobId], function (err) {
            if (err) return res.status(500).json({ message: 'Error deleting job', error: err.message });
            res.json({ message: 'Job deleted successfully' });
        });
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
