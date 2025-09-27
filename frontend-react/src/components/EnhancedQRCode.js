import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FiDownload, FiCopy, FiUpload, FiSquare, FiCircle, FiBox, FiAward, FiX } from 'react-icons/fi';
import './LogoSection.css';
import './QRForm.css';

// QR Code Types
const QR_TYPES = {
  URL: 'url',
  TEXT: 'text',
  SMS: 'sms',
  VCARD: 'vcard',
  WIFI: 'wifi',
  EMAIL: 'email',
  LOCATION: 'location',
  EVENT: 'event'
};

const EnhancedQRCode = () => {
  // QR Code State
  const [qrType, setQrType] = useState(QR_TYPES.URL);
  const [qrData, setQrData] = useState('https://example.com');
  const [size, setSize] = useState(139);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [logo, setLogo] = useState('');
  const [activeTab, setActiveTab] = useState('content');
  const [qrStyle, setQrStyle] = useState('squares');
  // Logo size is fixed at 20% of QR code size
  const logoSize = 20; // Fixed logo size at 20% of QR code
  
  // Default logo options with embedded SVG data URLs for consistent rendering
  const defaultLogos = [
    // QR Code Type Icons
    { 
      id: 'scan-me', 
      name: 'Scan Me', 
      icon: 'fas fa-qrcode', 
      color: '#3B82F6', 
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%233B82F6" d="M3 3h7v2H5v4H3V3m9 0h8v6h-2V5h-6V3m-9 9h2v2h2v2H3v-4m12 0h6v4h-2v-2h-4v-2m-6 4h2v2h2v2H9v-4m8 0v2h-2v2h2v2h2v-2h2v-2h-4m-2 2h-2v2h2v-2z"/></svg>'
    },
    
    // Social Media Icons
    { 
      id: 'facebook', 
      name: 'Facebook', 
      icon: 'fab fa-facebook',
      color: '#1877F2',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231877F2"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>'
    },
    { 
      id: 'instagram', 
      name: 'Instagram', 
      icon: 'fab fa-instagram',
      color: '#E1306C',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="url(%23insta-gradient)"><defs><linearGradient id="insta-gradient" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="%23f09433"/><stop offset="25%" stop-color="%23e6683c"/><stop offset="50%" stop-color="%23dc2743"/><stop offset="75%" stop-color="%23cc2366"/><stop offset="100%" stop-color="%23bc1888"/></linearGradient></defs><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.882 1.44 1.44 0 000-2.882z"/></svg>'
    },
    { 
      id: 'twitter', 
      name: 'Twitter', 
      icon: 'fab fa-twitter',
      color: '#1DA1F2',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231DA1F2"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>'
    },
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      icon: 'fab fa-linkedin',
      color: '#0A66C2',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>'
    },
    { 
      id: 'youtube', 
      name: 'YouTube', 
      icon: 'fab fa-youtube',
      color: '#FF0000',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
    },
    { 
      id: 'whatsapp', 
      name: 'WhatsApp', 
      icon: 'fab fa-whatsapp',
      color: '#25D366',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2325D366"><path d="M17.498 14.382l-1.21-1.12a2.5 2.5 0 0 0-1.72-.68h-.077a2.2 2.2 0 0 0-1.534.648l-.44.44a.25.25 0 0 1-.354 0l-1.83-1.83a.25.25 0 0 1 0-.353l.44-.44a2.2 2.2 0 0 0 .648-1.534v-.11a2.5 2.5 0 0 0-.68-1.72l-1.12-1.21a2.5 2.5 0 0 0-1.82-.82H7.5a2.5 2.5 0 0 0-2.5 2.5v.18a10.5 10.5 0 0 0 3.1 7.43l.18.18a10.5 10.5 0 0 0 7.43 3.1h.18a2.5 2.5 0 0 0 2.5-2.5v-.68a2.5 2.5 0 0 0-.82-1.82zM12 2a10 10 0 0 1 10 10 9.92 9.92 0 0 1-2.94 7.07A9.92 9.92 0 0 1 12 22a9.92 9.92 0 0 1-7.07-2.93A9.92 9.92 0 0 1 2 12a9.92 9.92 0 0 1 2.93-7.07A9.92 9.92 0 0 1 12 2z"/></svg>'
    },
    { 
      id: 'tiktok', 
      name: 'TikTok', 
      icon: 'fab fa-tiktok',
      color: '#000000',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23000000"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.04 2.1 1.39 3.6 3.46 3.84v4.32c-1.2.12-2.35-.3-3.24-1.13-.89-.84-1.33-2.01-1.26-3.21h-1.87v12.27c0 1.54-1.29 2.78-2.87 2.75-1.59-.03-2.83-1.3-2.83-2.85 0-1.57 1.28-2.82 2.88-2.82.28 0 .54.04.79.11v-2.54c-.29-.05-.58-.08-.88-.08-3.23 0-5.84 2.6-5.84 5.82 0 3.21 2.61 5.81 5.83 5.81 3.22 0 5.83-2.6 5.83-5.81V6.49c1.17.9 2.7 1.48 4.3 1.48v-3.1c-1.72 0-3.28-.92-4.13-2.4-.85-1.48-.85-3.29 0-4.77.85-1.48 2.41-2.4 4.13-2.4h4.5v3.1h-4.5c-.28 0-.5.22-.5.5s.22.5.5.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5h-1.5v3.1h1.5c2.76 0 5-2.24 5-5v-8.1c0-.28-.22-.5-.5-.5h-3.1c-.28 0-.5.22-.5.5v1.53c-1.38-.93-3.03-1.48-4.78-1.48h-1.22z"/></svg>'
    },
    { 
      id: 'pinterest', 
      name: 'Pinterest', 
      icon: 'fab fa-pinterest',
      color: '#E60023',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23E60023"><path d="M12.017 0C5.396 0 .062 5.34.062 11.971c0 5.275 3.273 9.775 7.89 11.585-.107-.94-.201-2.383.042-3.408.22-.94 1.422-5.975 1.422-5.975s-.361-.72-.361-1.783c0-1.67.967-2.916 2.17-2.916 1.023 0 1.518.769 1.518 1.69 0 1.03-.656 2.566-.997 3.99-.28 1.197.59 2.17 1.768 2.17 2.122 0 3.767-2.24 3.767-5.467 0-2.857-2.055-4.861-4.986-4.861-3.394 0-5.386 2.54-5.386 5.182 0 1.03.395 2.132.888 2.73.098.12.111.224.083.347-.091.38-.293 1.2-.333 1.36-.052.22-.174.266-.404.16-1.5-.7-2.438-2.89-2.438-4.65 0-3.785 2.75-7.262 7.927-7.262 4.162 0 7.397 2.963 7.397 6.927 0 4.135-2.608 7.464-6.227 7.464-1.217 0-2.36-.63-2.752-1.38l-.75 2.853c-.272 1.04-1.002 2.35-1.492 3.144 1.124.347 2.314.535 3.554.535 6.575 0 11.9-5.33 11.9-11.9C23.92 5.33 18.592 0 12.017 0z"/></svg>'
    },
    
    // Food & Restaurant Icons
    { 
      id: 'restaurant', 
      name: 'Restaurant', 
      icon: 'fas fa-utensils',
      color: '#E74C3C',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23E74C3C"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3 4 3v9h2v-9c2.34 0 4-.88 4-3V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>'
    },
    { 
      id: 'food', 
      name: 'Food', 
      icon: 'fas fa-hamburger',
      color: '#F39C12',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23F39C12"><path d="M18.06 22.99h1.9c.55 0 1-.45 1-1v-8.03c0-.55-.45-1-1-1h-1.9c-.55 0-1 .45-1 1v8.03c0 .55.45 1 1 1zM12 22.99h1.9c.55 0 1-.45 1-1v-16c0-.55-.45-1-1-1H12c-.55 0-1 .45-1 1v16c0 .55.45 1 1 1zM5.9 22.99h1.9c.55 0 1-.45 1-1V1c0-.55-.45-1-1-1H5.9c-.55 0-1 .45-1 1v20.99c0 .55.45 1 1 1z"/></svg>'
    },
    { 
      id: 'pizza', 
      name: 'Pizza', 
      icon: 'fas fa-pizza-slice',
      color: '#E67E22',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23E67E22"><path d="M12 2C8.43 2 5.23 3.54 3.01 6L12 22l8.99-16C18.78 3.55 15.57 2 12 2zM7 7c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm5 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>'
    },
    { 
      id: 'coffee', 
      name: 'Coffee', 
      icon: 'fas fa-coffee',
      color: '#6F4E37',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236F4E37"><path d="M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.83 2.95 7.18 6.78 7.29 3.96.12 7.22-3.2 7.22-7.15V5c0-.55-.45-1-1-1zm-2.5 7H8V7h8v3z"/><path d="M20 18H4c-.55 0-1 .45-1 1s.45 1 1 1h16c.55 0 1-.45 1-1s-.45-1-1-1z"/></svg>'
    },
    { 
      id: 'cocktail', 
      name: 'Bar', 
      icon: 'fas fa-cocktail',
      color: '#9B59B6',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239B59B6"><path d="M7.5 5L6 9h12l-1.5-4h-9zM3 10l2 14h14l2-14H3zm9.5-8c-.83 0-1.5.67-1.5 1.5S11.67 5 12.5 5s1.5-.67 1.5-1.5S13.33 2 12.5 2z"/></svg>'
    },
    
    // Business & Services Icons
    { 
      id: 'store', 
      name: 'Store', 
      icon: 'fas fa-store',
      color: '#3498DB',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233498DB"><path d="M5 8h14v10h-4v-5H9v5H5V8zm7 1l3 3h-2v4h-2v-4H9l3-3zm11-5v16h-2V4H3v16H1V4c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2z"/></svg>'
    },
    { 
      id: 'hotel', 
      name: 'Hotel', 
      icon: 'fas fa-hotel',
      color: '#9B59B6',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239B59B6"><path d="M7 14c1.66 0 3-1.34 3-3S8.66 8 7 8s-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm12-3h-8v8H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4zm2 8h-8V9h6c1.1 0 2 .9 2 2v4z"/></svg>'
    },
    { 
      id: 'shopping-bag', 
      name: 'Shopping', 
      icon: 'fas fa-shopping-bag',
      color: '#2ECC71',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232ECC71"><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12z"/></svg>'
    },
    { 
      id: 'car', 
      name: 'Transport', 
      icon: 'fas fa-car',
      color: '#E74C3C',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23E74C3C"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>'
    },
    { 
      id: 'gift', 
      name: 'Gift', 
      icon: 'fas fa-gift',
      color: '#E74C3C',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23E74C3C"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35-.54-.81-1.45-1.35-2.5-1.35-1.66 0-3 1.34-3 3 0 .35.07.69.18 1H4c-1.11 0-1.99.9-1.99 2L2 19c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 12 7.4l3.38 4.6L17 10.83 14.92 8H20v6z"/></svg>'
    },
    
    // Technology Icons
    { 
      id: 'app', 
      name: 'App', 
      icon: 'fas fa-mobile-alt',
      color: '#3498DB',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233498DB"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-4.2-5.76v1.75L16 12l-3.2-2.98v1.7c-3.11.43-4.35 2.56-4.55 4.41 1.2-1.53 2.55-1.9 3.45-2.01z"/></svg>'
    },
    { 
      id: 'globe', 
      name: 'Website', 
      icon: 'fas fa-globe',
      color: '#3B82F6',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233B82F6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
    },
    { 
      id: 'wifi', 
      name: 'WiFi', 
      icon: 'fas fa-wifi',
      color: '#F59E0B',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23F59E0B"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>'
    },
    
    // Payment Icons
    { 
      id: 'credit-card', 
      name: 'Payment', 
      icon: 'far fa-credit-card',
      color: '#9B59B6',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239B59B6"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>'
    },
    { 
      id: 'paypal', 
      name: 'PayPal', 
      icon: 'fab fa-paypal',
      color: '#003087',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23003087"><path d="M7.5 3.5c-1.1 0-2 .9-2 2v1.5h-1c-.83 0-1.5.67-1.5 1.5v3c0 .83.67 1.5 1.5 1.5h1v1.5c0 1.1.9 2 2 2h3c1.1 0 2-.9 2-2v-1.5h1c.83 0 1.5-.67 1.5-1.5v-3c0-.83-.67-1.5-1.5-1.5h-1V5.5c0-1.1-.9-2-2-2h-3zm0 1.5h3v1.5h-3V5zm0 3h3v1.5h-3V8zm-1.5 3h6v3h-6v-3z"/></svg>'
    },
    
    // Location & Navigation
    { 
      id: 'map-marker', 
      name: 'Location', 
      icon: 'fas fa-map-marker-alt',
      color: '#EF4444',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23EF4444"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'
    },
    { 
      id: 'directions', 
      name: 'Directions', 
      icon: 'fas fa-directions',
      color: '#3498DB',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233498DB"><path d="M21.41 10.05l-9-9C12.05.54 11.55 0 11 0H3C1.9 0 1 .9 1 2v8c0 .55.45 1 1 1s1-.45 1-1V3h6v3c0 1.1.9 2 2 2h3v3c0 .55.45 1 1 1s1-.45 1-1V8.41l-5-5H5v2c0 .55-.45 1-1 1s-1-.45-1-1V3c0-.55.45-1 1-1h4.59l9 9c.39.39.39 1.02 0 1.41l-9 9c-.39.39-1.02.39-1.41 0l-7-7c-.39-.39-.39-1.02 0-1.41s1.02-.39 1.41 0L12 19.58l6.29-6.29c.39-.39 1.02-.39 1.41 0l.71.71c.39.39.39 1.02 0 1.41l-7 7c-.39.39-1.02.39-1.41 0l-9-9c-.39-.39-.39-1.02 0-1.41l9-9c.39-.39 1.02-.39 1.41 0l9 9c.39.39.39 1.02 0 1.41l-1.41-1.41z"/></svg>'
    },
    
    // Other Common Icons
    { 
      id: 'calendar', 
      name: 'Event', 
      icon: 'far fa-calendar-alt',
      color: '#10B981',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2310B981"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>'
    },
    { 
      id: 'envelope', 
      name: 'Email', 
      icon: 'far fa-envelope',
      color: '#EC4899',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23EC4899"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>'
    },
    { 
      id: 'phone', 
      name: 'Call', 
      icon: 'fas fa-phone-alt',
      color: '#10B981',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2310B981"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>'
    },
    { 
      id: 'user', 
      name: 'User', 
      icon: 'fas fa-user',
      color: '#3498DB',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233498DB"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'
    }
  ];
  
  const [qrShape, setQrShape] = useState('square');
  
  // QR code styles and shapes with icons
  const qrStyles = [
    { id: 'squares', label: 'Squares', icon: <FiSquare /> },
    { id: 'dots', label: 'Dots', icon: <FiBox /> },
    { id: 'rounded', label: 'Rounded', icon: <FiSquare style={{borderRadius: '4px'}} /> },
  ];
  
  const qrShapes = [
    { id: 'square', label: 'Square', icon: <FiSquare /> },
    { id: 'circle', label: 'Circle', icon: <FiCircle /> },
    { id: 'diamond', label: 'Diamond', icon: <FiAward style={{transform: 'rotate(45deg)'}} /> },
  ];
  
  // State for validation errors
  const [errors, setErrors] = useState({});

  // Form data for different QR types
  const [formData, setFormData] = useState({
    url: 'https://example.com',
    text: '',
    sms: { number: '', message: '' },
    email: { to: '', subject: '', body: '' },
    vcard: {
      fullName: '',
      organization: '',
      title: '',
      phone: '',
      email: '',
      website: '',
      address: ''
    },
    wifi: { ssid: '', password: '', security: 'WPA', hidden: false },
    location: { latitude: '', longitude: '' },
    event: { title: '', location: '', start: '', end: '', description: '' }
  });
  
  // Refs
  const qrRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Keep the canvas in sync with the QR code display
  useEffect(() => {
    if (qrRef.current && canvasRef.current) {
      const svg = qrRef.current.querySelector('svg');
      if (svg) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the QR code on the canvas
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // If there's a logo, draw it in the center
          if (logo) {
            const logoImg = new Image();
            logoImg.onload = () => {
              const logoSize = Math.min(canvas.width, canvas.height) * 0.2; // 20% of QR code size
              const x = (canvas.width - logoSize) / 2;
              const y = (canvas.height - logoSize) / 2;
              
              // Draw a white background for the logo
              ctx.fillStyle = '#ffffff';
              const padding = logoSize * 0.1; // 10% padding
              ctx.fillRect(
                x - padding, 
                y - padding, 
                logoSize + padding * 2, 
                logoSize + padding * 2
              );
              
              // Draw the logo
              ctx.drawImage(logoImg, x, y, logoSize, logoSize);
            };
            logoImg.src = logo;
          }
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      }
    }
  }, [qrType, qrData, size, fgColor, bgColor, logo, qrShape]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 2 * 1024 * 1024) {
        alert('File size should not exceed 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogo(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Download QR Code
  const downloadQRCode = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `qrcode-${new Date().getTime()}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Copy QR Code to clipboard
  const copyQRCode = async () => {
    if (!canvasRef.current) return;
    
    try {
      // First try the modern API
      if (navigator.clipboard && window.ClipboardItem) {
        const blob = await new Promise(resolve => 
          canvasRef.current.toBlob(resolve, 'image/png')
        );
        await navigator.clipboard.write([
          new window.ClipboardItem({ 'image/png': blob })
        ]);
        alert('QR Code copied to clipboard!');
        return;
      }
      
      // Fallback for browsers that don't support ClipboardItem
      canvasRef.current.toBlob(blob => {
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(
          () => alert('QR Code copied to clipboard!'),
          () => fallbackCopyToClipboard()
        );
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      fallbackCopyToClipboard();
    }
  };
  
  // Fallback copy method
  const fallbackCopyToClipboard = () => {
    // Create a temporary textarea to copy the URL
    const textArea = document.createElement('textarea');
    textArea.value = generateQRCode();
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      const msg = successful ? 'URL copied to clipboard!' : 'Failed to copy';
      alert(msg);
    } catch (err) {
      console.error('Fallback copy failed:', err);
      alert('Failed to copy. Please try manually.');
    }
    
    document.body.removeChild(textArea);
  };

  // Generate QR code data based on type
  const generateQRCode = () => {
    switch (qrType) {
      case QR_TYPES.URL:
        return formData.url;
      case QR_TYPES.TEXT:
        return formData.text;
      case QR_TYPES.SMS:
        return `SMSTO:${formData.sms.number}:${encodeURIComponent(formData.sms.message)}`;
      case QR_TYPES.EMAIL:
        return `mailto:${formData.email.to}?subject=${encodeURIComponent(formData.email.subject)}&body=${encodeURIComponent(formData.email.body)}`;
      case QR_TYPES.VCARD:
        return generateVCard();
      case QR_TYPES.WIFI:
        return `WIFI:S:${formData.wifi.ssid};T:${formData.wifi.security};P:${formData.wifi.password};;`;
      case QR_TYPES.LOCATION:
        return `geo:${formData.location.latitude},${formData.location.longitude}`;
      case QR_TYPES.EVENT:
        return generateVEvent();
      default:
        return formData.url;
    }
  };

  // Generate vCard string
  const generateVCard = () => {
    const { fullName, organization, title, phone, email, website, address } = formData.vcard;
    let vcard = 'BEGIN:VCARD\n';
    vcard += 'VERSION:3.0\n';
    vcard += `N:${fullName};;;;\n`;
    vcard += `FN:${fullName}\n`;
    if (organization) vcard += `ORG:${organization}\n`;
    if (title) vcard += `TITLE:${title}\n`;
    if (phone) vcard += `TEL:${phone}\n`;
    if (email) vcard += `EMAIL:${email}\n`;
    if (website) vcard += `URL:${website}\n`;
    if (address) vcard += `ADR:;;${address};;;;\n`;
    vcard += 'END:VCARD';
    return vcard;
  };

  // Generate vEvent string
  const generateVEvent = () => {
    const { title, location, start, end, description } = formData.event;
    let vevent = 'BEGIN:VEVENT\n';
    vevent += 'VERSION:2.0\n';
    if (title) vevent += `SUMMARY:${title}\n`;
    if (location) vevent += `LOCATION:${location}\n`;
    if (start) vevent += `DTSTART:${formatDateForIcs(start)}\n`;
    if (end) vevent += `DTEND:${formatDateForIcs(end)}\n`;
    if (description) vevent += `DESCRIPTION:${description.replace(/\n/g, '\\n')}\n`;
    vevent += 'END:VEVENT';
    return vevent;
  };

  // Format date for iCalendar
  const formatDateForIcs = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Validate phone number input
    if (name === 'sms.number' && value !== '') {
      // Only allow numbers, +, and spaces
      if (!/^[0-9+\s]*$/.test(value)) {
        setErrors(prev => ({ ...prev, phone: 'Please enter a valid phone number (only numbers and +)' }));
        return;
      } else {
        setErrors(prev => ({ ...prev, phone: '' }));
      }
    }
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Render content form based on QR type
  const renderContentForm = () => {
    switch (qrType) {
      case QR_TYPES.URL:
        return (
          <div className="form-group">
            <label>Website URL</label>
            <input
              type="url"
              name="url"
              value={formData.url}
              onChange={handleInputChange}
              placeholder="https://example.com"
              required
            />
          </div>
        );

      case QR_TYPES.TEXT:
        return (
          <div className="form-group">
            <label>Text</label>
            <textarea
              name="text"
              value={formData.text}
              onChange={handleInputChange}
              placeholder="Enter your text here..."
              rows={4}
              required
            />
          </div>
        );

      case QR_TYPES.SMS:
        return (
          <>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="sms.number"
                value={formData.sms.number}
                onChange={handleInputChange}
                placeholder="Your phone number"
                className={errors.phone ? 'error' : ''}
                required
              />
              {errors.phone && <div className="error-message">{errors.phone}</div>}
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea
                name="sms.message"
                value={formData.sms.message}
                onChange={handleInputChange}
                placeholder="Your message here..."
                rows={3}
              />
            </div>
          </>
        );

      case QR_TYPES.EMAIL:
        return (
          <>
            <div className="form-group">
              <label>To</label>
              <input
                type="email"
                name="email.to"
                value={formData.email.to}
                onChange={handleInputChange}
                placeholder="recipient@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                name="email.subject"
                value={formData.email.subject}
                onChange={handleInputChange}
                placeholder="Email subject"
              />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea
                name="email.body"
                value={formData.email.body}
                onChange={handleInputChange}
                placeholder="Your email message..."
                rows={3}
              />
            </div>
          </>
        );

      case QR_TYPES.VCARD:
        return (
          <div className="vcard-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="vcard.fullName"
                value={formData.vcard.fullName}
                onChange={handleInputChange}
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label>Organization</label>
              <input
                type="text"
                name="vcard.organization"
                value={formData.vcard.organization}
                onChange={handleInputChange}
                placeholder="Company Inc."
              />
            </div>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                name="vcard.title"
                value={formData.vcard.title}
                onChange={handleInputChange}
                placeholder="Job Title"
              />
            </div>
            <div className="form-row">
              <div className="form-group form-group-third" style={{ height: '38px' }}>
                <label>Phone</label>
                <input
                  type="tel"
                  name="vcard.phone"
                  value={formData.vcard.phone}
                  onChange={handleInputChange}
                  placeholder="+1234567890"
                />
              </div>
              <div className="form-group form-group-third" style={{ height: '38px' }}>
                <label>Email</label>
                <input
                  type="email"
                  name="vcard.email"
                  value={formData.vcard.email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                />
              </div>
              <div className="form-group form-group-third" style={{ height: '38px' }}>
                <label>Website</label>
                <input
                  type="url"
                  name="vcard.website"
                  value={formData.vcard.website}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                name="vcard.address"
                value={formData.vcard.address}
                onChange={handleInputChange}
                placeholder="123 Main St, City, Country"
              />
            </div>
          </div>
        );

      case QR_TYPES.WIFI:
        return (
          <>
            <div className="form-group">
              <label>Network Name (SSID)</label>
              <input
                type="text"
                name="wifi.ssid"
                value={formData.wifi.ssid}
                onChange={handleInputChange}
                placeholder="WiFi Network Name"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="wifi.password"
                value={formData.wifi.password}
                onChange={handleInputChange}
                placeholder="WiFi Password"
              />
            </div>
            <div className="form-group">
              <label>Security Type</label>
              <select
                name="wifi.security"
                value={formData.wifi.security}
                onChange={handleInputChange}
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">None (Open Network)</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="hiddenNetwork"
                name="wifi.hidden"
                checked={formData.wifi.hidden}
                onChange={handleInputChange}
              />
              <label htmlFor="hiddenNetwork">Hidden Network</label>
            </div>
          </>
        );

      case QR_TYPES.LOCATION:
        return (
          <>
            <div className="form-group">
              <label>Latitude</label>
              <input
                type="number"
                step="any"
                name="location.latitude"
                value={formData.location.latitude}
                onChange={handleInputChange}
                placeholder="37.7749"
              />
            </div>
            <div className="form-group">
              <label>Longitude</label>
              <input
                type="number"
                step="any"
                name="location.longitude"
                value={formData.location.longitude}
                onChange={handleInputChange}
                placeholder="-122.4194"
              />
            </div>
          </>
        );

      case QR_TYPES.EVENT:
        return (
          <div>
            <div className="form-group">
              <label>Event Title</label>
              <input
                type="text"
                name="event.title"
                value={formData.event.title}
                onChange={handleInputChange}
                placeholder="Event Name"
                required
                style={{ height: '38px' }}
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="event.location"
                value={formData.event.location}
                onChange={handleInputChange}
                placeholder="Event location"
                style={{ height: '38px' }}
              />
            </div>
            <div className="form-row">
              <div className="form-group form-group-half">
                <label>Start Date/Time</label>
                <input
                  type="datetime-local"
                  name="event.start"
                  value={formData.event.start}
                  onChange={handleInputChange}
                  style={{ height: '38px' }}
                />
              </div>
              <div className="form-group form-group-half">
                <label>End Date/Time</label>
                <input
                  type="datetime-local"
                  name="event.end"
                  value={formData.event.end}
                  onChange={handleInputChange}
                  style={{ height: '38px' }}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="event.description"
                value={formData.event.description}
                onChange={handleInputChange}
                placeholder="Event description..."
                rows={3}
                style={{ minHeight: '80px', resize: 'vertical' }}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'content':
        return renderContentForm();
      
      case 'design':
        return (
          <div className="design-options">
            <div className="design-option">
              <label>Size: {size}px</label>
              <input
                type="range"
                min="100"
                max="500"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value))}
                className="size-slider"
              />
            </div>
            
            <div className="design-option">
              <label>Foreground</label>
              <div className="color-picker-container">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="color-picker"
                />
                <span className="color-value">{fgColor}</span>
              </div>
            </div>
            
            <div className="design-option">
              <label>Background</label>
              <div className="color-picker-container">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="color-picker"
                />
                <span className="color-value">{bgColor}</span>
              </div>
            </div>
            
            <div className="design-option">
              <label>Frame</label>
              <select
                value={qrStyle}
                onChange={(e) => setQrStyle(e.target.value)}
                className="style-dropdown"
              >
                {qrStyles.map(style => (
                  <option key={style.id} value={style.id}>
                    {style.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="design-option">
              <label>Shape</label>
              <select
                value={qrShape}
                onChange={(e) => setQrShape(e.target.value)}
                className="shape-dropdown"
              >
                {qrShapes.map(shape => (
                  <option key={shape.id} value={shape.id}>
                    {shape.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
          
      case 'logo':
        return (
          <div className="logo-upload">
            <div 
              className={`logo-upload-area ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="logo-upload-content">
                <div className="logo-preview-container">
                  {logo ? (
                    <>
                      <div className="logo-preview">
                        <img 
                          src={logo} 
                          alt="Logo preview" 
                          className="logo-image"
                        />
                      </div>
                      <button 
                        className="remove-logo-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLogo('');
                        }}
                        title="Remove logo"
                      >
                        <FiX size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="logo-upload-placeholder">
                      <div className="upload-icon">
                        <FiUpload size={24} />
                      </div>
                      <h4>Drag and drop or click to upload a logo</h4>
                      <p className="file-types">JPG, JPEG, or PNG / 2MB max</p>
                    </div>
                  )}
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/jpeg,image/png,image/jpg"
                style={{ display: 'none' }}
              />
            </div>
            <div className="default-logos">
              <h4>Or choose a default logo:</h4>
              <div className="default-logos-container">
                <div className="default-logos-grid">
                  {defaultLogos.map((defaultLogo) => {
                    // For icons, we'll use the icon class as the logo value
                    const logoValue = defaultLogo.url || `icon:${defaultLogo.icon}`;
                    return (
                    <div 
                      key={defaultLogo.id}
                      className={`default-logo-option ${logo === logoValue ? 'active' : ''}`}
                      onClick={() => setLogo(logoValue)}
                      title={defaultLogo.name}
                    >
                      <div 
                        className="default-logo" 
                        style={{ backgroundColor: defaultLogo.color }}
                      >
                        <i className={defaultLogo.icon}></i>
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const qrTypeOptions = [
    { type: QR_TYPES.URL, label: 'Website URL', icon: '🌐' },
    { type: QR_TYPES.TEXT, label: 'Plain Text', icon: '📝' },
    { type: QR_TYPES.SMS, label: 'SMS', icon: '💬' },
    { type: QR_TYPES.EMAIL, label: 'Email', icon: '✉️' },
    { type: QR_TYPES.VCARD, label: 'Contact', icon: '👤' },
    { type: QR_TYPES.WIFI, label: 'WiFi', icon: '📶' },
    { type: QR_TYPES.LOCATION, label: 'Location', icon: '📍' },
    { type: QR_TYPES.EVENT, label: 'Event', icon: '📅' },
  ];

  return (
    <div className="enhanced-qr-generator">
      <div className="qr-layout">
        <div className="qr-sidebar">
          <div className="qr-type-selector">
            <h3>QR Code Types</h3>
            <div className="qr-type-options">
              {qrTypeOptions.map((option) => (
                <button
                  key={option.type}
                  className={`qr-type-btn ${qrType === option.type ? 'active' : ''}`}
                  onClick={() => setQrType(option.type)}
                >
                  <span className="qr-type-icon">{option.icon}</span>
                  <span className="qr-type-label">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="qr-main-content">
          <div className="content-section">
            <div className="form-content">
              <div className="tabs">
                <button 
                  className={`tab ${activeTab === 'content' ? 'active' : ''}`}
                  onClick={() => setActiveTab('content')}
                >
                  Content
                </button>
                <button 
                  className={`tab ${activeTab === 'design' ? 'active' : ''}`}
                  onClick={() => setActiveTab('design')}
                >
                  Design your QR
                </button>
                <button 
                  className={`tab ${activeTab === 'logo' ? 'active' : ''}`}
                  onClick={() => setActiveTab('logo')}
                >
                  Logo
                </button>
              </div>
              
              <div className="tab-content">
                {renderTabContent()}
                <div className="preview-section">
                  <div className="preview-container">
                    <div className="qr-container" style={{
                      width: size,
                      height: size,
                      borderRadius: qrShape === 'circle' ? '50%' : '8px',
                      overflow: 'hidden',
                      border: '1px solid #eaeaea',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: qrShape === 'diamond' ? 'rotate(45deg)' : 'none',
                      margin: qrShape === 'diamond' ? '20px' : '0',
                      backgroundColor: 'white',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                      position: 'relative'
                    }}>
                      <div ref={qrRef}>
                        <QRCodeSVG
                          value={generateQRCode()}
                          size={size}
                          fgColor={fgColor}
                          bgColor={bgColor}
                          level="H"
                          includeMargin={false}
                        />
                        <canvas 
                          ref={canvasRef} 
                          style={{ display: 'none' }} 
                          width={size} 
                          height={size}
                        />
                      </div>
                      {logo && (
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '20%',
                          height: '20%',
                          backgroundColor: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          padding: '4px',
                          boxSizing: 'border-box',
                          overflow: 'hidden',
                          border: '1px solid #f0f0f0'
                        }}>
                          <img 
                            src={logo} 
                            alt="QR Logo" 
                            style={{ 
                              width: '100%', 
                              height: '100%',
                              objectFit: 'contain'
                            }} 
                          />
                        </div>
                      )}
                    </div>
                    <div className="preview-actions">
                      <button 
                        onClick={copyQRCode} 
                        className="btn secondary"
                      >
                        <FiCopy /> Copy QR Code
                      </button>
                      <button 
                        onClick={downloadQRCode} 
                        className="btn primary"
                      >
                        <FiDownload /> Download
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedQRCode;
