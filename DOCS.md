# Luxcent Backend API Documentation

This comprehensive document provides all necessary information for frontend developers to integrate with the Luxcent Backend API. The application is a ride-booking platform supporting hourly rentals and outstation trips with integrated payment processing.

---

## **Base URL & Configuration**

- **Development**: `http://localhost:8000` (or configured port)
- **Production**: Use your deployed backend URL
- **API Version**: All routes are prefixed with `/api/v1/`

---

## **Authentication & Security**

- **Method**: JWT tokens stored in HTTP-only cookies
- **Cookie Names**: 
  - User: `userToken`
  - Admin: `adminToken`
- **Protected Routes**: Require authentication middleware
- **CORS**: Configured for cross-origin requests with credentials

---

## **Request/Response Format**

- **Content-Type**: `application/json`
- **Request Body**: JSON format only
- **Timestamps**: ISO 8601 format (e.g., "2024-01-15T10:30:00.000Z")
- **Currency**: All amounts in paise (₹1 = 100 paise)
- **Coordinates**: GeoJSON format [longitude, latitude]

---

# **API ENDPOINTS**

## **User Management Routes**

### 1. Register User
- **URL**: `/api/v1/user/register`
- **Method**: `POST`
- **Authentication**: None
- **Description**: Creates a new user account and sends OTP for verification
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+919876543210",
    "password": "SecurePass123"
  }
  ```
- **Validation Rules**:
  - `name`: 2-50 characters, alphabets and spaces only
  - `email`: Valid email format
  - `phone`: Format +91XXXXXXXXXX (10 digits after +91)
  - `password`: 8-32 characters
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "message": "OTP sent to +919876543210 successfully."
  }
  ```
- **Error Responses**:
  - `400`: Validation errors, existing email/phone
  - `500`: Server error

### 2. Verify OTP
- **URL**: `/api/v1/user/otp-verify`
- **Method**: `POST`
- **Authentication**: None
- **Description**: Verifies OTP and activates user account
- **Request Body**:
  ```json
  {
    "email": "john.doe@example.com",
    "phone": "+919876543210",
    "otp": 123456
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "token": "jwt_token_here",
    "message": "Account Verified."
  }
  ```
- **Error Responses**:
  - `400`: Invalid/expired OTP
  - `404`: No pending verification

### 3. Login User
- **URL**: `/api/v1/user/login`
- **Method**: `POST`
- **Authentication**: None
- **Description**: Authenticates user and sets authentication cookie
- **Request Body**:
  ```json
  {
    "phone": "+919876543210",
    "password": "SecurePass123"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "User logged in successfully."
  }
  ```
- **Error Responses**:
  - `400`: Missing credentials
  - `401`: Invalid phone/password
  - `403`: Account deletion pending

### 4. Logout User
- **URL**: `/api/v1/user/logout`
- **Method**: `GET`
- **Authentication**: Required
- **Description**: Clears authentication cookie
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully."
  }
  ```

### 5. Get Current User
- **URL**: `/api/v1/user/me`
- **Method**: `GET`
- **Authentication**: Required
- **Description**: Retrieves authenticated user's profile
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+919876543210",
      "homecity": "Mumbai",
      "profilePicture": "url_or_null",
      "accountVerified": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
  ```

### 6. Update User Profile
- **URL**: `/api/v1/user/me/update`
- **Method**: `PUT`
- **Authentication**: Required
- **Description**: Updates user profile information
- **Request Body** (all fields optional):
  ```json
  {
    "name": "John Updated",
    "email": "john.updated@example.com",
    "phone": "+919876543211",
    "homecity": "Delhi",
    "profilePicture": "https://example.com/avatar.jpg"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Profile updated successfully.",
    "user": { /* updated user object */ }
  }
  ```

### 7. Forgot Password
- **URL**: `/api/v1/user/password/forgot`
- **Method**: `POST`
- **Authentication**: None
- **Description**: Sends password reset email
- **Request Body**:
  ```json
  {
    "email": "john.doe@example.com"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Email sent to john.doe@example.com successfully."
  }
  ```

