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
   git clone https://github.com/yourusername/QR_CODE_GENERATOR.git
   cd QR_CODE_GENERATOR
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: .\venv\Scripts\activate
   ```

3. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

1. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload
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
├── static/
│   └── qrcodes/          # Generated QR codes are stored here
├── templates/
│   └── index.html        # Frontend template
├── main.py               # FastAPI application
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## License

This project is open source and available under the [MIT License](LICENSE).
