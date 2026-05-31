# Friends API

## Auth
All endpoints require JWT:
Authorization: Bearer <accessToken>

## Endpoints

GET /api/friends
Return accepted friends of current user.

POST /api/friends/request
Send friend request.
Body:
{
  "userId": "target-user-id"
}

GET /api/friends/requests
Return pending received friend requests.

PUT /api/friends/:requestId/accept
Accept received request.

PUT /api/friends/:requestId/reject
Reject received request.

DELETE /api/friends/:userId
Remove accepted friend by friend user id.

## Smoke test

Run:
./backend/test/test-friends-api.sh

This tests:
signup -> signin -> request -> accept -> list -> delete -> list empty