### 8. Reset Password
- **URL**: `/api/v1/user/password/reset/:token`
- **Method**: `PUT`
- **Authentication**: None
- **Description**: Resets password using email token
- **URL Parameters**: `token` - Reset token from email
- **Request Body**:
  ```json
  {
    "password": "NewSecurePass123",
    "confirmPassword": "NewSecurePass123"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Reset Password Successfully."
  }
  ```

### 9. Delete User Account
- **URL**: `/api/v1/user/me`
- **Method**: `DELETE`
- **Authentication**: Required
- **Description**: Schedules account deletion (30-day recovery window)
- **Request Body**:
  ```json
  {
    "password": "current_password"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Account deletion scheduled.",
    "deleteRequestedAt": "2024-01-15T10:30:00.000Z"
  }
  ```

### 10. Recover Deleted Account
- **URL**: `/api/v1/user/me/recover`
- **Method**: `PUT`
- **Authentication**: None
- **Description**: Recovers account within 30-day window
- **Request Body**:
  ```json
  {
    "email": "john.doe@example.com",
    "phone": "+919876543210"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Account recovered successfully.",
    "user": { /* user object */ }
  }
  ```

---

## **Booking & Ride Management Routes**

### 1. Get Charges for Hourly Rental
- **URL**: `/api/v1/bookings/charges/hourly-rental`
- **Method**: `POST`
- **Authentication**: Required
- **Description**: Calculates fare for hourly rental without booking
- **Request Body**:
  ```json
  {
    "pickUp": {
      "address": "Mumbai Airport Terminal 2, Mumbai",
      "location": {
        "type": "Point",
        "coordinates": [72.8777, 19.0760]
      }
    },
    "dropOff": {
      "address": "Gateway of India, Mumbai",
      "location": {
        "type": "Point",
        "coordinates": [72.8347, 18.9220]
      }
    },
    "stops": [
      {
        "address": "Marine Drive, Mumbai",
        "location": {
          "type": "Point",
          "coordinates": [72.8234, 18.9434]
        }
      }
    ],
    "passengerCount": 3,
    "luggageCount": 2,
    "startTime": "2024-01-20T14:30:00.000Z",
    "hours": 4,
    "addOns": {
      "airportToll": true,
      "placard": {
        "required": true,
        "text": "Wedding Party"
      },
      "pets": false,
      "bookForOther": {
        "isBooking": false,
        "otherGuestInfo": ""
      }
    }
  }
  ```
