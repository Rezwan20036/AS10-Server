# FoodBridge Server

A Node.js/Express-based REST API server for managing food donations and requests. The application facilitates food sharing between donors and recipients using Firebase authentication and MongoDB for data persistence.

## Overview

FoodBridge is a backend server that enables users to:
- Post available food items for donation
- Request food items from other users
- Accept or reject donation requests
- Manage their own food listings and requests

## Technologies Used

- **Runtime**: Node.js
- **Authentication**: Firebase Admin SDK
- **Database**: MongoDB
- **CORS**: Enabled for cross-origin requests
- **Environment Variables**: Dotenv

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   MONGO_URI=<your_mongodb_connection_string>
   DB_NAME=<your_database_name>
   FIREBASE_SERVICE_KEY=<base64_encoded_firebase_service_account_key>
   ```

## Running the Server

```bash
npm start
```

The server will start and connect to MongoDB. By default, it runs on port 3000 (or as configured in `index.js`).

## API Endpoints

### Health Check
- **GET** `/`
  - Returns: `{ ok: true, message: 'FoodBridge server running' }`

### Foods Management

#### Get All Foods
- **GET** `/foods`
- **Query Parameters**:
  - `status` (optional): Filter by food_status (e.g., "Available", "Donated")
- **Returns**: Array of food items
- **Authentication**: Not required

#### Get Food by ID
- **GET** `/foods/:id`
- **Returns**: Food item with associated requests array
- **Authentication**: Not required

#### Create Food Item
- **POST** `/foods`
- **Headers**: `Authorization: Bearer <firebase_token>`
- **Body**:
  ```json
  {
    "food_name": "string",
    "quantity": "string",
    "description": "string",
    "food_status": "string",
    "location": "string",
    "donator_email": "string (auto-filled if not provided)"
  }
  ```
- **Returns**: `{ insertedId: <food_id> }`
- **Authentication**: Required

#### Update Food Item
- **PATCH** `/foods/:id`
- **Headers**: `Authorization: Bearer <firebase_token>`
- **Body**: Object with fields to update
- **Returns**: MongoDB updateOne result
- **Authentication**: Required
- **Authorization**: Only the food donator can update

#### Delete Food Item
- **DELETE** `/foods/:id`
- **Headers**: `Authorization: Bearer <firebase_token>`
- **Returns**: MongoDB deleteOne result
- **Authentication**: Required
- **Authorization**: Only the food donator can delete

### Requests Management

#### Create Request
- **POST** `/requests`
- **Headers**: `Authorization: Bearer <firebase_token>`
- **Body**:
  ```json
  {
    "food_id": "string",
    "message": "string (optional)"
  }
  ```
- **Auto-filled Fields**:
  - `requester_email`: From Firebase token
  - `requester_name`: From Firebase token
  - `requester_photo`: From Firebase token
  - `status`: Set to "pending"
  - `created_at`: ISO timestamp
- **Returns**: `{ insertedId: <request_id> }`
- **Authentication**: Required

#### Get All Requests
- **GET** `/requests`
- **Query Parameters**:
  - `status` (optional): Filter by request status (e.g., "pending", "accepted", "rejected")
- **Returns**: Array of requests
- **Authentication**: Not required

#### Get Requests for Specific Food
- **GET** `/foods/:id/requests`
- **Headers**: `Authorization: Bearer <firebase_token>`
- **Returns**: Array of requests for the specified food
- **Authentication**: Required
- **Authorization**: Only the food donator can view requests for their food

#### Update Request Status
- **PATCH** `/requests/:id`
- **Headers**: `Authorization: Bearer <firebase_token>`
- **Body**:
  ```json
  {
    "action": "accept" | "reject"
  }
  ```
- **Returns**: 
  - If accepted: `{ message: 'accepted' }` and updates food status to "Donated"
  - If rejected: `{ message: 'rejected' }`
- **Authentication**: Required
- **Authorization**: Only the food donator can accept/reject requests

## Authentication

The server uses Firebase Admin SDK for token verification. All protected endpoints require:
- `Authorization` header with format: `Bearer <firebase_token>`

The `verifyFirebaseToken` middleware:
- Extracts and verifies the Firebase ID token
- Attaches user information to the request object:
  - `req.token_email`: User's email
  - `req.token_name`: User's full name
  - `req.token_photo`: User's profile photo URL

## Database Collections

### foods
```javascript
{
  _id: ObjectId,
  food_name: String,
  quantity: String,
  description: String,
  food_status: String,
  location: String,
  donator_email: String,
  // other fields
}
```

### requests
```javascript
{
  _id: ObjectId,
  food_id: String,
  requester_email: String,
  requester_name: String,
  requester_photo: String,
  status: String, // "pending", "accepted", "rejected"
  created_at: String,
  // other fields
}
```

## Error Handling

Common HTTP Status Codes:
- **200**: Successful request
- **400**: Invalid request (e.g., invalid action in request update)
- **401**: Unauthorized (missing or invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Resource not found
- **500**: Server error

## Environment Setup

Ensure the following are configured in your `.env` file:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true` |
| `DB_NAME` | MongoDB database name | `foodbridge` |
| `FIREBASE_SERVICE_KEY` | Base64-encoded Firebase service account key | (base64 string) |

## Notes

- MongoDB connections are pooled and reused to improve performance
- CORS is enabled to allow cross-origin requests
- All dates are stored in ISO format (UTC)
- Authorization checks ensure users can only modify their own food items and view their own request lists
