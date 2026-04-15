"""
The Beat 515 Radio Station - Backend API Tests
Tests for: Auth, News, Song Requests, Shows, Now Playing, Admin endpoints
"""
import pytest
import requests
import os

# Use public URL for testing - read from frontend .env
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip().rstrip('/')
    except:
        pass
    return 'https://build-hub-401.preview.emergentagent.com'

BASE_URL = get_backend_url()

class TestHealth:
    """Basic health check"""
    
    def test_backend_reachable(self):
        """Verify backend is accessible"""
        try:
            response = requests.get(f"{BASE_URL}/api/news", timeout=5)
            assert response.status_code in [200, 404], f"Backend not reachable, got {response.status_code}"
            print("✓ Backend is reachable")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Backend not reachable: {e}")


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_admin_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@thebeat515.com",
            "password": "Beat515Admin!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response missing user"
        assert "access_token" in data, "Response missing access_token"
        assert "refresh_token" in data, "Response missing refresh_token"
        assert data["user"]["email"] == "admin@thebeat515.com"
        assert data["user"]["role"] == "admin"
        assert "password_hash" not in data["user"], "Password hash leaked in response"
        print(f"✓ Admin login successful, user_id: {data['user']['user_id']}")
    
    def test_login_dj_success(self):
        """Test DJ login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "dj@thebeat515.com",
            "password": "DJBeat515!"
        })
        assert response.status_code == 200, f"DJ login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "dj"
        print(f"✓ DJ login successful")
    
    def test_login_editor_success(self):
        """Test editor login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "news@thebeat515.com",
            "password": "News515!"
        })
        assert response.status_code == 200, f"Editor login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "editor"
        print(f"✓ Editor login successful")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@thebeat515.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, "Should reject invalid credentials"
        print("✓ Invalid credentials rejected")
    
    def test_register_new_listener(self):
        """Test registering a new listener account"""
        import uuid
        test_email = f"test_listener_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "Test Listener"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["role"] == "listener", "New users should be listeners"
        assert "access_token" in data
        print(f"✓ New listener registered: {test_email}")
    
    def test_register_duplicate_email(self):
        """Test that duplicate email registration fails"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "admin@thebeat515.com",
            "password": "SomePass123!",
            "name": "Duplicate"
        })
        assert response.status_code == 400, "Should reject duplicate email"
        print("✓ Duplicate email registration rejected")


class TestNews:
    """News endpoint tests"""
    
    def test_get_news_list(self):
        """Test fetching news articles"""
        response = requests.get(f"{BASE_URL}/api/news")
        assert response.status_code == 200, f"Failed to get news: {response.text}"
        
        articles = response.json()
        assert isinstance(articles, list), "News should be a list"
        assert len(articles) > 0, "Should have seeded news articles"
        
        # Verify article structure
        article = articles[0]
        assert "news_id" in article
        assert "title" in article
        assert "content" in article
        assert "category" in article
        assert "_id" not in article, "MongoDB _id should be excluded"
        print(f"✓ News list retrieved: {len(articles)} articles")
    
    def test_get_news_by_id(self):
        """Test fetching a specific news article"""
        # First get list to get an ID
        list_response = requests.get(f"{BASE_URL}/api/news")
        articles = list_response.json()
        
        if len(articles) > 0:
            news_id = articles[0]["news_id"]
            response = requests.get(f"{BASE_URL}/api/news/{news_id}")
            assert response.status_code == 200, f"Failed to get news detail: {response.text}"
            
            article = response.json()
            assert article["news_id"] == news_id
            print(f"✓ News detail retrieved: {article['title']}")
    
    def test_get_news_by_category(self):
        """Test filtering news by category"""
        response = requests.get(f"{BASE_URL}/api/news?category=events")
        assert response.status_code == 200
        articles = response.json()
        # All returned articles should be in events category
        for article in articles:
            assert article["category"] == "events"
        print(f"✓ News filtered by category: {len(articles)} events")


class TestNowPlaying:
    """Now Playing endpoint tests"""
    
    def test_get_now_playing(self):
        """Test fetching current now playing info"""
        response = requests.get(f"{BASE_URL}/api/now-playing")
        assert response.status_code == 200, f"Failed to get now playing: {response.text}"
        
        data = response.json()
        assert "song_title" in data
        assert "artist" in data
        assert "_id" not in data, "MongoDB _id should be excluded"
        print(f"✓ Now playing: {data['song_title']} by {data['artist']}")


class TestShows:
    """Shows endpoint tests"""
    
    def test_get_shows_list(self):
        """Test fetching shows list"""
        response = requests.get(f"{BASE_URL}/api/shows")
        assert response.status_code == 200, f"Failed to get shows: {response.text}"
        
        shows = response.json()
        assert isinstance(shows, list), "Shows should be a list"
        assert len(shows) > 0, "Should have seeded shows"
        
        # Verify show structure
        show = shows[0]
        assert "show_id" in show
        assert "name" in show
        assert "dj_name" in show
        assert "_id" not in show, "MongoDB _id should be excluded"
        print(f"✓ Shows list retrieved: {len(shows)} shows")


class TestSongRequests:
    """Song request endpoint tests (requires auth)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@thebeat515.com",
            "password": "Beat515Admin!"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Auth failed, skipping authenticated tests")
    
    def test_create_song_request(self, auth_token):
        """Test creating a song request (authenticated)"""
        response = requests.post(f"{BASE_URL}/api/requests", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "song_title": "Test Song Request",
                "artist": "Test Artist",
                "message": "This is a test request"
            }
        )
        assert response.status_code == 200, f"Failed to create request: {response.text}"
        
        data = response.json()
        assert "request_id" in data
        assert data["song_title"] == "Test Song Request"
        assert data["status"] == "pending"
        assert "_id" not in data, "MongoDB _id should be excluded"
        print(f"✓ Song request created: {data['request_id']}")
    
    def test_get_requests_list(self):
        """Test fetching song requests list"""
        response = requests.get(f"{BASE_URL}/api/requests")
        assert response.status_code == 200, f"Failed to get requests: {response.text}"
        
        requests_list = response.json()
        assert isinstance(requests_list, list), "Requests should be a list"
        print(f"✓ Requests list retrieved: {len(requests_list)} requests")
    
    def test_create_request_without_auth(self):
        """Test that creating request without auth fails"""
        response = requests.post(f"{BASE_URL}/api/requests", json={
            "song_title": "Unauthorized Request",
            "artist": "Test"
        })
        assert response.status_code == 401, "Should require authentication"
        print("✓ Unauthenticated request rejected")


