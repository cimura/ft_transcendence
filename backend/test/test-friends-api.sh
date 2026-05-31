#!/usr/bin/env bash

set -euo pipefail

BASE_URL="https://localhost:8443/api"
PASSWORD="password123"

# generate unique email suffix
SUFFIX=$(date +%s)

ALICE_EMAIL="alice_${SUFFIX}@example.com"
BOB_EMAIL="bob_${SUFFIX}@example.com"

echo "ALICE_EMAIL=$ALICE_EMAIL"
echo "BOB_EMAIL=$BOB_EMAIL"

signup_user()
{
    email="$1"
    echo
    echo "=== Signup: $email ==="

    curl -k -i -fsS -X POST "$BASE_URL/auth/signup" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\"}"

signin_user()
{
	email="$1"

	curl -k -fsS -X POST "$BASE_URL/auth/signin" \
		-H "Content-Type: application/json" \
		-d "{\"email\":\"$email\",\"password\":\"$PASSWORD\"}" \
		| jq -er '.accessToken'
}

get_user_id_from_token()
{
	token="$1"
    payload=$(echo "$token" | cut -d '.' -f 2 | tr '_-' '/+')

    while [ $((${#payload} % 4)) -ne 0 ]; do
        payload="${payload}="
    done

	echo "$payload" | base64 -d | jq -r '.sub'
}

send_friend_request()
{
	token="$1"
	target_user_id="$2"

	echo
	echo "== Send friend request =="

	curl -k -i -X POST "$BASE_URL/friends/request" \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer $token" \
		-d "{\"userId\":\"$target_user_id\"}"
}

get_friend_requests()
{
	token="$1"

	echo
	echo "== Get friend requests =="

	curl -k -s -X GET "$BASE_URL/friends/requests" \
		-H "Authorization: Bearer $token" \
		| jq
}

get_first_request_id()
{
	token="$1"

	curl -k -s -X GET "$BASE_URL/friends/requests" \
		-H "Authorization: Bearer $token" \
		| jq -r '.[0].id'
}

accept_friend_request()
{
	token="$1"
	request_id="$2"

	echo
	echo "== Accept friend request =="

	curl -k -i -X PUT "$BASE_URL/friends/$request_id/accept" \
		-H "Authorization: Bearer $token"
}

get_friends()
{
	token="$1"
	name="$2"

	echo
	echo "== Get friends: $name =="

	curl -k -s -X GET "$BASE_URL/friends" \
		-H "Authorization: Bearer $token" \
		| jq
}

assert_contains_email()
{
	json="$1"
	email="$2"
	message="$3"

	if echo "$json" | jq -e --arg email "$email" '.[] | select(.email == $email)' >/dev/null; then
		echo "PASS: $message"
	else
		echo "FAIL: $message"
		echo "Expected email: $email"
		echo "Actual JSON:"
		echo "$json" | jq
		exit 1
	fi
}

assert_empty_array()
{
	json="$1"
	message="$2"

	if echo "$json" | jq -e 'type == "array" and length == 0' >/dev/null; then
		echo "PASS: $message"
	else
		echo "FAIL: $message"
		echo "Expected empty array: []"
		echo "Actual JSON:"
		echo "$json" | jq
		exit 1
	fi
}


delete_friend()
{
	token="$1"
	friend_user_id="$2"
	name="$3"

	echo
	echo "== Delete friend: $name =="

	curl -k -i -X DELETE "$BASE_URL/friends/$friend_user_id" \
		-H "Authorization: Bearer $token"
}

fetch_friends()
{
	token="$1"

	curl -k -s -X GET "$BASE_URL/friends" \
		-H "Authorization: Bearer $token"
}

# signup
signup_user "$ALICE_EMAIL"
signup_user "$BOB_EMAIL"

# signin
echo
echo "== Signin users =="

TOKEN_ALICE=$(signin_user "$ALICE_EMAIL")
TOKEN_BOB=$(signin_user "$BOB_EMAIL")

echo "TOKEN_ALICE=$TOKEN_ALICE"
echo "TOKEN_BOB=$TOKEN_BOB"

# extract Bob id
BOB_ID=$(get_user_id_from_token "$TOKEN_BOB")
echo "BOB_ID=$BOB_ID"

# Alice sends request to Bob
send_friend_request "$TOKEN_ALICE" "$BOB_ID"

# Bob gets request id
get_friend_requests "$TOKEN_BOB"
REQUEST_ID=$(get_first_request_id "$TOKEN_BOB")
echo "REQUEST_ID=$REQUEST_ID"

# Bob accepts
accept_friend_request "$TOKEN_BOB" "$REQUEST_ID"

# Alice GET /friends should contain Bob
# Bob GET /friends should contain Alice
echo
echo "== Get friends: Alice =="

ALICE_FRIENDS=$(fetch_friends "$TOKEN_ALICE")
echo "$ALICE_FRIENDS" | jq
assert_contains_email "$ALICE_FRIENDS" "$BOB_EMAIL" "Alice should see Bob after accept"

echo
echo "== Get friends: Bob =="

BOB_FRIENDS=$(fetch_friends "$TOKEN_BOB")
echo "$BOB_FRIENDS" | jq
assert_contains_email "$BOB_FRIENDS" "$ALICE_EMAIL" "Bob should see Alice after accept"



# Alice deletes Bob
delete_friend "$TOKEN_ALICE" "$BOB_ID" "Alice deletes Bob"

# Alice GET /friends should be empty
# Bob GET /friends should be empty
echo
echo "== Get friends: Alice after delete =="

ALICE_FRIENDS_AFTER_DELETE=$(fetch_friends "$TOKEN_ALICE")
echo "$ALICE_FRIENDS_AFTER_DELETE" | jq
assert_empty_array "$ALICE_FRIENDS_AFTER_DELETE" "Alice should have no friends after delete"

echo
echo "== Get friends: Bob after delete =="

BOB_FRIENDS_AFTER_DELETE=$(fetch_friends "$TOKEN_BOB")
echo "$BOB_FRIENDS_AFTER_DELETE" | jq
assert_empty_array "$BOB_FRIENDS_AFTER_DELETE" "Bob should have no friends after delete"

echo
echo "Friends API smoke test completed successfully."
