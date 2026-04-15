"""
The Beat 515 Radio Station - Rewards System API Tests
Tests for: Rewards catalog, points, leaderboard, check-in, redemption, auto-point-earning
"""
import pytest
import requests
import os
import uuid

# Use public URL for testing
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


class TestRewardsPublicEndpoints:
    """Test public rewards endpoints (no auth required)"""
    
    def test_get_rewards_catalog(self):
        """Test fetching rewards catalog (public)"""
        response = requests.get(f"{BASE_URL}/api/rewards")
        assert response.status_code == 200, f"Failed to get rewards: {response.text}"
        
        rewards = response.json()
        assert isinstance(rewards, list), "Rewards should be a list"
        assert len(rewards) > 0, "Should have seeded rewards"
        
        # Verify reward structure
        reward = rewards[0]
        assert "reward_id" in reward
        assert "name" in reward
        assert "description" in reward
        assert "points_cost" in reward
        assert "icon" in reward
        assert "category" in reward
        assert "active" in reward
        assert "_id" not in reward, "MongoDB _id should be excluded"
        print(f"✓ Rewards catalog retrieved: {len(rewards)} rewards")
        
        # Verify rewards are sorted by points_cost
        costs = [r["points_cost"] for r in rewards]
        assert costs == sorted(costs), "Rewards should be sorted by points_cost"
        print(f"✓ Rewards sorted by cost: {costs}")
    
    def test_get_leaderboard(self):
        """Test fetching leaderboard (public)"""
        response = requests.get(f"{BASE_URL}/api/rewards/leaderboard")
        assert response.status_code == 200, f"Failed to get leaderboard: {response.text}"
        
        leaders = response.json()
        assert isinstance(leaders, list), "Leaderboard should be a list"
        
        # Verify leaderboard structure
        if len(leaders) > 0:
            leader = leaders[0]
            assert "user_id" in leader
            assert "name" in leader
            assert "role" in leader
            assert "lifetime_points" in leader
            assert "_id" not in leader, "MongoDB _id should be excluded"
            
            # Verify sorted by lifetime_points descending
            points = [l["lifetime_points"] for l in leaders]
            assert points == sorted(points, reverse=True), "Leaderboard should be sorted by lifetime_points desc"
            print(f"✓ Leaderboard retrieved: {len(leaders)} leaders, top: {leader['name']} with {leader['lifetime_points']} pts")
        else:
            print("✓ Leaderboard empty (no users with points yet)")