class TestAdminEndpoints:
    """Admin-only endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@thebeat515.com",
            "password": "Beat515Admin!"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin auth failed")
    
    @pytest.fixture
    def listener_token(self):
        """Get listener auth token for permission testing"""
        import uuid
        test_email = f"test_listener_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "Test Listener"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Listener registration failed")
    
    def test_get_admin_stats(self, admin_token):
        """Test fetching admin stats"""
        response = requests.get(f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        
        stats = response.json()
        assert "total_users" in stats
        assert "total_news" in stats
        assert "total_requests" in stats
        assert "pending_requests" in stats
        assert "total_shows" in stats
        assert isinstance(stats["total_users"], int)
        print(f"✓ Admin stats: {stats['total_users']} users, {stats['total_news']} news, {stats['total_requests']} requests")
    
    def test_admin_stats_requires_admin_role(self, listener_token):
        """Test that non-admin cannot access admin stats"""
        response = requests.get(f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {listener_token}"}
        )
        assert response.status_code == 403, "Should reject non-admin access"
        print("✓ Admin stats protected from non-admin users")
    
    def test_get_admin_users_list(self, admin_token):
        """Test fetching users list (admin only)"""
        response = requests.get(f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0
        # Verify no password hashes leaked
        for user in users:
            assert "password_hash" not in user, "Password hash leaked"
            assert "_id" not in user, "MongoDB _id should be excluded"
        print(f"✓ Admin users list retrieved: {len(users)} users")


class TestStreamConfig:
    """Stream configuration endpoint tests"""
    
    def test_get_stream_config(self):
        """Test fetching stream configuration"""
        response = requests.get(f"{BASE_URL}/api/stream-config")
        assert response.status_code == 200, f"Failed to get stream config: {response.text}"
        
        config = response.json()
        assert "stream_url" in config
        assert "station_name" in config
        assert "tagline" in config
        assert config["station_name"] == "The Beat 515"
        assert config["tagline"] == "Proud. Loud. Local."
        print(f"✓ Stream config: {config['station_name']} - {config['tagline']}")
