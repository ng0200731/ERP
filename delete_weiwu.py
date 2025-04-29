import requests

def delete_user():
    email = "weiwu@fuchanghk.com"
    url = f"http://localhost:5000/admin/delete_user/{email}"
    
    print(f"Attempting to delete user {email}...")
    
    try:
        response = requests.get(url)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print(f"User {email} has been successfully deleted.")
        else:
            print(f"Failed to delete user. Status code: {response.status_code}")
    
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    delete_user() 