- **Field Validation**:
  - `passengerCount`: 1-5
  - `luggageCount`: 0-4
  - `hours`: 1-12
  - `startTime`: Must be 48+ hours in future
  - `stops`: Maximum 5 stops allowed
  - `coordinates`: [longitude, latitude] format
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Charges for hourly rental service calculated successfully",
    "data": {
      "fare": 320000,
      "fareInRupees": "3200.00",
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

### 2. Book Hourly Rental Ride
- **URL**: `/api/v1/bookings/order/hourly-rental`
- **Method**: `POST`
- **Authentication**: Required
- **Description**: Creates hourly rental booking with payment integration
- **Request Body**:
  ```json
  {
    "pickUp": {
      "address": "Mumbai Airport Terminal 2, Mumbai",
      "location": {
        "type": "Point",
        "coordinates": [72.8777, 19.0760]
      }
    },
    "dropOff": {
      "address": "Gateway of India, Mumbai",
      "location": {
        "type": "Point",
        "coordinates": [72.8347, 18.9220]
      }
    },
    "stops": [],
    "passengerCount": 2,
    "luggageCount": 1,
    "startTime": "2024-01-20T14:30:00.000Z",
    "hours": 6,
    "guestCount": 1,
    "addOns": {
      "airportToll": false,
      "placard": {
        "required": false,
        "text": ""
      },
      "pets": true,
      "bookForOther": {
        "isBooking": true,
        "otherGuestInfo": "Booking for my friend John"
      }
    }
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "message": "Hourly rental booking created successfully",
    "data": {
      "bookingId": "booking_id_123",
      "fare": 465000,
      "fareInRupees": "4650.00",
      "carType": "3-seater",
      "serviceType": "hourly-rental",
      "stopsCount": 0,
      "duration": 6,
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "options": {
      "key": "razorpay_key_id",
      "amount": 465000,
      "currency": "INR",
      "name": "Eleqt Rides",
      "description": "Hourly Rental Booking - 6 hours",
      "order_id": "order_xyz123",
      "callback_url": "http://localhost:8000/api/v1/bookings/verify-payment/booking_id_123",
      "prefill": {
        "userId": "user_id",
        "bookingId": "booking_id_123"
      },
      "notes": {
        "bookingType": "hourly-rental",
        "duration": "6 hours",
        "carType": "3-seater"
      },
      "theme": {
        "color": "#eded42ff"
      }
    },
    "meta": {
      "currency": "INR",
      "amountUnit": "paise (₹1 = 100 paise)"
    }
  }
  ```

### 3. Get Charges for Outstation Trip
- **URL**: `/api/v1/bookings/charges/outstation`
- **Method**: `POST`
- **Authentication**: Required
- **Description**: Calculates fare for outstation trip without booking
- **Request Body**:
  ```json
  {
    "pickUp": {
      "address": "Mumbai Central, Mumbai",
      "location": {
        "type": "Point",
        "coordinates": [72.8289, 18.9690]
      }
    },
    "dropOff": {
      "address": "Pune Railway Station, Pune",
      "location": {
        "type": "Point",
        "coordinates": [73.8567, 18.5204]
      }
    },
    "stops": [
      {
        "address": "Lonavala, Maharashtra",
        "location": {
          "type": "Point",
          "coordinates": [73.4067, 18.7547]
        }
      }
    ],
    "passengerCount": 4,
    "luggageCount": 3,
    "startTime": "2024-01-25T09:00:00.000Z",
    "totalDistance": 150,
    "isRoundTrip": true,
    "returnTime": "2024-01-26T18:00:00.000Z",
    "addOns": {
      "airportToll": false,
      "placard": {
        "required": false,
        "text": ""
      },
      "pets": false,
      "bookForOther": {
        "isBooking": false,
        "otherGuestInfo": ""
      }
    }
  }
  ```
- **Field Validation**:
  - `totalDistance`: 1-350 km (maximum outstation range)
  - `isRoundTrip`: boolean
  - `returnTime`: Required if roundTrip, must be after startTime
  - Dropoff must be within 350km radius from service center
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Charges for outstation service calculated successfully",
    "data": {
      "fare": 3750000,
      "fareInRupees": "37500.00",
      "carType": "5-seater",
      "serviceType": "outstation",
      "stopsCount": 1,
      "distance": 150,
      "isRoundTrip": true
    },
    "meta": {
      "currency": "INR",
      "amountUnit": "paise (₹1 = 100 paise)"
    }
  }
  ```

### 4. Book Outstation Trip
- **URL**: `/api/v1/bookings/order/outstation`
- **Method**: `POST`
- **Authentication**: Required
- **Description**: Creates outstation booking with payment integration
- **Request Body**:
  ```json
  {
    "pickUp": {
      "address": "Mumbai Central, Mumbai",
      "location": {
        "type": "Point",
        "coordinates": [72.8289, 18.9690]
      }
    },
    "dropOff": {
      "address": "Goa Airport, Goa",
      "location": {
        "type": "Point",
        "coordinates": [74.1240, 15.3647]
      }
    },
    "stops": [],
    "passengerCount": 2,
    "luggageCount": 4,
    "startTime": "2024-01-28T06:00:00.000Z",
    "totalDistance": 280,
    "isRoundTrip": false,
    "guestCount": 0,
    "addOns": {
      "airportToll": true,
      "placard": {
        "required": false,
        "text": ""
      },
      "pets": false,
      "bookForOther": {
        "isBooking": false,
        "otherGuestInfo": ""
      }
    }
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "message": "Outstation booking created successfully",
    "data": {
      "bookingId": "booking_id_456",
      "fare": 3520000,
      "fareInRupees": "35200.00",
      "carType": "5-seater",
      "serviceType": "outstation",
      "stopsCount": 0,
      "distance": 280,
      "isRoundTrip": false,
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "options": {
      "key": "razorpay_key_id",
      "amount": 3520000,
      "currency": "INR",
      "name": "Eleqt Rides",
      "description": "Outstation Booking - 280km (One Way)",
      "order_id": "order_abc456",
      "callback_url": "http://localhost:8000/api/v1/bookings/verify-payment/booking_id_456",
      "prefill": {
        "userId": "user_id",
        "bookingId": "booking_id_456"
      },
      "notes": {
        "bookingType": "outstation",
        "distance": "280km",
        "tripType": "one-way",
        "carType": "5-seater"
      },
      "theme": {
        "color": "#eded42ff"
      }
    },
    "meta": {
      "currency": "INR",
      "amountUnit": "paise (₹1 = 100 paise)"
    }
  }
  ```

### 5. Verify Payment
- **URL**: `/api/v1/bookings/verify-payment/:bookingId`
- **Method**: `POST`
- **Authentication**: Required
- **Description**: Verifies Razorpay payment and updates booking status
- **URL Parameters**: `bookingId` - Booking ID to verify payment for
- **Request Body**:
  ```json
  {
    "razorpay_payment_id": "pay_xyz123",
    "razorpay_order_id": "order_xyz123", 
    "razorpay_signature": "signature_hash"
  }
  ```
- **Success Response**: Redirects to frontend with success token
- **Error Response**: Redirects to frontend with error message

### 6. Verify Payment Token
- **URL**: `/api/v1/bookings/verify-payment-token`
- **Method**: `POST`
- **Authentication**: Required
- **Description**: Verifies JWT token from successful payment
- **Request Body**:
  ```json
  {
    "token": "jwt_payment_token"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Payment token verified successfully",
    "data": {
      "razorpay_payment_id": "pay_xyz123",
      "razorpay_order_id": "order_xyz123",
      "userId": "user_id"
    }
  }
  ```

---

## **Event Management Routes**

### 1. Create Event
- **URL**: `/api/v1/events`
- **Method**: `POST`
- **Authentication**: Required
- **Description**: Creates a new event booking request
- **Request Body**:
  ```json
  {
    "organizerName": "John Doe",
    "organizerPhone": "+919876543210",
    "eventType": "Wedding",
    "desc": "Wedding transportation for 50 guests from venue to hotel"
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "message": "Event created successfully. We will contact you soon.",
    "event": {
      "id": "event_id_123",
      "organizerName": "John Doe",
      "organizerPhone": "+919876543210",
      "eventType": "Wedding", 
      "desc": "Wedding transportation...",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
  ```

---

## **Admin Routes**

### 1. Admin Login
- **URL**: `/api/v1/admin/login`
- **Method**: `POST`
- **Authentication**: None
- **Description**: Authenticates admin and sets admin cookie
- **Request Body**:
  ```json
  {
    "email": "admin@company.com",
    "password": "AdminPass123"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Admin logged in successfully."
  }
  ```

### 2. Admin Logout  
- **URL**: `/api/v1/admin/logout`
- **Method**: `GET`
- **Authentication**: Required (admin)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Admin Logged out successfully."
  }
  ```

### 3. Get Admin Profile
- **URL**: `/api/v1/admin/me`
- **Method**: `GET`
- **Authentication**: Required (admin)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "admin": {
      "id": "admin_id",
      "name": "Admin Name",
      "email": "admin@company.com",
      "role": "admin",
      "permissions": {
        "deleteUsers": true,
        "approveRides": true,
        "manageAdmins": false
      }
    },
    "message": "Admin profile fetched successfully."
  }
  ```

### 4. Create Admin (Superadmin Only)
- **URL**: `/api/v1/admin/add`
- **Method**: `POST`
- **Authentication**: Required (superadmin)
- **Request Body**:
  ```json
  {
    "name": "New Admin",
    "email": "newadmin@company.com"
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "message": "Admin created successfully. Credentials sent to the email.",
    "admin": { /* admin object */ }
  }
  ```

### 5. List All Admins (Superadmin Only)
- **URL**: `/api/v1/admin/get-all-admins`
- **Method**: `GET`
- **Authentication**: Required (superadmin)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "All admins fetched successfully.",
    "admins": [
      {
        "id": "admin_id",
        "name": "Admin Name",
        "email": "admin@company.com",
        "role": "admin"
      }
    ]
  }
  ```

### 6. Get Admin by ID (Superadmin Only)
- **URL**: `/api/v1/admin/:id`
- **Method**: `GET`
- **Authentication**: Required (superadmin)
- **URL Parameters**: `id` - Admin ID
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "admin": { /* admin object */ },
    "message": "Admin profile fetched successfully."
  }
  ```

### 7. Delete Admin (Superadmin Only)
- **URL**: `/api/v1/admin/:id`
- **Method**: `DELETE`
- **Authentication**: Required (superadmin)
- **URL Parameters**: `id` - Admin ID to delete
- **Request Body**:
  ```json
  {
    "password": "superadmin_password"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Admin deleted successfully.",
    "deletedAdminId": "admin_id",
    "deletedAdminEmail": "admin@company.com"
  }
  ```

### 8. List Users (Admin Only)
- **URL**: `/api/v1/admin/get/users`
- **Method**: `GET`
- **Authentication**: Required (admin)
- **Description**: Retrieves users with filtering, sorting, and pagination
- **Query Parameters**:
  - **Filters**: `name`, `email`, `phone`, `homecity`, `accountVerified` (true/false), `deleteRequest` (true/false)
  - **Date Filters**: `createdAtStart`, `createdAtEnd`, `deleteRequestedAtStart`, `deleteRequestedAtEnd`
  - **Pagination**: `page` (default: 1), `limit` (default: 10, max: 100)
  - **Sorting**: `sort` (e.g., "name,-createdAt" for name ascending, createdAt descending)
- **Example URL**: `/api/v1/admin/get/users?page=1&limit=20&name=john&accountVerified=true&sort=-createdAt`
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Users fetched successfully.",
    "users": [
      {
        "id": "user_id",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+919876543210",
        "homecity": "Mumbai",
        "accountVerified": true,
        "deleteRequest": false,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalPages": 5,
      "totalCount": 95
    }
  }
  ```

### 9. Get User by ID (Admin Only)
- **URL**: `/api/v1/admin/get/users/:id`
- **Method**: `GET`
- **Authentication**: Required (admin)
- **URL Parameters**: `id` - User ID
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "user": { /* complete user object */ }
  }
  ```

### 10. Recover User (Admin Only)
- **URL**: `/api/v1/admin/recover/users/:id`
- **Method**: `PUT`
- **Authentication**: Required (admin)
- **URL Parameters**: `id` - User ID to recover
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "User recovered successfully.",
    "user": { /* recovered user object */ }
  }
  ```