class TestRewardsAuthenticatedEndpoints:
    """Test authenticated rewards endpoints"""
    
    @pytest.fixture
    def test_user_token(self):
        """Create a fresh test user for rewards testing"""
        test_email = f"test_rewards_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "Test Rewards User"
        })
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Test user created: {test_email}")
            return data["access_token"], data["user"]["user_id"]
        pytest.skip("User registration failed")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@thebeat515.com",
            "password": "Beat515Admin!"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin auth failed")
    
    def test_get_my_points_new_user(self, test_user_token):
        """Test getting points for a new user (should be 0)"""
        token, user_id = test_user_token
        response = requests.get(f"{BASE_URL}/api/rewards/my-points",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed to get my points: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "points" in data
        assert "lifetime_points" in data
        assert data["user_id"] == user_id
        assert data["points"] == 0, "New user should have 0 points"
        assert data["lifetime_points"] == 0
        assert "_id" not in data, "MongoDB _id should be excluded"
        print(f"✓ New user points: {data['points']} current, {data['lifetime_points']} lifetime")
    
    def test_get_my_points_requires_auth(self):
        """Test that my-points requires authentication"""
        response = requests.get(f"{BASE_URL}/api/rewards/my-points")
        assert response.status_code == 401, "Should require authentication"
        print("✓ My-points endpoint protected")
    
    def test_get_my_history_new_user(self, test_user_token):
        """Test getting history for new user (should be empty)"""
        token, user_id = test_user_token
        response = requests.get(f"{BASE_URL}/api/rewards/my-history",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed to get history: {response.text}"
        
        history = response.json()
        assert isinstance(history, list), "History should be a list"
        # New user might have 0 transactions
        print(f"✓ User history retrieved: {len(history)} transactions")
    
    def test_daily_check_in(self, test_user_token):
        """Test daily check-in awards 25 points"""
        token, user_id = test_user_token
        
        # Check-in
        response = requests.post(f"{BASE_URL}/api/rewards/check-in",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Check-in failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "points" in data
        assert data["points"] == 25, "Check-in should award 25 points"
        print(f"✓ Check-in successful: {data['message']}, points: {data['points']}")
        
        # Verify points were added
        points_response = requests.get(f"{BASE_URL}/api/rewards/my-points",
            headers={"Authorization": f"Bearer {token}"}
        )
        points_data = points_response.json()
        assert points_data["points"] == 25, "Points should be 25 after check-in"
        assert points_data["lifetime_points"] == 25
        print(f"✓ Points verified: {points_data['points']} current, {points_data['lifetime_points']} lifetime")
        
        # Verify transaction in history
        history_response = requests.get(f"{BASE_URL}/api/rewards/my-history",
            headers={"Authorization": f"Bearer {token}"}
        )
        history = history_response.json()
        assert len(history) > 0, "Should have check-in transaction"
        check_in_tx = history[0]
        assert check_in_tx["type"] == "check_in"
        assert check_in_tx["points"] == 25
        assert "Daily check-in" in check_in_tx["description"]
        print(f"✓ Check-in transaction logged: {check_in_tx['description']}")
    
    def test_daily_check_in_duplicate_same_day(self, test_user_token):
        """Test that duplicate check-in on same day fails"""
        token, user_id = test_user_token
        
        # First check-in
        response1 = requests.post(f"{BASE_URL}/api/rewards/check-in",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 200, "First check-in should succeed"
        
        # Second check-in (should fail)
        response2 = requests.post(f"{BASE_URL}/api/rewards/check-in",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response2.status_code == 400, "Duplicate check-in should fail"
        data = response2.json()
        assert "Already checked in" in data["detail"]
        print("✓ Duplicate check-in rejected")
    
    def test_check_in_requires_auth(self):
        """Test that check-in requires authentication"""
        response = requests.post(f"{BASE_URL}/api/rewards/check-in")
        assert response.status_code == 401, "Should require authentication"
        print("✓ Check-in endpoint protected")


class TestPointsAutoEarning:
    """Test automatic point earning from song requests and chat"""
    
    @pytest.fixture
    def test_user_token(self):
        """Create a fresh test user"""
        test_email = f"test_auto_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "Test Auto Points"
        })
        if response.status_code == 200:
            data = response.json()
            return data["access_token"], data["user"]["user_id"]
        pytest.skip("User registration failed")
    
    def test_song_request_awards_10_points(self, test_user_token):
        """Test that making a song request automatically awards 10 points"""
        token, user_id = test_user_token
        
        # Check initial points
        points_before = requests.get(f"{BASE_URL}/api/rewards/my-points",
            headers={"Authorization": f"Bearer {token}"}
        ).json()
        initial_points = points_before.get("points", 0)
        
        # Make a song request
        request_response = requests.post(f"{BASE_URL}/api/requests",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "song_title": "Test Song for Points",
                "artist": "Test Artist",
                "message": "Testing auto points"
            }
        )
        assert request_response.status_code == 200, f"Request failed: {request_response.text}"
        print(f"✓ Song request created")
        
        # Check points after
        points_after = requests.get(f"{BASE_URL}/api/rewards/my-points",
            headers={"Authorization": f"Bearer {token}"}
        ).json()
        
        assert points_after["points"] == initial_points + 10, "Should have +10 points after request"
        assert points_after["lifetime_points"] == initial_points + 10
        print(f"✓ Points awarded: {initial_points} → {points_after['points']} (+10)")
        
        # Verify transaction in history
        history = requests.get(f"{BASE_URL}/api/rewards/my-history",
            headers={"Authorization": f"Bearer {token}"}
        ).json()
        
        request_tx = [tx for tx in history if tx["type"] == "request"]
        assert len(request_tx) > 0, "Should have request transaction"
        assert request_tx[0]["points"] == 10
        assert "Song request" in request_tx[0]["description"]
        print(f"✓ Request transaction logged: {request_tx[0]['description']}")
    
    def test_chat_message_awards_5_points(self, test_user_token):
        """Test that sending a chat message automatically awards 5 points"""
        token, user_id = test_user_token
        
        # Check initial points
        points_before = requests.get(f"{BASE_URL}/api/rewards/my-points",
            headers={"Authorization": f"Bearer {token}"}
        ).json()
        initial_points = points_before.get("points", 0)
        
        # Send a chat message
        chat_response = requests.post(f"{BASE_URL}/api/requests/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": "Testing chat points!"}
        )
        assert chat_response.status_code == 200, f"Chat failed: {chat_response.text}"
        print(f"✓ Chat message sent")
        
        # Check points after
        points_after = requests.get(f"{BASE_URL}/api/rewards/my-points",
            headers={"Authorization": f"Bearer {token}"}
        ).json()
        
        assert points_after["points"] == initial_points + 5, "Should have +5 points after chat"
        assert points_after["lifetime_points"] == initial_points + 5
        print(f"✓ Points awarded: {initial_points} → {points_after['points']} (+5)")
        
        # Verify transaction in history
        history = requests.get(f"{BASE_URL}/api/rewards/my-history",
            headers={"Authorization": f"Bearer {token}"}
        ).json()
        
        chat_tx = [tx for tx in history if tx["type"] == "chat"]
        assert len(chat_tx) > 0, "Should have chat transaction"
        assert chat_tx[0]["points"] == 5
        assert "Chat message" in chat_tx[0]["description"]
        print(f"✓ Chat transaction logged: {chat_tx[0]['description']}")


class TestRewardRedemption:
    """Test reward redemption flow"""
    
    @pytest.fixture
    def user_with_points(self):
        """Create user and give them points via check-in"""
        test_email = f"test_redeem_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "Test Redeem User"
        })
        if response.status_code == 200:
            data = response.json()
            token = data["access_token"]
            
            # Do check-in to get 25 points
            requests.post(f"{BASE_URL}/api/rewards/check-in",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            # Make a request for 10 more points (total 35)
            requests.post(f"{BASE_URL}/api/requests",
                headers={"Authorization": f"Bearer {token}"},
                json={"song_title": "Test", "artist": "Test"}
            )
            
            # Send 3 chat messages for 15 more points (total 50)
            requests.post(f"{BASE_URL}/api/requests/chat",
                headers={"Authorization": f"Bearer {token}"},
                json={"message": "Test 1"}
            )
            requests.post(f"{BASE_URL}/api/requests/chat",
                headers={"Authorization": f"Bearer {token}"},
                json={"message": "Test 2"}
            )
            requests.post(f"{BASE_URL}/api/requests/chat",
                headers={"Authorization": f"Bearer {token}"},
                json={"message": "Test 3"}
            )
            
            print(f"✓ User created with 50 points")
            return token, data["user"]["user_id"]
        pytest.skip("User setup failed")
    
    def test_redeem_reward_success(self, user_with_points):
        """Test successful reward redemption"""
        token, user_id = user_with_points
        
        # Get rewards catalog
        rewards = requests.get(f"{BASE_URL}/api/rewards").json()
        
        # Find a reward we can afford (50 points available)
        affordable = [r for r in rewards if r["points_cost"] <= 50]
        assert len(affordable) > 0, "Should have affordable rewards"
        
        reward = affordable[0]
        print(f"✓ Redeeming: {reward['name']} for {reward['points_cost']} points")
        
        # Check points before
        points_before = requests.get(f"{BASE_URL}/api/rewards/my-points",
            headers={"Authorization": f"Bearer {token}"}
        ).json()
        
        # Redeem
        redeem_response = requests.post(f"{BASE_URL}/api/rewards/redeem",
            headers={"Authorization": f"Bearer {token}"},
            json={"reward_id": reward["reward_id"]}
        )
        assert redeem_response.status_code == 200, f"Redemption failed: {redeem_response.text}"
        
        data = redeem_response.json()
        assert "message" in data
        assert reward["name"] in data["message"]
        print(f"✓ Redemption successful: {data['message']}")
        
        # Verify points deducted
        points_after = requests.get(f"{BASE_URL}/api/rewards/my-points",
            headers={"Authorization": f"Bearer {token}"}
        ).json()
        
        expected_points = points_before["points"] - reward["points_cost"]
        assert points_after["points"] == expected_points, f"Points should be {expected_points}"
        # Lifetime points should NOT decrease
        assert points_after["lifetime_points"] == points_before["lifetime_points"]
        print(f"✓ Points deducted: {points_before['points']} → {points_after['points']} (-{reward['points_cost']})")
        
        # Verify transaction in history
        history = requests.get(f"{BASE_URL}/api/rewards/my-history",
            headers={"Authorization": f"Bearer {token}"}
        ).json()
        
        redeem_tx = [tx for tx in history if tx["type"] == "redeem"]
        assert len(redeem_tx) > 0, "Should have redeem transaction"
        assert redeem_tx[0]["points"] == -reward["points_cost"]
        assert reward["name"] in redeem_tx[0]["description"]
        print(f"✓ Redemption transaction logged: {redeem_tx[0]['description']}")
    
    def test_redeem_insufficient_points(self, user_with_points):
        """Test that redemption fails with insufficient points"""
        token, user_id = user_with_points
        
        # Get rewards catalog
        rewards = requests.get(f"{BASE_URL}/api/rewards").json()
        
        # Find an expensive reward (user has 50 points)
        expensive = [r for r in rewards if r["points_cost"] > 50]
        
        if len(expensive) > 0:
            reward = expensive[0]
            print(f"✓ Attempting to redeem expensive reward: {reward['name']} ({reward['points_cost']} pts)")
            
            redeem_response = requests.post(f"{BASE_URL}/api/rewards/redeem",
                headers={"Authorization": f"Bearer {token}"},
                json={"reward_id": reward["reward_id"]}
            )
            assert redeem_response.status_code == 400, "Should fail with insufficient points"
            data = redeem_response.json()
            assert "Not enough points" in data["detail"]
            print("✓ Redemption rejected: insufficient points")
        else:
            print("⚠ No expensive rewards to test insufficient points")
    
    def test_redeem_invalid_reward(self, user_with_points):
        """Test redemption with invalid reward_id"""
        token, user_id = user_with_points
        
        redeem_response = requests.post(f"{BASE_URL}/api/rewards/redeem",
            headers={"Authorization": f"Bearer {token}"},
            json={"reward_id": "invalid_reward_id_12345"}
        )
        assert redeem_response.status_code == 404, "Should fail with invalid reward"
        print("✓ Invalid reward redemption rejected")
    
    def test_redeem_requires_auth(self):
        """Test that redemption requires authentication"""
        response = requests.post(f"{BASE_URL}/api/rewards/redeem",
            json={"reward_id": "any_id"}
        )
        assert response.status_code == 401, "Should require authentication"
        print("✓ Redemption endpoint protected")
