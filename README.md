# QR Code Generator

A modern web application for generating QR codes with various customization options, built with FastAPI and React. Generate QR codes that never expire and can be downloaded or shared easily.

## Features

- Generate QR codes from various sources:
  - URLs
  - vCards (contact information)
  - WiFi network credentials
  - Email addresses
  - SMS messages
  - And more...
  
- Advanced customization options:
  - Custom foreground and background colors
  - Adjustable size and border
  - Multiple output formats (PNG, SVG, PDF)
  - Error correction levels
  
- Modern, responsive React-based UI
- FastAPI backend with RESTful API
- No expiration - QR codes are saved as static files
- Custom filenames for generated QR codes

## Prerequisites

- Python 3.7+
- pip (Python package installer)

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend-react
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```
   The application will open in your default browser at `http://localhost:3000`

## Running the Application

1. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

1. Enter the text or URL you want to encode in the input field
2. (Optional) Specify a custom filename for the QR code
3. Click "Generate QR Code"
4. Download or share the generated QR code

## API Documentation

Once the backend server is running, you can access the interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

- `GET /`: Serves the main web interface
- `POST /generate`: Generates a QR code and returns the file path

## Project Structure

```
QR_CODE_GENERATOR/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py          # FastAPI application
│   ├── persistent_storage/  # Persistent storage for QR codes
│   │   └── qrcodes/
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── static/
│   │   └── logo.jpg
│   └── templates/
│       └── index.html       # Frontend template
└── README.md               # This file
```

## License

This project is open source and available under the [MIT License](LICENSE).