### 11. Delete Multiple Users (Admin Only)
- **URL**: `/api/v1/admin/delete/users`
- **Method**: `DELETE`
- **Authentication**: Required (admin)
- **Description**: Deletes users based on query filters
- **Query Parameters**: Same as list users endpoint
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Users deleted successfully."
  }
  ```

### 12. Delete User by ID (Admin Only)
- **URL**: `/api/v1/admin/delete/users/:id`
- **Method**: `DELETE`
- **Authentication**: Required (admin)
- **URL Parameters**: `id` - User ID to delete
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Deleted user: user@example.com",
    "userId": "user_id",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
  ```

### 13. Event Management (Admin Only)
- **Get All Events**: `GET /api/v1/events`
- **Get Event by ID**: `GET /api/v1/events/:id`
- **Update Event Status**: `PUT /api/v1/events/:id`
- **Delete Event**: `DELETE /api/v1/events/:id`
- **Cleanup Old Events**: `DELETE /api/v1/events/cleanup`

---

## **Payment Integration Guide**

### **Razorpay Integration Flow**

1. **Frontend receives booking response** with `options` object
2. **Initialize Razorpay** with the options:
   ```javascript
   const options = response.data.options;
   const rzp = new Razorpay(options);
   rzp.open();
   ```
3. **Handle payment success/failure** in Razorpay callbacks
4. **Verify payment** using the verify endpoint
5. **Handle redirects** to success/failure pages

