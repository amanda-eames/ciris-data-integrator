const express = require('express');
const multer  = require('multer');
const path = require('path');
const app = express();
const PORT = 3000;
const DuckDB = require('duckdb');

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 40 * 1024 * 1024 } // 40MB
});

// Serve the upload form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  // Ensure data directory exists
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  const dbPath = path.join(dataDir, 'mydb.duckdb');
  const db = new DuckDB.Database(dbPath);
  const filePath = path.join(__dirname, req.file.path);
  const ext = path.extname(req.file.originalname).toLowerCase();

  if (ext === '.xlsx') {
    // Install and load spatial extension before running st_read
    db.run('INSTALL spatial;', (err) => {
      if (err) {
        db.close();
        console.error('DuckDB error (install spatial):', err);
        return res.status(500).json({ error: 'Failed to install spatial extension.', details: err.message });
      }
      db.run('LOAD spatial;', (err2) => {
        if (err2) {
          db.close();
          console.error('DuckDB error (load spatial):', err2);
          return res.status(500).json({ error: 'Failed to load spatial extension.', details: err2.message });
        }
        // Custom query for Excel files
        const customQuery = `
          CREATE OR REPLACE TABLE cris_data AS
          SELECT  Field1 as inventory_year,
                  Field2 as gpc_reference_number, 
                  Field3 as sector,
                  Field4 as subsector,
                  Field5 as scope, 
                  Field6 as activity,
                  Field7 as notation_key,
                  Field8 as activity_value,
                  Field9 as activity_units,
                  Field10 as activity_desc,
                  Field11 as activity_datasource,
                  Field12 as activity_dataquailty,
                  Field13 as emission_factor_units,
                  Field14 as emission_factor_co2,
                  Field15 as emission_factor_ch4,
                  Field16 as emission_factor_n2o,
                  Field17 as emission_factor_co2eq,
                  Field18 as emission_factor_co2_bio,
                  Field19 as emission_factor_oxidationfactor,
                  Field20 as emission_factor_year,
                  Field21 as emission_factor_scale,
                  Field22 as emission_factor_desc,
                  Field23 as emission_factor_datasource, 
                  Field24 as emission_factor_dataquailty,
                  Field25 as co2_co2eqtonne,
                  Field26 as ch4_co2eqtonne,
                  Field27 as n20_co2eqtonne,
                  Field28 as total_co2eq,
                  Field29 as total_biogenic_co2eq,
                  Field46 as methodology
          FROM st_read('${filePath}', layer = 'eCRF_3')
          WHERE lower(field6) !='seleccione' 
            AND field1 != 'Inventory year'
            AND field6 != '0';
        `;
        console.log('DuckDB Excel custom query:', customQuery);
        db.run(customQuery, (err3) => {
          if (err3) {
            db.close();
            console.error('DuckDB error (Excel custom query):', err3);
            return res.status(500).json({ error: 'Failed to load Excel file into DuckDB.', details: err3.message });
          }
          db.all('SELECT * FROM cris_data LIMIT 5;', (err4, rows) => {
            db.close();
            if (err4) {
              console.error('DuckDB error (preview):', err4);
              return res.status(500).json({ error: 'Failed to preview table.', details: err4.message });
            }
            res.json({ preview: rows });
          });
        });
      });
    });
    return;
  }

  // CSV/JSON as before
  let createQuery;
  if (ext === '.csv') {
    createQuery = `CREATE OR REPLACE TABLE cris_data AS SELECT * FROM read_csv_auto('${filePath}');`;
  } else if (ext === '.json') {
    createQuery = `CREATE OR REPLACE TABLE cris_data AS SELECT * FROM read_json_auto('${filePath}');`;
  } else {
    console.error('Unsupported file type:', ext);
    return res.status(400).json({ error: 'Unsupported file type.' });
  }
  console.log('DuckDB create/replace query:', createQuery);

  db.run(createQuery, (err) => {
    if (err) {
      db.close();
      console.error('DuckDB error (create table):', err);
      return res.status(500).json({ error: 'Failed to load file into DuckDB.', details: err.message });
    }
    db.all('SELECT * FROM cris_data LIMIT 5;', (err2, rows) => {
      db.close();
      if (err2) {
        console.error('DuckDB error (preview):', err2);
        return res.status(500).json({ error: 'Failed to preview table.', details: err2.message });
      }
      res.json({ preview: rows });
    });
  });
});

