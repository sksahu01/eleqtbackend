# 🚗 Eleqt Booking API - Complete Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Data Structures](#common-data-structures)
4. [Validation Rules](#validation-rules)
5. [Fare Calculation APIs](#fare-calculation-apis)
6. [Booking Creation APIs](#booking-creation-apis)
7. [Payment & Verification APIs](#payment--verification-apis)
8. [Booking Management APIs](#booking-management-apis)
9. [Error Handling](#error-handling)
10. [Frontend Integration Guide](#frontend-integration-guide)

---

## 🔍 Overview

The Eleqt Booking API provides comprehensive taxi booking services with two main service types:
- **Hourly Rental**: Fixed duration rides (1-12 hours) within the city
- **Outstation**: Point-to-point trips up to 500km (one-way or round-trip)

**Base URL**: `http://localhost:4000/api/v1/bookings`
**Content-Type**: `application/json`

---

## 🔐 Authentication

All booking endpoints require **cookie-based authentication**. The API uses HTTP-only cookies for security.

### Authentication Flow:
1. User logs in via `/api/v1/user/login`
2. Server sets `userToken` cookie (HTTP-only)
3. All subsequent requests automatically include the cookie
4. No need for manual Bearer token headers

### Frontend Requirements:
```javascript
// Always include credentials in fetch requests
fetch('/api/v1/bookings/charges/hourly-rental', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include', // Essential for cookie auth
  body: JSON.stringify(requestData)
});
```

### Authentication Errors:
- `400`: "User is not authenticated" - No cookie present
- `403`: "User account has been marked for deletion" - Account pending deletion
- `404`: "User not found" - Invalid user in cookie

---

## 📦 Common Data Structures

### Location Object
```javascript
{
  "type": "Point",
  "coordinates": [85.8166, 20.2945] // [longitude, latitude]
}
```

### Address-Location Object
```javascript
{
  "address": "Infocity Square, Patia, Bhubaneswar, Odisha 751024",
  "location": {
    "type": "Point",
    "coordinates": [85.8166, 20.2945]
  }
}
```

### AddOns Object
```javascript
{
  "airportToll": false,
  "placard": {
    "required": false,
    "text": ""
  },
  "pets": {
    "dogs": false,
    "cats": false
  },
  "bookForOther": {
    "isBooking": false,
    "otherGuestInfo": ""
  },
  "childSeat": false
}
```

---

## ✅ Validation Rules

### General Constraints:
- **Passenger Count**: 1-5 passengers
- **Luggage Count**: 0-5 items
- **Stops**: Maximum 5 intermediate stops
- **Start Time**: Must be at least 48 hours in the future
- **Coordinates**: Valid longitude (-180 to 180) and latitude (-90 to 90)

### Car Type Assignment:
| Passengers | Luggage | Auto-Assigned Car Type |
|------------|---------|----------------------|
| 1-3        | ≤ 4     | 3-seater            |
| 1-3        | > 4     | 5-seater            |
| 4-5        | Any     | 5-seater            |

### AddOns Pricing:
- **Airport Toll**: ₹200
- **Placard**: ₹500
- **Dogs**: ₹750
- **Cats**: ₹500
- **Child Seat**: ₹500

---

## 💰 Fare Calculation APIs

### 1. Hourly Rental Fare Calculation

**POST** `/charges/hourly-rental`

Calculate fare for hourly rental without creating booking.

#### Request Body:
```javascript
{
  "pickUp": {
    "address": "Infocity Square, Patia, Bhubaneswar, Odisha 751024",
    "location": {
      "type": "Point",
      "coordinates": [85.8166, 20.2945]
    }
  },
  "dropOff": {
    "address": "Kalinga Stadium, Bhubaneswar, Odisha",
    "location": {
      "type": "Point",
      "coordinates": [85.8245, 20.2850]
    }
  },
  "stops": [
    {
      "address": "Esplanade One Mall, Bhubaneswar, Odisha",
      "location": {
        "type": "Point",
        "coordinates": [85.8394, 20.2906]
      }
    }
  ],
  "passengerCount": 3,
  "luggageCount": 2,
  "hours": 4,
  "startTime": "2025-08-12T10:00:00Z",
  "addOns": {
    "airportToll": false,
    "placard": {
      "required": true,
      "text": "Wedding Party"
    },
    "pets": {
      "dogs": false,
      "cats": true
    },
    "bookForOther": {
      "isBooking": false,
      "otherGuestInfo": ""
    },
    "childSeat": true
  }
}
```

#### Response:
```javascript
{
  "success": true,
  "message": "Charges for hourly rental service calculated successfully",
  "data": {
    "fare": 450000, // ₹4,500 in paise
    "fareInRupees": "4500.00",
    "carType": "5-seater",
    "serviceType": "hourly-rental",
    "stopsCount": 1,
    "duration": 4
  },
  "meta": {
    "currency": "INR",
    "amountUnit": "paise (₹1 = 100 paise)"
  }
}
```

#### Fare Breakdown:
- Base: 4 hours × ₹750 = ₹3,000
- Placard: ₹500
- Cats: ₹500  
- Child seat: ₹500
- **Total**: ₹4,500

---

### 2. Outstation Fare Calculation

**POST** `/charges/outstation`

Calculate fare for outstation trips based on distance ranges and time.

#### Request Body - One Way:
```javascript
{
  "pickUp": {
    "address": "Infocity Square, Patia, Bhubaneswar, Odisha 751024",
    "location": {
      "type": "Point",
      "coordinates": [85.8166, 20.2945]
    }
  },
  "dropOff": {
    "address": "Puri Beach, Puri, Odisha 752001",
    "location": {
      "type": "Point",
      "coordinates": [85.8312, 19.7972]
    }
  },
  "stops": [],
  "passengerCount": 2,
  "luggageCount": 3,
  "startTime": "2025-08-12T09:00:00Z",
  "totalDistance": 65.5,
  "isRoundTrip": false,
  "returnTime": null,
  "addOns": {
    "airportToll": false,
    "placard": {
      "required": false,
      "text": ""
    },
    "pets": {
      "dogs": false,
      "cats": false
    },
    "bookForOther": {
      "isBooking": false,
      "otherGuestInfo": ""
    },
    "childSeat": false
  }
}
```

#### Request Body - Round Trip:
```javascript
{
  "pickUp": {
    "address": "Infocity Square, Patia, Bhubaneswar, Odisha 751024",
    "location": {
      "type": "Point",
      "coordinates": [85.8166, 20.2945]
    }
  },
  "dropOff": {
    "address": "Konark Sun Temple, Konark, Odisha 752111",
    "location": {
      "type": "Point",
      "coordinates": [86.0947, 19.8877]
    }
  },
  "stops": [],
  "passengerCount": 4,
  "luggageCount": 2,
  "startTime": "2025-08-12T06:00:00Z",
  "totalDistance": 120,
  "isRoundTrip": true,
  "returnTime": "2025-08-13T20:00:00Z", // 38 hours later
  "addOns": {
    "airportToll": false,
    "placard": {
      "required": false,
      "text": ""
    },
    "pets": {
      "dogs": true,
      "cats": false
    },
    "bookForOther": {
      "isBooking": false,
      "otherGuestInfo": ""
    },
    "childSeat": false
  }
}
```

#### Distance-Based Pricing Tiers:
| Distance Range | One-way Rate | Round Trip Additional |
|----------------|--------------|----------------------|
| 0-30 km | ₹79 | +₹39.5 |
| 30-75 km | ₹72 | +₹36 |
| 75-100 km | ₹67 | +₹33.5 |
| 100-150 km | ₹64 | +₹32 |
| 150-200 km | ₹60 | +₹30 |
| 200-250 km | ₹57 | +₹28.5 |
| 250-325 km | ₹52 | +₹26 |
| 325-400 km | ₹45 | +₹22.5 |
| 400-500 km | ₹41 | +₹20.5 |

#### Driver Fee Structure:
- **Base driver fee**: ₹200 (compulsory)
- **Same day return** (≤12 hours): ₹200 total
- **Extended trips**: ₹200 + (₹750 × number of 12-hour periods)

#### Response Examples:

**One Way (65.5km):**
```javascript
{
  "success": true,
  "message": "Charges for outstation service calculated successfully",
  "data": {
    "fare": 492000, // ₹4,920
    "fareInRupees": "4920.00",
    "carType": "5-seater",
    "serviceType": "outstation",
    "stopsCount": 0,
    "distance": 65.5,
    "isRoundTrip": false
  }
}
```

**Round Trip (120km, 38 hours):**
```javascript
{
  "success": true,
  "message": "Charges for outstation service calculated successfully",
  "data": {
    "fare": 1255000, // ₹12,550
    "fareInRupees": "12550.00",
    "carType": "5-seater", 
    "serviceType": "outstation",
    "stopsCount": 0,
    "distance": 120,
    "isRoundTrip": true
  }
}
```

---

## 🎫 Booking Creation APIs

### 3. Create Hourly Rental Booking

**POST** `/order/hourly-rental`

Creates booking and returns encrypted payment options for Razorpay.

#### Request Body:
```javascript
{
  "pickUp": {
    "address": "Biju Patnaik Airport, Bhubaneswar, Odisha 751020",
    "location": {
      "type": "Point",
      "coordinates": [85.8180, 20.2538]
    }
  },
  "dropOff": {
    "address": "Esplanade One Mall, Bhubaneswar, Odisha 751007",
    "location": {
      "type": "Point",
      "coordinates": [85.8394, 20.2906]
    }
  },
  "stops": [],
  "passengerCount": 2,
  "luggageCount": 4,
  "hours": 6,
  "startTime": "2025-08-15T14:00:00Z",
  "addOns": {
    "airportToll": true,
    "placard": {
      "required": false,
      "text": ""
    },
    "pets": {
      "dogs": false,
      "cats": false
    },
    "bookForOther": {
      "isBooking": true,
      "otherGuestInfo": "Booking for Mr. Rajesh Kumar, Contact: 9876543210"
    },
    "childSeat": false
  }
}
```

#### Response:
```javascript
{
  "success": true,
  "message": "Hourly rental booking created successfully",
  "data": {
    "bookingId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "fare": 470000, // ₹4,700
    "fareInRupees": "4700.00", 
    "carType": "5-seater",
    "serviceType": "hourly-rental",
    "stopsCount": 0,
    "duration": 6,
    "status": "pending",
    "createdAt": "2025-08-06T10:30:45.123Z"
  },
  "options": {
    "iv": "a1b2c3d4e5f6789012345678901234567", // Hex string for decryption
    "encryptedData": "9f8e7d6c5b4a39281726354..." // Encrypted payment options
  },
  "meta": {
    "currency": "INR",
    "amountUnit": "paise (₹1 = 100 paise)"
  }
}
```

---

### 4. Create Outstation Booking

**POST** `/order/outstation`

Creates outstation booking with encrypted payment options.

#### Request Body:
```javascript
{
  "pickUp": {
    "address": "Infocity Square, Patia, Bhubaneswar, Odisha 751024",
    "location": {
      "type": "Point",
      "coordinates": [85.8166, 20.2945]
    }
  },
  "dropOff": {
    "address": "Cuttack Railway Station, Cuttack, Odisha",
    "location": {
      "type": "Point",
      "coordinates": [85.8312, 20.5027]
    }
  },
  "stops": [],
  "passengerCount": 3,
  "luggageCount": 2,
  "startTime": "2025-08-15T08:00:00Z",
  "totalDistance": 28.5,
  "isRoundTrip": true,
  "returnTime": "2025-08-15T22:00:00Z", // Same day return (14 hours)
  "addOns": {
    "airportToll": false,
    "placard": {
      "required": true,
      "text": "Corporate Trip"
    },
    "pets": {
      "dogs": false,
      "cats": false
    },
    "bookForOther": {
      "isBooking": false,
      "otherGuestInfo": ""
    },
    "childSeat": true
  }
}
```

#### Response:
```javascript
{
  "success": true,
  "message": "Outstation booking created successfully",
  "data": {
    "bookingId": "65f1a2b3c4d5e6f7g8h9i0j2",
    "fare": 145000, // ₹1,450
    "fareInRupees": "1450.00",
    "carType": "5-seater", 
    "serviceType": "outstation",
    "stopsCount": 0,
    "distance": 28.5,
    "isRoundTrip": true,
    "status": "pending",
    "createdAt": "2025-08-06T11:15:30.456Z"
  },
  "options": {
    "iv": "b2c3d4e5f6a7890123456789012345678",
    "encryptedData": "8e7d6c5b4a392817263544f..."
  },
  "meta": {
    "currency": "INR", 
    "amountUnit": "paise (₹1 = 100 paise)"
  }
}
```

---

## 💳 Payment & Verification APIs

### 5. Payment Verification

**POST** `/verify-payment/:bookingId`

Verifies Razorpay payment and updates booking status. Called by Razorpay callback.

#### URL Parameters:
- `bookingId`: The booking ID to verify payment for

#### Request Body:
```javascript
{
  "razorpay_payment_id": "pay_MkV2J4lsxHJD6L",
  "razorpay_order_id": "order_MkV2DxJ4lsxH6L",
  "razorpay_signature": "0af2e3c5b9f8d7e6a4c3b2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1"
}
```

#### Response:
- **Success**: Redirects to `${FRONTEND_URL}/payment-status?token=${paymentToken}`
- **Error**: Redirects to `${FRONTEND_URL}/payment-status?error=${errorMessage}`

---

### 6. Payment Token Verification

**POST** `/verify-payment-token`

Verifies JWT token received from successful payment redirect.

#### Request Body:
```javascript
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response:
```javascript
{
  "success": true,
  "message": "Payment token verified successfully",
  "data": {
    "razorpay_payment_id": "pay_MkV2J4lsxHJD6L",
    "razorpay_order_id": "order_MkV2DxJ4lsxH6L",
    "userId": "65abc123def456789012345"
  }
}
```

---

## 📋 Booking Management APIs

### 7. Get User Bookings

**GET** `/`

Retrieves user's bookings categorized into active and past with pagination.

#### Query Parameters:
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page
- `rideType` (optional): Filter by "hourly" or "outstation"
- `status` (optional): Filter by status

#### Example Request:
```
GET /api/v1/bookings/?page=1&limit=5&rideType=hourly
```

#### Response:
```javascript
{
  "success": true,
  "message": "User bookings fetched successfully",
  "data": {
    "active": [
      {
        "id": "65f1a2b3c4d5e6f7g8h9i0j1",
        "rideType": "hourly",
        "carType": "5-seater",
        "status": "confirmed",
        "fare": 470000,
        "fareInRupees": "4700.00",
        "duration": "6 hours",
        "pickUp": {
          "address": "Biju Patnaik Airport, Bhubaneswar, Odisha 751020"
        },
        "dropOff": {
          "address": "Esplanade One Mall, Bhubaneswar, Odisha 751007"
        },
        "startTime": "2025-08-15T14:00:00Z",
        "createdAt": "2025-08-06T10:30:45.123Z",
        "isActive": true,
        "category": "active"
      }
    ],
    "past": [
      {
        "id": "65f1a2b3c4d5e6f7g8h9i0j0",
        "rideType": "outstation", 
        "carType": "3-seater",
        "status": "completed",
        "fare": 280000,
        "fareInRupees": "2800.00",
        "duration": null,
        "isRoundTrip": false,
        "distance": 45.2,
        "pickUp": {
          "address": "Infocity Square, Patia, Bhubaneswar"
        },
        "dropOff": {
          "address": "Puri Beach, Puri"
        },
        "startTime": "2025-08-01T09:00:00Z",
        "createdAt": "2025-07-30T15:20:10.789Z",
        "isActive": false,
        "category": "past"
      }
    ],
    "statistics": {
      "totalBookings": 8,
      "activeBookings": 1,
      "pastBookings": 1
    }
  },
  "pagination": {
    "currentPage": 1,
    "pageSize": 5,
    "totalPages": 2,
    "totalBookings": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### 8. Get Booking Details

**GET** `/:bookingId`

Retrieves detailed information for a specific booking.

#### URL Parameters:
- `bookingId`: The booking ID

#### Example Request:
```
GET /api/v1/bookings/65f1a2b3c4d5e6f7g8h9i0j1
```

#### Response:
```javascript
{
  "success": true,
  "message": "Booking details fetched successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "userId": "65abc123def456789012345",
    "rideType": "hourly",
    "carType": "5-seater",
    "status": "confirmed",
    "passengerCount": 2,
    "luggageCount": 4,
    "pickUp": {
      "address": "Biju Patnaik Airport, Bhubaneswar, Odisha 751020",
      "location": {
        "type": "Point",
        "coordinates": [85.8180, 20.2538]
      }
    },
    "dropOff": {
      "address": "Esplanade One Mall, Bhubaneswar, Odisha 751007", 
      "location": {
        "type": "Point",
        "coordinates": [85.8394, 20.2906]
      }
    },
    "stops": [],
    "addOns": {
      "airportToll": true,
      "placard": {
        "required": false,
        "text": ""
      },
      "pets": {
        "dogs": false,
        "cats": false
      },
      "bookForOther": {
        "isBooking": true,
        "otherGuestInfo": "Booking for Mr. Rajesh Kumar, Contact: 9876543210"
      },
      "childSeat": false
    },
    "payment": {
      "paymentMethod": "razorpay",
      "amount": 470000,
      "paymentStatus": "paid",
      "orderId": "order_MkV2DxJ4lsxH6L",
      "paymentId": "pay_MkV2J4lsxHJD6L"
    },
    "startTime": "2025-08-15T14:00:00Z",
    "durationHrs": 6,
    "duration": "6 hours",
    "fare": 470000,
    "fareInRupees": "4700.00",
    "createdAt": "2025-08-06T10:30:45.123Z",
    "updatedAt": "2025-08-06T10:35:20.456Z",
    "isActive": true,
    "category": "active"
  }
}
```

---

### 9. Cancel Booking

**PUT** `/cancel/:bookingId`

Cancels a booking. Only bookings with "pending" or "failed" payment status can be cancelled.

#### URL Parameters:
- `bookingId`: The booking ID to cancel

#### Example Request:
```
PUT /api/v1/bookings/cancel/65f1a2b3c4d5e6f7g8h9i0j1
```

#### Cancellation Rules:
- ✅ **Allowed**: `paymentStatus` is "pending" or "failed"
- ❌ **Blocked**: `paymentStatus` is "paid" or "refunded"
- ❌ **Blocked**: `status` is "completed", "cancelled", or "ongoing"
- ❌ **Blocked**: Within 2 hours of start time

#### Response:
```javascript
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "bookingId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "status": "cancelled",
    "previousStatus": "pending",
    "rideType": "hourly",
    "fareInRupees": "4700.00",
    "paymentStatus": "pending",
    "cancellationTime": "2025-08-06T12:00:00.000Z",
    "startTimeFormatted": "8/15/2025, 2:00:00 PM",
    "message": "Booking cancelled successfully. No refund required as payment was pending."
  }
}
```

---

## ⚠️ Error Handling

### Common Error Responses:

#### Authentication Errors:
```javascript
{
  "success": false,
  "message": "User is not authenticated."
}
```

#### Validation Errors:
```javascript
{
  "success": false,
  "message": "Passenger count must be between 1 and 5"
}
```

#### Business Logic Errors:
```javascript
{
  "success": false,
  "message": "Cannot cancel booking with payment status: paid. Only bookings with pending or failed payments can be cancelled."
}
```

#### Server Errors:
```javascript
{
  "success": false,
  "message": "Error creating hourly rental booking: Database connection failed"
}
```

### HTTP Status Codes:
- `200`: Success
- `201`: Resource created successfully  
- `400`: Bad request / Validation error
- `401`: Unauthorized / Authentication required
- `403`: Forbidden / Access denied
- `404`: Resource not found
- `500`: Internal server error

---

## 🔧 Frontend Integration Guide

### 1. Cookie Configuration

Ensure your HTTP client includes cookies:

```javascript
// Fetch API
const response = await fetch('/api/v1/bookings/charges/hourly-rental', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Essential!
  body: JSON.stringify(requestData)
});

// Axios
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api/v1',
  withCredentials: true, // Essential!
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### 2. Payment Flow Integration

```javascript
// Step 1: Get fare estimate (optional)
const fareResponse = await api.post('/bookings/charges/hourly-rental', bookingData);
console.log('Estimated fare:', fareResponse.data.data.fareInRupees);

// Step 2: Create booking
const bookingResponse = await api.post('/bookings/order/hourly-rental', bookingData);
const { options } = bookingResponse.data;

// Step 3: Decrypt payment options (use your decryption function)
const paymentOptions = decryptOptions(options.encryptedData, options.iv);

// Step 4: Initialize Razorpay
const rzp = new window.Razorpay(paymentOptions);
rzp.open();

// Step 5: Handle payment success (Razorpay will redirect to callback URL)
// Your callback URL will redirect to: /payment-status?token=JWT_TOKEN

// Step 6: Verify payment token on success page
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
if (token) {
  const verifyResponse = await api.post('/bookings/verify-payment-token', { token });
  console.log('Payment verified:', verifyResponse.data);
}
```

### 3. Booking Management

```javascript
// Get user's bookings
const bookingsResponse = await api.get('/bookings/?page=1&limit=10');
const { active, past } = bookingsResponse.data.data;

// Get specific booking details
const bookingDetails = await api.get(`/bookings/${bookingId}`);

// Cancel booking
const cancelResponse = await api.put(`/bookings/cancel/${bookingId}`);
```

### 4. Error Handling Best Practices

```javascript
try {
  const response = await api.post('/bookings/order/hourly-rental', bookingData);
  // Handle success
} catch (error) {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        console.error('Validation error:', data.message);
        // Show validation errors to user
        break;
      case 401:
        console.error('Authentication required');
        // Redirect to login
        window.location.href = '/login';
        break;
      case 403:
        console.error('Access denied:', data.message);
        break;
      case 500:
        console.error('Server error:', data.message);
        // Show generic error message
        break;
      default:
        console.error('Unexpected error:', data.message);
    }
  } else {
    // Network error
    console.error('Network error:', error.message);
  }
}
```

### 5. Date/Time Handling

```javascript
// Always use ISO format for dates
const startTime = new Date('2025-08-15T14:00:00Z').toISOString();

// Validate 48-hour advance booking
const now = new Date();
const minStartTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);
const selectedStartTime = new Date(startTime);

if (selectedStartTime < minStartTime) {
  console.error('Start time must be at least 48 hours in the future');
}
```

### 6. Environment-Specific Configuration

```javascript
// Development
const API_BASE_URL = 'http://localhost:4000/api/v1';

// Production
const API_BASE_URL = 'https://your-production-api.com/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000 // 30 seconds
});
```

---

## 📝 Development Notes

- **Database**: MongoDB with Mongoose ODM using discriminator patterns
- **Authentication**: JWT tokens stored in HTTP-only cookies
- **Payment Gateway**: Razorpay integration with encrypted options
- **Logging**: Comprehensive logging for audit trails using Winston
- **Email Service**: Automated notifications for booking confirmations
- **CORS**: Configured for frontend integration with credentials
- **Encryption**: AES-256-CBC encryption for sensitive payment data

## 🌍 Environment Variables Required

```bash
# Database
MONGO_URI=mongodb://localhost:27017/eleqt

# JWT
JWT_SECRET_KEY=your-secret-key
JWT_EXPIRE=7d

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Encryption
PAYMENT_ENC_KEY=your-32-character-encryption-key

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
```

---

*This documentation covers all booking endpoints with real examples. For any questions or issues, please refer to the error handling section or contact the development team.*
- **Hourly Rental**: Time-based rides (1-12 hours duration)
- **Outstation**: Distance-based trips (up to 500km, one-way or round-trip)

### Base Information
- **Base URL**: `http://localhost:4000/api/v1/bookings`
- **Content-Type**: `application/json`
- **Currency**: INR (Indian Rupees)
- **Amount Format**: Paise (1 Rupee = 100 Paise)
- **Authentication**: JWT Bearer Token Required

---

## 🔐 Authentication

All endpoints require authentication using JWT Bearer token in the header:

```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

---

## 📊 Common Data Structures

### 📍 Location Object (GeoJSON Point)
```javascript
{
  "type": "Point",
  "coordinates": [85.8166, 20.2945] // [longitude, latitude]
}
```

### 🏠 Address-Location Object
```javascript
{
  "address": "Infocity Square, Patia, Bhubaneswar, Odisha 751024",
  "location": {
    "type": "Point",
    "coordinates": [85.8166, 20.2945]
  }
}
```

### ⭐ AddOns Object
```javascript
{
  "airportToll": false,          // Boolean - Airport toll charges
  "placard": {                   // Object - Welcome placard
    "required": false,           // Boolean - Whether placard is needed
    "text": ""                   // String - Text on placard (optional)
  },
  "pets": {                      // Object - Pet transportation
    "dogs": false,               // Boolean - Bringing dogs
    "cats": false                // Boolean - Bringing cats
  },
  "bookForOther": {              // Object - Booking for someone else
    "isBooking": false,          // Boolean - Is this for another person
    "otherGuestInfo": ""         // String - Other person's details
  },
  "childSeat": false             // Boolean - Child seat required
}
```

---

## ✅ Validation Rules

### 🚗 Car Type Assignment
Based on passenger count and luggage count:

| Car Type  | Passenger Limits & Max Luggage |
|-----------|--------------------------------|
| 3-seater  | 1 passenger: 3 luggage        |
|           | 2 passengers: 3 luggage       |
|           | 3 passengers: 2 luggage       |
| 5-seater  | 1 passenger: 5 luggage        |
|           | 2 passengers: 5 luggage       |
|           | 3 passengers: 4 luggage       |
|           | 4 passengers: 3 luggage       |
|           | 5 passengers: 2 luggage       |

### 📅 Time Constraints
- **Hourly Rentals**: Must be booked at least 48 hours in advance
- **Outstation**: Must be booked at least 24 hours in advance
- **Round Trips**: Return time must be after start time

### 📏 Distance & Stops Limits
- **Maximum stops**: 5 stops allowed
- **Outstation max distance**: 500km from service center
- **Service radius**: 350km from Bhubaneswar (85.8166, 20.2945)

### 💰 AddOn Pricing
| AddOn | Price | Notes |
|-------|-------|-------|
| Airport Toll | ₹200 | Fixed charge |
| Placard | ₹500 | Welcome sign |
| Cats | ₹500 | Per booking |
| Dogs | ₹750 | Per booking |
| Child Seat | ₹500 | Per booking |
| **Both Cats + Dogs** | ₹1,250 | Combined charge |

---

## 💰 Fare Calculation APIs

### 1. 🕐 Hourly Rental Fare Calculation

**POST** `/charges/hourly-rental`

Calculate fare for hourly rental service.

#### Request Body
```javascript
{
  "pickUp": {
    "address": "Biju Patnaik Airport, Bhubaneswar, Odisha 751020",
    "location": {
      "type": "Point",
      "coordinates": [85.8180, 20.2538]
    }
  },
  "dropOff": {
    "address": "Jaydev Vihar, Bhubaneswar, Odisha 751013", 
    "location": {
      "type": "Point",
      "coordinates": [85.8467, 20.2961]
    }
  },
  "stops": [
    {
      "address": "Kalinga Stadium, Bhubaneswar, Odisha",
      "location": {
        "type": "Point",
        "coordinates": [85.8245, 20.2850]
      }
    }
  ],
  "passengerCount": 3,      // Required: 1-5
  "luggageCount": 2,        // Required: 0-4  
  "hours": 4,              // Required: 1-12 hours
  "startTime": "2025-08-12T10:00:00Z", // Required: ISO format, 48hrs ahead
  "addOns": {
    "airportToll": true,
    "placard": {
      "required": true,
      "text": "Wedding Party Transport"
    },
    "pets": {
      "dogs": false,
      "cats": true
    },
    "bookForOther": {
      "isBooking": false,
      "otherGuestInfo": ""
    },
    "childSeat": true
  }
}
```

#### Response
```javascript
{
  "success": true,
  "message": "Charges for hourly rental service calculated successfully",
  "data": {
    "fare": 480000,           // In paise (₹4,800)
    "fareInRupees": "4800.00", // Formatted string
    "carType": "5-seater",     // Auto-determined
    "serviceType": "hourly-rental",
    "stopsCount": 1,
    "duration": 4             // Hours
  },
  "meta": {
    "currency": "INR",
    "amountUnit": "paise (₹1 = 100 paise)"
  }
}
```

#### Fare Breakdown Example:
- Base fare: 4 hours × ₹750 = ₹3,000
- Airport toll: ₹200
- Placard: ₹500
- Cats: ₹500
- Child seat: ₹500
- **Total**: ₹4,700

---

### 2. 🛣️ Outstation Fare Calculation

**POST** `/charges/outstation`

Calculate fare for outstation trips with complex distance and time-based pricing.

#### Request Body - One Way Trip
```javascript
{
  "pickUp": {
    "address": "Infocity Square, Patia, Bhubaneswar, Odisha 751024",
    "location": {
      "type": "Point", 
      "coordinates": [85.8166, 20.2945]
    }
  },
  "dropOff": {
    "address": "Puri Beach, Puri, Odisha 752001",
    "location": {
      "type": "Point",
      "coordinates": [85.8312, 19.7972]
    }
  },
  "stops": [],
  "passengerCount": 2,
  "luggageCount": 1,
  "startTime": "2025-08-12T09:00:00Z",  // 24hrs ahead minimum
  "totalDistance": 65.5,               // Required: km
  "isRoundTrip": false,
  "returnTime": null,
  "addOns": {
    "airportToll": false,
    "placard": {
      "required": false,
      "text": ""
    },
    "pets": {
      "dogs": false,
      "cats": false
    },
    "bookForOther": {
      "isBooking": false,
      "otherGuestInfo": ""
    },
    "childSeat": false
  }
}
```

#### Request Body - Round Trip
```javascript
{
  "pickUp": {
    "address": "Infocity Square, Patia, Bhubaneswar, Odisha 751024",
    "location": {
      "type": "Point",
      "coordinates": [85.8166, 20.2945]
    }
  },
  "dropOff": {
    "address": "Konark Sun Temple, Konark, Odisha 752111",
    "location": {
      "type": "Point", 
      "coordinates": [86.0947, 19.8877]
    }
  },
  "stops": [],
  "passengerCount": 4,
  "luggageCount": 2,
  "startTime": "2025-08-12T06:00:00Z",
  "totalDistance": 120,
  "isRoundTrip": true,
  "returnTime": "2025-08-13T20:00:00Z", // 38 hours later
  "addOns": {
    "airportToll": false,
    "placard": {
      "required": false,
      "text": ""
    },
    "pets": {
      "dogs": true,
      "cats": false
    },
    "bookForOther": {
      "isBooking": false,
      "otherGuestInfo": ""
    },
    "childSeat": false
  }
}
```

#### Response - One Way
```javascript
{
  "success": true,
  "message": "Charges for outstation service calculated successfully",
  "data": {
    "fare": 492000,           // ₹4,920
    "fareInRupees": "4920.00",
    "carType": "3-seater",
    "serviceType": "outstation",
    "stopsCount": 0,
    "distance": 65.5,
    "isRoundTrip": false
  },
  "meta": {
    "currency": "INR",
    "amountUnit": "paise (₹1 = 100 paise)"
  }
}
```

#### Response - Round Trip
```javascript
{
  "success": true, 
  "message": "Charges for outstation service calculated successfully",
  "data": {
    "fare": 1255000,          // ₹12,550
    "fareInRupees": "12550.00",
    "carType": "5-seater", 
    "serviceType": "outstation",
    "stopsCount": 0,
    "distance": 120,
    "isRoundTrip": true
  },
  "meta": {
    "currency": "INR",
    "amountUnit": "paise (₹1 = 100 paise)"
  }
}
```

### 📊 Outstation Pricing Structure

#### Distance-Based Rates (Per KM)
| Distance Range | One-Way Rate | Round Trip Additional |
|----------------|--------------|----------------------|
| 0-30 km | ₹79/km | +₹39.5/km |
| 30-75 km | ₹72/km | +₹36/km |
| 75-100 km | ₹67/km | +₹33.5/km |
| 100-150 km | ₹64/km | +₹32/km |
| 150-200 km | ₹60/km | +₹30/km |
| 200-250 km | ₹57/km | +₹28.5/km |
| 250-325 km | ₹52/km | +₹26/km |
| 325-400 km | ₹45/km | +₹22.5/km |
| 400-500 km | ₹41/km | +₹20.5/km |

#### Driver Fee Structure
- **Base driver fee**: ₹200 (compulsory for all bookings)
- **Same day return** (≤12 hours): ₹200 total
- **Extended trips**: ₹200 + (₹750 × number of 12-hour periods)

#### Fare Calculation Example - Round Trip:
**120km trip, 38 hours duration:**
- One-way: 120km × ₹64 = ₹7,680 (100-150km range)
- Round trip additional: 120km × ₹32 = ₹3,840
- Distance total: ₹11,520
- Driver fee base: ₹200
- Time periods: 38 hours = 3 periods × ₹750 = ₹2,250
- Driver fee total: ₹2,450
- Dogs addon: ₹750
- **Grand Total**: ₹14,720

---

## 🎫 Booking Creation APIs

### 3. 📅 Create Hourly Rental Booking

**POST** `/order/hourly-rental`

Create a new hourly rental booking with encrypted payment options for Razorpay.

#### Request Body
```javascript
{
  "pickUp": {
    "address": "Biju Patnaik Airport, Bhubaneswar, Odisha 751020",
    "location": {
      "type": "Point",
      "coordinates": [85.8180, 20.2538]
    }
  },
  "dropOff": {
    "address": "Esplanade One Mall, Bhubaneswar, Odisha 751007",
    "location": {
      "type": "Point",
      "coordinates": [85.8394, 20.2906]  
    }
  },
  "stops": [],
  "passengerCount": 2,
  "luggageCount": 4,
  "hours": 6,
  "startTime": "2025-08-15T14:00:00Z",
  "addOns": {
    "airportToll": true,
    "placard": {
      "required": false,
      "text": ""
    },
    "pets": {
      "dogs": false,
      "cats": false
    },
    "bookForOther": {
      "isBooking": true,
      "otherGuestInfo": "Booking for Mr. Rajesh Kumar, Contact: 9876543210"
    },
    "childSeat": false
  }
}
```

#### Response
```javascript
{
  "success": true,
  "message": "Hourly rental booking created successfully",
  "data": {
    "bookingId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "fare": 470000,           // ₹4,700 in paise
    "fareInRupees": "4700.00",
    "carType": "5-seater",
    "serviceType": "hourly-rental", 
    "stopsCount": 0,
    "duration": 6,            // Hours
    "status": "pending",      // Payment pending
    "createdAt": "2025-08-06T10:30:45.123Z"
  },
  "options": {
    // Encrypted Razorpay payment options
    "iv": "a1b2c3d4e5f6789012345678901234567",      // Hex string
    "encryptedData": "9f8e7d6c5b4a392817263547ab8c2d..." // Hex string
  },
  "meta": {
    "currency": "INR",
    "amountUnit": "paise (₹1 = 100 paise)"
  }
}
```

#### Decrypted Payment Options (Reference Only)
When decrypted on the frontend, the `options` object contains:
```javascript
{
  "key": "rzp_test_1DP5mmOlF5G5ag",
  "amount": 470000,
  "currency": "INR", 
  "name": "Eleqt Rides",
  "description": "Hourly Rental Booking - 6 hours",
  "order_id": "order_NqhGl8t2wvVxJa",
  "callback_url": "http://localhost:4000/api/v1/bookings/verify-payment/65f1a2b3c4d5e6f7g8h9i0j1",
  "prefill": {
    "userId": "65abc123def456789012345",
    "bookingId": "65f1a2b3c4d5e6f7g8h9i0j1"
  },
  "notes": {
    "bookingType": "hourly-rental",
    "duration": "6 hours",
    "carType": "5-seater"
  },
  "theme": {
    "color": "#eded42ff"
  }
}
```

---

### 4. 🚌 Create Outstation Booking

**POST** `/order/outstation`

Create a new outstation booking with encrypted payment options.

#### Request Body
```javascript
{
  "pickUp": {
    "address": "Infocity Square, Patia, Bhubaneswar, Odisha 751024",
    "location": {
      "type": "Point", 
      "coordinates": [85.8166, 20.2945]
    }
  },
  "dropOff": {
    "address": "Chilika Lake, Satapada, Odisha 752030",
    "location": {
      "type": "Point",
      "coordinates": [85.4397, 19.7306]
    }
  },
  "stops": [
    {
      "address": "Pipili Market, Pipili, Odisha 752104",
      "location": {
        "type": "Point", 
        "coordinates": [85.8192, 19.8147]
      }
    }
  ],
  "passengerCount": 3,
  "luggageCount": 2,
  "startTime": "2025-08-15T07:00:00Z",
  "totalDistance": 95.5,
  "isRoundTrip": true,
  "returnTime": "2025-08-16T19:00:00Z", // 36 hours later
  "addOns": {
    "airportToll": false,
    "placard": {
      "required": true,
      "text": "Family Trip to Chilika"
    },
    "pets": {
      "dogs": true,
      "cats": true
    },
    "bookForOther": {
      "isBooking": false, 
      "otherGuestInfo": ""
    },
    "childSeat": true
  }
}
```

#### Response
```javascript
{
  "success": true,
  "message": "Outstation booking created successfully",
  "data": {
    "bookingId": "65f1a2b3c4d5e6f7g8h9i0j2",
    "fare": 1445000,          // ₹14,450 in paise
    "fareInRupees": "14450.00",
    "carType": "5-seater",
    "serviceType": "outstation",
    "stopsCount": 1,
    "distance": 95.5,
    "isRoundTrip": true,
    "status": "pending",
    "createdAt": "2025-08-06T10:35:12.456Z"
  },
  "options": {
    "iv": "b2c3d4e5f6g7890123456789012345678",
    "encryptedData": "8e7d6c5b4a3928172635479f8e7d6c5b..."
  },
  "meta": {
    "currency": "INR", 
    "amountUnit": "paise (₹1 = 100 paise)"
  }
}
```

#### Fare Breakdown:
- One-way: 95.5km × ₹67 = ₹6,398.5 (75-100km range)
- Round trip additional: 95.5km × ₹33.5 = ₹3,199.25
- Distance total: ₹9,597.75
- Driver fee: ₹200 + (3 periods × ₹750) = ₹2,450
- Placard: ₹500
- Dogs: ₹750
- Cats: ₹500
- Child seat: ₹500
- **Total**: ₹14,297.75 → ₹14,298

---

## 💳 Payment & Verification APIs

### 5. ✅ Verify Payment

**POST** `/verify-payment/:bookingId`

Verify Razorpay payment and update booking status. This endpoint is called by Razorpay after payment completion.

#### URL Parameters
- `bookingId`: The booking ID to verify payment for

#### Request Body
```javascript
{
  "razorpay_payment_id": "pay_NqhGl8t2wvVxJa123",
  "razorpay_order_id": "order_NqhGl8t2wvVxJa",
  "razorpay_signature": "a1b2c3d4e5f6789012345678..."
}
```

#### Response
This endpoint performs a redirect to the frontend:
- **Success**: Redirects to `${FRONTEND_URL}/payment-status?token=${paymentToken}`
- **Failure**: Redirects to `${FRONTEND_URL}/payment-status?error=${errorMessage}`

---

### 6. 🔐 Verify Payment Token

**POST** `/verify-payment-token`

Verify the payment token received after successful payment.

#### Request Body
```javascript
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response
```javascript
{
  "success": true,
  "message": "Payment token verified successfully",
  "data": {
    "bookingId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "paymentId": "pay_NqhGl8t2wvVxJa123",
    "orderId": "order_NqhGl8t2wvVxJa",
    "userId": "65abc123def456789012345",
    "iat": 1725624000,
    "exp": 1725710400
  }
}
```

---

## 📋 Booking Management APIs

### 7. 📜 Get User Bookings

**GET** `/`

Retrieve all user bookings categorized into active and past bookings with pagination and filtering.

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)
- `rideType` (optional): Filter by 'hourly' or 'outstation'
- `status` (optional): Filter by 'pending', 'confirmed', 'ongoing', 'completed', 'cancelled'

#### Request
```http
GET /api/v1/bookings/?page=1&limit=5&rideType=hourly
Authorization: Bearer <token>
```

#### Response
```javascript
{
  "success": true,
  "message": "User bookings fetched successfully",
  "data": {
    "active": [
      {
        "id": "65f1a2b3c4d5e6f7g8h9i0j1",
        "rideType": "hourly",
        "carType": "5-seater",
        "status": "confirmed",
        "passengerCount": 3,
        "luggageCount": 2,
        "pickUp": {
          "address": "Infocity Square, Patia, Bhubaneswar",
          "location": {
            "type": "Point",
            "coordinates": [85.8166, 20.2945]
          }
        },
        "dropOff": {
          "address": "Jaydev Vihar, Bhubaneswar",
          "location": {
            "type": "Point",
            "coordinates": [85.8467, 20.2961]
          }
        },
        "stops": [],
        "durationHrs": 4,
        "startTime": "2025-08-15T10:00:00Z",
        "payment": {
          "amount": 375000,
          "paymentStatus": "paid",
          "paymentMethod": "razorpay"
        },
        "addOns": {
          "airportToll": false,
          "placard": {
            "required": false,
            "text": ""
          },
          "pets": {
            "dogs": false,
            "cats": false
          },
          "bookForOther": {
            "isBooking": false,
            "otherGuestInfo": ""
          },
          "childSeat": true
        },
        "createdAt": "2025-08-06T10:30:45.123Z",
        "updatedAt": "2025-08-06T10:35:12.456Z"
      }
    ],
    "past": [
      {
        "id": "65f1a2b3c4d5e6f7g8h9i0j0",
        "rideType": "outstation", 
        "carType": "3-seater",
        "status": "completed",
        "passengerCount": 2,
        "luggageCount": 1,
        "pickUp": {
          "address": "Bhubaneswar Railway Station",
          "location": {
            "type": "Point",
            "coordinates": [85.8245, 20.2961]
          }
        },
        "dropOff": {
          "address": "Puri Beach, Puri",
          "location": {
            "type": "Point", 
            "coordinates": [85.8312, 19.7972]
          }
        },
        "stops": [],
        "isRoundTrip": false,
        "startTime": "2025-07-15T09:00:00Z",
        "payment": {
          "amount": 520000,
          "paymentStatus": "paid",
          "paymentMethod": "razorpay"
        },
        "addOns": {
          "airportToll": false,
          "placard": {
            "required": false,
            "text": ""
          },
          "pets": {
            "dogs": false,
            "cats": false
          },
          "bookForOther": {
            "isBooking": false,
            "otherGuestInfo": ""
          },
          "childSeat": false
        },
        "createdAt": "2025-07-13T08:20:30.789Z",
        "updatedAt": "2025-07-15T12:45:18.123Z"
      }
    ],
    "statistics": {
      "totalBookings": 2,
      "activeBookings": 1,
      "pastBookings": 1
    }
  },
  "pagination": {
    "currentPage": 1,
    "pageSize": 5,
    "totalPages": 1,
    "totalBookings": 2,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### 📊 Active vs Past Booking Logic
- **Active Bookings**: Not completed/cancelled AND (future start time OR pending/confirmed/ongoing status)
- **Past Bookings**: Completed/cancelled OR past start time with completed status

---

### 8. 🔍 Get Booking Details by ID

**GET** `/:bookingId`

Get detailed information about a specific booking.

#### Request
```http
GET /api/v1/bookings/65f1a2b3c4d5e6f7g8h9i0j1
Authorization: Bearer <token>
```

#### Response
```javascript
{
  "success": true,
  "message": "Booking details fetched successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "userId": "65abc123def456789012345",
    "rideType": "hourly",
    "carType": "5-seater",
    "status": "confirmed",
    "passengerCount": 3,
    "luggageCount": 2,
    "pickUp": {
      "address": "Infocity Square, Patia, Bhubaneswar, Odisha 751024",
      "location": {
        "type": "Point",
        "coordinates": [85.8166, 20.2945]
      }
    },
    "dropOff": {
      "address": "Jaydev Vihar, Bhubaneswar, Odisha 751013",
      "location": {
        "type": "Point",
        "coordinates": [85.8467, 20.2961]
      }
    },
    "stops": [
      {
        "address": "Kalinga Stadium, Bhubaneswar",
        "location": {
          "type": "Point",
          "coordinates": [85.8245, 20.2850]
        }
      }
    ],
    "durationHrs": 4,
    "startTime": "2025-08-15T10:00:00Z",
    "payment": {
      "amount": 425000,
      "paymentStatus": "paid",
      "paymentMethod": "razorpay"
    },
    "addOns": {
      "airportToll": true,
      "placard": {
        "required": false,
        "text": ""
      },
      "pets": {
        "dogs": false,
        "cats": true
      },
      "bookForOther": {
        "isBooking": false,
        "otherGuestInfo": ""
      },
      "childSeat": false
    },
    "createdAt": "2025-08-06T10:30:45.123Z",
    "updatedAt": "2025-08-06T10:35:12.456Z",
    // Computed fields
    "isActive": true,
    "category": "active",
    "duration": "4 hours",          // Only for hourly bookings
    "fareInRupees": "4250.00",
    "stopsCount": 1,
    "startTimeFormatted": "8/15/2025, 3:30:00 PM",
    "returnTimeFormatted": null,    // Only for outstation
    "createdAtFormatted": "8/6/2025, 4:00:45 PM"
  }
}
```

---

### 9. ❌ Cancel Booking

**PUT** `/cancel/:bookingId`

Cancel a booking. Only bookings with payment status 'pending' or 'failed' can be cancelled.

#### Request
```http
PUT /api/v1/bookings/cancel/65f1a2b3c4d5e6f7g8h9i0j1
Authorization: Bearer <token>
```

#### Response - Success
```javascript
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "bookingId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "status": "cancelled",
    "previousStatus": "pending",
    "rideType": "hourly",
    "fareInRupees": "4250.00",
    "paymentStatus": "pending",
    "cancellationTime": "2025-08-06T11:30:45.789Z",
    "startTimeFormatted": "8/15/2025, 3:30:00 PM",
    "message": "Booking cancelled successfully. No refund required as payment was pending."
  }
}
```

### 🚫 Cancellation Rules
- ✅ **Can Cancel**: Payment status 'pending' or 'failed'
- ❌ **Cannot Cancel**: Payment status 'paid' or 'refunded'
- ❌ **Cannot Cancel**: Booking status 'completed', 'cancelled', or 'ongoing'
- ❌ **Cannot Cancel**: Within 2 hours of start time

#### Response - Error Examples
```javascript
// Already cancelled
{
  "success": false,
  "message": "Booking is already cancelled"
}