### **Car Type Assignment Logic**

| Passengers | Max Luggage (3-seater) | Max Luggage (5-seater) |
|------------|------------------------|------------------------|
| 1          | 3                      | 5                      |
| 2          | 3                      | 5                      |
| 3          | 2                      | 4                      |
| 4          | -                      | 3                      |
| 5          | -                      | 2                      |

### **Fare Calculation**

**Hourly Rental:**
- Base: ₹750/hour
- Add-ons: Airport toll (+₹200), Placard (+₹100), Pets (+₹150)

**Outstation:**
- 3-seater: ₹115/km base
- 5-seater: ₹125/km base  
- Round trip: 2x base fare
- Add-ons: Same as hourly

### **Service Area Constraints**

- **Pickup**: No restrictions
- **Dropoff (Outstation)**: Within 350km radius from service center (20.2945°N, 85.8166°E)
- **Maximum Distance**: 350km for outstation trips

---

## **Error Handling**

### **Standard Error Response Format**
```json
{
  "success": false,
  "message": "Detailed error message"
}
```

### **Common HTTP Status Codes**
- **200**: Success
- **201**: Created successfully
- **400**: Bad request/validation error
- **401**: Unauthorized/invalid credentials
- **403**: Forbidden/insufficient permissions
- **404**: Resource not found
- **409**: Conflict (duplicate resource)
- **500**: Internal server error

