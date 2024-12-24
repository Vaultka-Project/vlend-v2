We will have to verify that:

1) Any involved obligation is fresh (slot = current slot)
2) The kwrap user account is fresh for all involved obligations (all positions sync slot = current slot)
3) The kwrap user account was refreshed AFTER the obligations were (to avoid refresh_obligation
   being passed after accrue in the same TX). This will require tx introspection in sync_kwrap


Approaches to pricing, generally...
1) Get all involved obligations and reserves (somewhat expensive, uses Kamino as the authoritative source)
2) Read synced balances from the user_account only (cheap, uses our oracle)