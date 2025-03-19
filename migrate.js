const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/jobboard.db');

db.serialize(() => {
    db.run("ALTER TABLE jobs ADD COLUMN latitude REAL", (err) => {
        if (err) console.log("Latitude column may already exist");
    });

    db.run("ALTER TABLE jobs ADD COLUMN longitude REAL", (err) => {
        if (err) console.log("Longitude column may already exist");
    });

    console.log("Migration completed!");
});

db.close();
    