
# YAMA TOKEN WALLET TESTS v1.0

## Test 01 - Initial Credits
Expected:
New account receives 1,000 Credits once.

## Test 02 - Wallet Balance
Expected:
Wallet displays the database balance.

## Test 03 - AI Chat
Initial balance: 1,000
Cost: 10
Expected balance: 990

## Test 04 - AI Image
Initial balance: 1,000
Cost: 100
Expected balance: 900

## Test 05 - Insufficient Credits
Initial balance: 5
Requested cost: 10
Expected:
Transaction rejected.
Balance remains 5.

## Test 06 - Duplicate Request
Send the same request ID twice.
Expected:
Only one charge is applied.

## Test 07 - Negative Balance
Attempt to spend more Credits than available.
Expected:
Rejected.

## Test 08 - User Isolation
User A must not read User B's wallet.

## Test 09 - Unauthorized Modification
Users cannot directly modify wallet balances.

## Test 10 - Refund
Authorized refund must restore the correct amount.
Every refund must be recorded.

## Release Criteria
All security and accounting tests must pass
before real customer payments are enabled.