// Payment already made
{
  "success": false,
  "message": "Cannot cancel booking with payment status: paid. Only bookings with pending or failed payments can be cancelled."
}

// Too close to start time
{
  "success": false,
  "message": "Cannot cancel booking within 2 hours of start time"
}

// Unauthorized access
{
  "success": false,
  "message": "Unauthorized access to booking"
}
```

---

## ⚠️ Error Handling

### Common HTTP Status Codes
- `200` - Success
- `201` - Created (new booking)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (accessing other user's booking)
- `404` - Not Found (booking doesn't exist)
- `500` - Internal Server Error

### Error Response Format
```javascript
{
  "success": false,
  "message": "Detailed error message explaining what went wrong"
}
```

### Common Error Messages

#### Validation Errors
- `"Pickup address is required"`
- `"Passenger count must be between 1 and 5"`
- `"Hours must be a number between 1 and 12"`
- `"startTime must be at least 48 hours in the future"`
- `"Maximum 5 stops allowed"`
- `"No vehicle available for 5 passengers and 4 luggage items"`

#### Business Logic Errors  
- `"Drop-off location is 385.2km from service center (max 350km)"`
- `"Return time must be after start time"`
- `"Outstation trips cannot exceed 500km"`

#### Authentication & Authorization
- `"User authentication required"`
- `"Unauthorized access to booking"`
- `"Invalid or expired token"`

---

## 🔒 Rate Limits & Constraints

### System Limits
- **Maximum passengers**: 5 per booking
- **Maximum luggage**: 4 items per booking  
- **Maximum stops**: 5 intermediate stops
- **Hourly duration**: 1-12 hours
- **Outstation distance**: Up to 500km
- **Service radius**: 350km from Bhubaneswar
- **Advance booking**: 48 hours (hourly), 24 hours (outstation)
- **Pagination**: Maximum 50 items per page

### Coordinate Validation
- **Longitude**: -180 to 180
- **Latitude**: -90 to 90
- **Format**: GeoJSON Point with [longitude, latitude] array

### AddOn Constraints
- **Placard text**: Optional string field
- **Pet selection**: Can choose both cats and dogs
- **Other guest info**: Required if `bookForOther.isBooking` is true

---

## 🔧 Frontend Integration Guide

### Payment Flow
1. Create booking → Receive encrypted payment options
2. Decrypt options using frontend utility
3. Initialize Razorpay with decrypted options
4. User completes payment → Razorpay calls callback URL
5. Backend verifies payment → Redirects to frontend with token
6. Frontend verifies token → Display success/failure

### Decryption Example (Frontend)
```javascript
import { decryptOptions } from './utils/decryptOptions.js';

// After booking creation
const { iv, encryptedData } = response.data.options;
const paymentOptions = decryptOptions(encryptedData, iv);

// Initialize Razorpay
const rzp = new Razorpay(paymentOptions);
rzp.open();
```

### Booking Status Flow
```
pending → confirmed → ongoing → completed
   ↓
cancelled (only from pending/failed payments)
```

---

## 📞 Support & Questions

For any questions or issues with the API:
- Check error messages for specific validation requirements
- Ensure all required fields are included
- Verify coordinate format and ranges
- Check authentication token validity
- Follow the exact request/response formats shown in examples

This documentation covers all aspects of the Eleqt Booking API with real-world examples and comprehensive error handling information.
