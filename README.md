# Luxcent Backend

Backend for premium EV rental business managed by Psynux Software.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [MongoDB](https://www.mongodb.com/)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/luxcent-backend.git
    cd luxcent-backend
    ```

2.  **Install NPM packages**
    ```bash
    npm install
    ```

3.  **Create a `.env` file** in the root directory and add the following environment variables:

    ```env
    PORT=4000
    FRONTEND_URL=http://localhost:5173
    MONGO_URI=<your_mongodb_uri>

    # Twilio
    TWILIO_SID=<your_twilio_sid>
    TWILIO_PHONE_NUMBER=<your_twilio_phone_number>
    TWILIO_AUTH_TOKEN=<your_twilio_auth_token>

    # SMTP
    SMTP_HOST=<your_smtp_host>
    SMTP_SERVICE=<your_smtp_service>
    SMTP_PORT=<your_smtp_port>
    SMTP_MAIL=<your_smtp_mail>
    SMTP_PASSWORD=<your_smtp_password>

    # JWT
    JWT_SECRET_KEY=<your_jwt_secret_key>
    JWT_EXPIRE=7d
    COOKIE_EXPIRE=7
    ```

### Running the application

-   **Development mode:**
    ```bash
    npm run dev
    ```
    This will start the server with `nodemon` for automatic restarts on file changes.

-   **Production mode:**
    ```bash
    npm run start
    ```

## API Routes

The base URL for all API routes is `/api/v1`.

### User Routes

-   **Register a new user**
    -   **Endpoint:** `/users/register`
    -   **Method:** `POST`
    -   **Request Body:**
        ```json
        {
          "name": "John Doe",
          "email": "john.doe@example.com",
          "phone": "+1234567890",
          "password": "yourpassword"
        }
        ```

-   **Verify OTP**
    -   **Endpoint:** `/users/otp-verify`
    -   **Method:** `POST`
    -   **Request Body:**
        ```json
        {
          "email": "john.doe@example.com",
          "phone": "+1234567890",
          "otp": "123456"
        }
        ```

-   **Login**
    -   **Endpoint:** `/users/login`
    -   **Method:** `POST`
    -   **Request Body:**
        ```json
        {
          "phone": "+1234567890",
          "password": "yourpassword"
        }
        ```

-   **Logout**
    -   **Endpoint:** `/users/logout`
    -   **Method:** `GET`
    -   **Authentication:** Required (Cookie)

-   **Get User Details**
    -   **Endpoint:** `/users/me`
    -   **Method:** `GET`
    -   **Authentication:** Required (Cookie)

-   **Forgot Password**
    -   **Endpoint:** `/users/password/forgot`
    -   **Method:** `POST`
    -   **Request Body:**
        ```json
        {
          "email": "john.doe@example.com"
        }
        ```

-   **Reset Password**
    -   **Endpoint:** `/users/password/reset/:token`
    -   **Method:** `PUT`
    -   **Request Body:**
        ```json
        {
          "password": "newpassword",
          "confirmPassword": "newpassword"
        }
        ```

## Built With

-   [Express](https://expressjs.com/) - The web framework used
-   [Mongoose](https://mongoosejs.com/) - Object Data Modeling (ODM) library for MongoDB
-   [Twilio](https://www.twilio.com/) - For sending OTP messages
-   [Nodemailer](https://nodemailer.com/) - For sending emails
-   [JSON Web Token](https://jwt.io/) - For authentication
-   [Bcrypt](https://www.npmjs.com/package/bcrypt) - For password hashing
