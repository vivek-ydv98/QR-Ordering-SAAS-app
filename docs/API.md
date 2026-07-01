# REST API Endpoint Reference

All endpoints are versioned under `/v1`. Calls must include the `X-Tenant-ID` header (containing the restaurant's unique slug) for any tenant-scoped operations.

---

## 1. Authentication Module

### 1.1. User Login
Authenticates staff members and returns access/refresh credentials.

*   **URL**: `/v1/auth/login`
*   **Method**: `POST`
*   **Auth Scope**: Public
*   **Headers**: None
*   **Request Body**:
    ```json
    {
      "email": "manager@tandoori.com",
      "password": "SecurePassword123"
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "refreshToken": "7c9e88d2-44df-419b-a012-...",
      "user": {
        "id": "2d1b82e1-4560-496a-8b1e-089c891e4a3b",
        "fullName": "Amit Patel",
        "email": "manager@tandoori.com",
        "role": "MANAGER",
        "restaurantId": "50c822e1-df08-410a-9d90-b98a12e12db4"
      }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Validation failure (invalid email format).
    *   `401 Unauthorized`: Invalid email or password.

---

## 2. Restaurants & Tables Module

### 2.1. Get Restaurant Setup
Resolves branding setup, active options, and details using its unique slug.

*   **URL**: `/v1/restaurants/by-slug/:slug`
*   **Method**: `GET`
*   **Auth Scope**: Public
*   **Path Params**: `slug` (string) - E.g. `tandoori-palace`
*   **Success Response (200 OK)**:
    ```json
    {
      "id": "50c822e1-df08-410a-9d90-b98a12e12db4",
      "name": "Tandoori Palace",
      "slug": "tandoori-palace",
      "logoUrl": "https://res.cloudinary.com/...",
      "isActive": true,
      "settings": {
        "isVegOnly": false,
        "allowUpiPayments": true,
        "allowWaiterCall": true,
        "cgstRate": 2.5,
        "sgstRate": 2.5,
        "serviceChargeRate": 5.0
      }
    }
    ```

### 2.2. Verify Dining Table Status
Checks if a scanned table QR coordinates are active.

*   **URL**: `/v1/restaurants/tables/by-id/:id`
*   **Method**: `GET`
*   **Auth Scope**: Public
*   **Path Params**: `id` (UUID) - Table ID
*   **Success Response (200 OK)**:
    ```json
    {
      "id": "318c88e1-9d90-410a-aa11-89c822e1a4ff",
      "restaurantId": "50c822e1-df08-410a-9d90-b98a12e12db4",
      "name": "Table 4",
      "status": "VACANT",
      "isActive": true
    }
    ```

---

## 3. Menu & Catalog Module

### 3.1. Fetch Full Menu
Retrieves the restaurant's category structure and associated dishes.

*   **URL**: `/v1/menu`
*   **Method**: `GET`
*   **Auth Scope**: Public
*   **Headers**: `X-Tenant-ID` (Required)
*   **Success Response (200 OK)**:
    ```json
    [
      {
        "id": "111c88d2-44df-419b-a012-789a12bcde34",
        "name": "Starters",
        "menuItems": [
          {
            "id": "222c88d2-44df-419b-a012-789a12bcde56",
            "name": "Paneer Tikka",
            "price": "280.00",
            "isVeg": true,
            "isAvailable": true,
            "imageUrl": "https://...",
            "variants": [],
            "addons": [
              { "id": "333c88", "name": "Extra Dip", "price": "30.00" }
            ]
          }
        ]
      }
    ]
    ```

### 3.2. Add New Menu Item
Creates a new dish in the catalog.

*   **URL**: `/v1/menu/items`
*   **Method**: `POST`
*   **Auth Scope**: Authenticated (`RESTAURANT_ADMIN`, `MANAGER`)
*   **Headers**: `Authorization: Bearer <Token>`, `X-Tenant-ID`
*   **Request Body**:
    ```json
    {
      "categoryId": "111c88d2-44df-419b-a012-789a12bcde34",
      "name": "Butter Naan",
      "description": "Flaky oven-baked flatbread",
      "price": 60.00,
      "isVeg": true,
      "isAvailable": true
    }
    ```
*   **Success Response (210 Created)**: Returns the newly created `MenuItem` object.

---

## 4. Orders Module

### 4.1. Place a Table Order
Places a new order from a customer's dining session.

*   **URL**: `/v1/orders`
*   **Method**: `POST`
*   **Auth Scope**: Public
*   **Headers**: `X-Tenant-ID` (Required)
*   **Request Body**:
    ```json
    {
      "tableId": "318c88e1-9d90-410a-aa11-89c822e1a4ff",
      "specialInstructions": "Make it spicy",
      "items": [
        {
          "menuItemId": "222c88d2-44df-419b-a012-789a12bcde56",
          "quantity": 2,
          "customizations": [
            { "optionName": "Cheese Slice", "price": 40.00 }
          ]
        }
      ]
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "id": "999c88d2-44df-419b-a012-789a12bcde11",
      "kotNumber": "#1001",
      "status": "pending",
      "subtotal": "640.00",
      "cgst": "16.00",
      "sgst": "16.00",
      "serviceCharge": "32.00",
      "grandTotal": "704.00"
    }
    ```

### 4.2. Update Order Status
Updates an order's state (accepting, preparing, completed, etc.).

*   **URL**: `/v1/orders/:id/status`
*   **Method**: `PATCH`
*   **Auth Scope**: Authenticated (`KITCHEN_STAFF`, `WAITER`, `MANAGER`, `RESTAURANT_ADMIN`)
*   **Headers**: `Authorization: Bearer <Token>`, `X-Tenant-ID`
*   **Request Body**:
    ```json
    {
      "status": "preparing"
    }
    ```
*   **Success Response (200 OK)**: Returns the updated `Order` object.
*   **Error Response (400 Bad Request)**: Triggered if the transition violates state machine rules (e.g., trying to move a `pending` order directly to `completed` without accepting it first).
