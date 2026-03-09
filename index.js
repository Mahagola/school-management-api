const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port : process.env.DB_PORT,
    ssl : {
        ca : fs.readFileSync(__dirname + '/ca.pem')
    }
});

db.connect((err)=>{
    if(err){
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database');
})

app.post('/addSchool', (req, res)=>{
    const {name, address, latitude, longitude} = req.body;

    if(!name || !address || !latitude || !longitude){
        return res.status(400).json({error: 'Invalid input data. All fields (name, address, latitude, longitude) are required and coordinates must be numbers.'});
    }
    const query =  'INSERT INTO schools(name, address, latitude, longitude) VALUES (?, ?, ?, ?)';
    db.query(query, [name, address, latitude, longitude], (err, result)=>{
        if(err){
            console.error(err);
            return res.status(500).json({error: 'Database error'});
        }
        res.status(201).json({
            message : 'School added successfully',
            schoolId : result.insertId
        });
    });
});


// List Schools API (GET)
app.get('/listSchools', (req, res) => {
    const userLat = parseFloat(req.query.latitude);
    const userLon = parseFloat(req.query.longitude);

    if (isNaN(userLat) || isNaN(userLon)) {
        return res.status(400).json({ error: 'Valid user latitude and longitude are required as query parameters.' });
    }

    const query = 'SELECT * FROM schools';

    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }

        // Calculate distance using the Haversine formula
        const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const toRad = (value) => (value * Math.PI) / 180;
            const R = 6371; // Earth's radius in kilometers
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; 
        };

        const sortedSchools = results.map(school => {
            const distance = calculateDistance(userLat, userLon, school.latitude, school.longitude);
            return { ...school, distance: distance };
        }).sort((a, b) => a.distance - b.distance);

        res.status(200).json(sortedSchools);
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is actually running on port ${PORT}`);
});



