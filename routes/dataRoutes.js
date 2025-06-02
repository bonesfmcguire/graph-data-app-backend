const express = require('express');
const multer = require('multer');
const neo4j = require('neo4j-driver');
const { parseCSV } = require('../utils/csvParser');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// Simple text or voice data
router.post('/submit', async (req, res) => {
  const session = driver.session();
  const { name, type } = req.body;

  try {
    await session.run(
      'CREATE (n:Entry {name: $name, type: $type}) RETURN n',
      { name, type }
    );
    res.status(200).json({ message: 'Node created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating node' });
  } finally {
    await session.close();
  }
});

// CSV upload
router.post('/upload-csv', upload.single('file'), async (req, res) => {
  try {
    const entries = await parseCSV(req.file.path);
    const session = driver.session();

    for (const entry of entries) {
      await session.run(
        'CREATE (n:Entry {name: $name, type: $type}) RETURN n',
        entry
      );
    }

    await session.close();
    res.status(200).json({ message: 'CSV processed and nodes created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'CSV processing failed' });
  }
});

module.exports = router;
