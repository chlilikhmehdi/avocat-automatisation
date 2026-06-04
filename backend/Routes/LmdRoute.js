const express = require('express');
const multer = require('multer');
const { uploadExcel } = require('../Controllers/LmdController');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });

// Your route definition (add this if missing too)
router.post('/upload-excel', upload.single('file'), uploadExcel);

// ✅ This line is critical — without it, the router is undefined when imported
module.exports = router;