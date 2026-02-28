#!/bin/bash

# Register a test admin user
curl -X POST http://localhost:5100/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@chosen.com",
    "password": "Admin123!",
    "fullName": "Admin User",
    "role": "Admin"
  }'

echo ""
echo "User registered! Now login with:"
echo "Email: admin@chosen.com"
echo "Password: Admin123!"