### **Validation Error Examples**
```json
{
  "success": false,
  "message": "Passenger count must be between 1 and 5"
}
```

---

## **Best Practices for Frontend Integration**

### **1. Cookie Management**
- Ensure `withCredentials: true` for API calls
- Handle cookie expiration gracefully
- Implement automatic logout on 401 responses

### **2. Error Handling**
```javascript
try {
  const response = await fetch('/api/v1/user/me', {
    credentials: 'include'
  });
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data;
} catch (error) {
  console.error('API Error:', error.message);
  // Handle error appropriately
}
```

### **3. Booking Flow Implementation**
```javascript
// 1. Get fare estimate
const fareResponse = await fetch('/api/v1/bookings/charges/hourly-rental', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify(bookingData)
});

// 2. Create booking
const bookingResponse = await fetch('/api/v1/bookings/order/hourly-rental', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify(bookingData)
});

// 3. Initialize Razorpay
const { options } = bookingResponse.data;
const rzp = new Razorpay(options);
rzp.open();
```

### **4. Date/Time Handling**
- Always use ISO 8601 format
- Ensure 48+ hour advance booking
- Handle timezone conversions properly

### **5. Location Data**
- Use GeoJSON Point format
- Coordinates in [longitude, latitude] order
- Validate coordinates before sending

---

## **Development Notes**

- **Database**: MongoDB with collections for Users, Admins, Bookings, Events
- **Authentication**: JWT tokens with HTTP-only cookies
- **Payment Gateway**: Razorpay integration
- **Logging**: Comprehensive logging for audit trails
- **Email Service**: Automated emails for notifications
- **SMS Service**: OTP verification via SMS
- **CORS**: Configured for frontend integration
- **Rate Limiting**: Implement on frontend to avoid spam

---

## **Environment Variables Required**

```env
# Database
MONGODB_URI=mongodb://localhost:27017/UserManagement

# JWT
JWT_SECRET_KEY=your_jwt_secret

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_SECRET_KEY=your_razorpay_secret

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

# Email & SMS (configure as needed)
EMAIL_SERVICE_CONFIG=...
SMS_SERVICE_CONFIG=...
```

This documentation provides comprehensive information for seamless frontend integration. For any additional clarification or custom requirements, refer to the source code or contact the development team.
