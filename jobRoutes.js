const express = require('express');
const db = require('./database/db');
const { authenticate } = require('./auth'); // Import authentication middleware
const axios = require('axios'); // For fetching coordinates from an address

const router = express.Router();

// ✅ Post a new job (Employer Only)
router.post('/post', authenticate, async (req, res) => {
    if (req.user.role !== 'employer') {
        return res.status(403).json({ message: 'Access denied. Only employers can post jobs.' });
    }

    const { title, location, description } = req.body;
    if (!title || !location || !description) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Get latitude & longitude from address (using OpenStreetMap API)
        const geoResponse = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: { q: location, format: 'json', limit: 1 }
        });

        let latitude = null, longitude = null;
        if (geoResponse.data.length > 0) {
            latitude = geoResponse.data[0].lat;
            longitude = geoResponse.data[0].lon;
        }

        db.run(`INSERT INTO jobs (employer_id, title, location, latitude, longitude, description) 
                VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.id, title, location, latitude, longitude, description],
            function (err) {
                if (err) {
                    return res.status(500).json({ message: 'Error posting job', error: err.message });
                }
                res.status(201).json({ message: 'Job posted successfully', jobId: this.lastID });
            }
        );
    } catch (error) {
        res.status(500).json({ message: 'Error fetching location', error: error.message });
    }
});

// ✅ Get all jobs
router.get('/all', (req, res) => {
    db.all(`SELECT * FROM jobs`, [], (err, jobs) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });
        res.json(jobs);
    });
});

// ✅ Get jobs filtered by location
router.get('/search', (req, res) => {
    const { location } = req.query;
    if (!location) return res.status(400).json({ message: 'Location is required' });

    db.all(`SELECT * FROM jobs WHERE location LIKE ?`, [`%${location}%`], (err, jobs) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });
        res.json(jobs);
    });
});

// ✅ Edit a job (Only Employer who posted it)
router.put('/edit/:jobId', authenticate, (req, res) => {
    const { jobId } = req.params;
    const { title, location, description } = req.body;

    if (!title || !location || !description) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    db.get(`SELECT employer_id FROM jobs WHERE id = ?`, [jobId], async (err, job) => {
        if (err || !job) return res.status(404).json({ message: 'Job not found' });

        if (job.employer_id !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to edit this job' });
        }

        try {
            // Update latitude & longitude if location is changed
            const geoResponse = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                params: { q: location, format: 'json', limit: 1 }
            });

            let latitude = null, longitude = null;
            if (geoResponse.data.length > 0) {
                latitude = geoResponse.data[0].lat;
                longitude = geoResponse.data[0].lon;
            }

            db.run(`UPDATE jobs SET title = ?, location = ?, latitude = ?, longitude = ?, description = ? WHERE id = ?`,
                [title, location, latitude, longitude, description, jobId],
                (updateErr) => {
                    if (updateErr) return res.status(500).json({ message: 'Error updating job', error: updateErr.message });
                    res.json({ message: 'Job updated successfully' });
                }
            );
        } catch (error) {
            res.status(500).json({ message: 'Error fetching location', error: error.message });
        }
    });
});

// ✅ Delete a job (Only Employer who posted it)
router.delete('/delete/:jobId', authenticate, (req, res) => {
    const { jobId } = req.params;

    db.get(`SELECT employer_id FROM jobs WHERE id = ?`, [jobId], (err, job) => {
        if (err || !job) return res.status(404).json({ message: 'Job not found' });

        if (job.employer_id !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to delete this job' });
        }

        db.run(`DELETE FROM jobs WHERE id = ?`, [jobId], (deleteErr) => {
            if (deleteErr) return res.status(500).json({ message: 'Error deleting job', error: deleteErr.message });
            res.json({ message: 'Job deleted successfully' });
        });
    });
});

module.exports = router;
