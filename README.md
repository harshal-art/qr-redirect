# QR Code Generator

A fast and simple QR code generator built with FastAPI and Python. Generate QR codes that never expire and can be downloaded or shared easily.

## Features

- Generate QR codes from text or URLs
- Download QR codes as PNG images
- Share QR codes directly from the app
- Modern, responsive UI
- No expiration - QR codes are saved as static files
- Custom filenames for generated QR codes

## Prerequisites

- Python 3.7+
- pip (Python package installer)

## Installation

1. Clone the repository:
   ```bash
   git clone https://bitbucket.org/datavoice/qr_code_generator.git
   cd QR_CODE_GENERATOR
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: .\venv\Scripts\activate
   ```

3. Install the required packages:
   ```bash
   pip install -r backend/requirements.txt
   ```

## Running the Application

1. Navigate to the backend directory and start the FastAPI development server:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. Open your web browser and navigate to:
   ```
   http://127.0.0.1:8000
   ```

## Usage

1. Enter the text or URL you want to encode in the input field
2. (Optional) Specify a custom filename for the QR code
3. Click "Generate QR Code"
4. Download or share the generated QR code

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