// Test endpoint to read a specific CSV file from uploads/
app.get('/test-read', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const DuckDB = require('duckdb');

  // Change this to the name of a CSV file you know exists in uploads/
  const testFile = path.join(__dirname, 'uploads', 'test.csv');
  if (!fs.existsSync(testFile)) {
    return res.status(404).json({ error: 'Test file not found: uploads/test.csv' });
  }

  // Ensure data directory exists
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  const dbPath = path.join(dataDir, 'mydb.duckdb');
  const db = new DuckDB.Database(dbPath);
  const createQuery = `CREATE OR REPLACE TABLE cris_data AS SELECT * FROM read_csv_auto('${testFile}');`;
  console.log('DuckDB test-read query:', createQuery);

  db.run(createQuery, (err) => {
    if (err) {
      db.close();
      console.error('DuckDB error (test-read create table):', err);
      return res.status(500).json({ error: 'Failed to load test file into DuckDB.', details: err.message });
    }
    db.all('SELECT * FROM cris_data LIMIT 5;', (err2, rows) => {
      db.close();
      if (err2) {
        console.error('DuckDB error (test-read preview):', err2);
        return res.status(500).json({ error: 'Failed to preview table.', details: err2.message });
      }
      res.json({ preview: rows });
    });
  });
});

// API endpoint to query cris_data by gpc_reference_number
app.get('/api/cris_data', (req, res) => {
  const gpcRef = req.query.gpc_reference_number;
  if (!gpcRef) {
    return res.status(400).json({ error: 'Missing gpc_reference_number parameter.' });
  }
  const dataDir = path.join(__dirname, 'data');
  const dbPath = path.join(dataDir, 'mydb.duckdb');
  const db = new DuckDB.Database(dbPath);
  const sql = `
    SELECT  gpc_reference_number,
            sector,
            subsector,
            scope,
            notation_key,
            SUM(CAST(total_co2eq AS DOUBLE)) as total_emission_value,
            'tonnes co2eq' as emission_units
    FROM cris_data
    WHERE gpc_reference_number = ?
    GROUP BY gpc_reference_number, sector, subsector, scope, notation_key
  `;
  db.all(sql, [gpcRef], (err, rows) => {
    db.close();
    if (err) {
      console.error('DuckDB error (cris_data API):', err);
      return res.status(500).json({ error: 'Failed to query cris_data.', details: err.message });
    }
    res.json({ data: rows });
  });
});

// API endpoint to query cris_data by sector
app.get('/api/cris_data_by_sector', (req, res) => {
  const sector = req.query.sector;
  if (!sector) {
    return res.status(400).json({ error: 'Missing sector parameter.' });
  }
  const dataDir = path.join(__dirname, 'data');
  const dbPath = path.join(dataDir, 'mydb.duckdb');
  const db = new DuckDB.Database(dbPath);
  const sql = `
    SELECT  gpc_reference_number,
            sector,
            subsector,
            scope,
            notation_key,
            SUM(CAST(total_co2eq AS DOUBLE)) as total_emission_value,
            SUM(TRY_CAST(co2_co2eqtonne AS DOUBLE)) as co2,
            SUM(TRY_CAST(ch4_co2eqtonne AS DOUBLE)) as ch4,
            SUM(TRY_CAST(n20_co2eqtonne AS DOUBLE)) as n20,
            string_agg(DISTINCT activity_datasource, ', ') as datasources,
            'tonnes co2eq' as emission_units
    FROM cris_data
    WHERE sector = ? AND gpc_reference_number IS NOT NULL
    GROUP BY gpc_reference_number, sector, subsector, scope, notation_key
    ORDER BY gpc_reference_number
  `;
  db.all(sql, [sector], (err, rows) => {
    db.close();
    if (err) {
      console.error('DuckDB error (cris_data_by_sector API):', err);
      return res.status(500).json({ error: 'Failed to query cris_data by sector.', details: err.message });
    }
    res.json({ data: rows });
  });
});

// Make sure uploads directory exists
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 