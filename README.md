# GPC Core Standard Emissions Inventory Web App

This web application allows users to upload data files (CSV, JSON, or Excel) containing emissions inventory data in the CIRIS format. The app harmonizes and integrates the data into a DuckDB database, and provides a modern interface to preview uploaded data and explore sector-based emissions summaries.

## Features
- Upload CSV, JSON, or Excel files (max 40MB)
- Data is parsed and stored in a DuckDB database (`cris_data` table)
- Explore emissions data by sector and GPC reference number
- Modern, responsive UI

## Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation
1. **Clone this repository or download the source code.**
2. **Navigate to the project directory:**
   ```bash
   cd /path/to/your/project
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```

### Running the App
Start the server with:
```bash
node server.js
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Usage
1. Open your browser and go to [http://localhost:3000](http://localhost:3000).
2. Use the upload form to upload your CIRIS-format data file (CSV, JSON, or Excel).
3. After uploading, preview the data and explore sector-based summaries in the "Sector" section below the upload form.

### Project Structure
- `server.js` — Express server, file upload handling, and DuckDB integration
- `index.html` — Main frontend UI
- `data/` — Contains the DuckDB database file
- `uploads/` — Stores uploaded files

### Notes
- Each new upload will overwrite the existing data in the DuckDB table (`cris_data`).
- The app is intended for local or internal use.