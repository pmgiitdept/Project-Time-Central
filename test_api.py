import requests

# 1. First login to get a token
login_url = "http://127.0.0.1:8000/api/auth/login/"
login_data = {
    "username": "admin1",   # change this to your username
    "password": "AdminPass123"  # change this to the correct password
}

login_response = requests.post(login_url, data=login_data)
print("Login response:", login_response.json())

# Extract access token
access_token = login_response.json().get("access")

# 2. Use the token to call protected endpoints
headers = {
    "Authorization": f"Bearer {access_token}"
}

# Example: /api/auth/me/
me_url = "http://127.0.0.1:8000/api/auth/me/"
me_response = requests.get(me_url, headers=headers)
print("Me response:", me_response.json())

# Example: /api/files/dashboard-stats/
stats_url = "http://127.0.0.1:8000/api/dashboard-stats/"
stats_response = requests.get(stats_url, headers=headers)
print("Dashboard Stats:", stats_response.json())
