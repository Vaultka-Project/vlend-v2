// Syncs a kwrapped account with the corresponding bank's book-booking (deposits, shares). The bank
// owner may crank this for users at a rare interval (once or twice a week), or on demand, to show a
// more accurate summary of the bank's net deposits as they change due to interest. The bank's
// books are not authoritative for this kind of asset.

// The user does not HAVE to sync with the bank after deposit, as any unsynced amounts will always
// sync during a liquidation attempt. But the user SHOULD sync with the bank after deposit to
// simplify the front end display of their account health.