import requests
import json

# Test the authentication endpoint
url = "http://localhost:8000/api/v1/accounts/token/"
data = {
    "email": "test@example.com",
    "password": "testpass123"
}

print("Testing authentication endpoint...")
print(f"URL: {url}")
print(f"Data: {data}")

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        print("✅ Authentication successful!")
        tokens = response.json()
        print(f"Access token: {tokens.get('access', 'Not found')[:50]}...")
    else:
        print("❌ Authentication failed")
        
except requests.exceptions.ConnectionError:
    print("❌ Connection failed - is Django server running?")
except Exception as e:
    print(f"❌ Error: {e}")
