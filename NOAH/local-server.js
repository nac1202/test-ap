const app = require('./api/index');
const express = require('express');
const path = require('path');

// Serve static files for local development
// (In production, Vercel handles this automatically)
app.use(express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Admin page: http://localhost:3000/admin');
});
