Wraps Kamino positions for use with Mrgnlend integration.

## Terms

- Kamino Market - a collection of "Reserves"
- Kamino Reserve - similar to a "Bank" in mrgn.
- Kamino Obligation - a Kamino users' account for a given market, containing positions for various
  Reserves.

## THE KWRAP ACCOUNT

- The primary purpose of the Kwrap account is to act as a PDA which owns the user's obligation(s).
- User funds are withdrawn from their wallet-owned Kamino obligation and deposited into the
  Kwrap-account owned obligation via `fresh_deposit` to begin the process of collateralizing funds.
- There is a 1:1 relationship between Kwrap accounts and user mrgn accounts.
- The Kwrap program abstracts all handling of Kamino positions away from the mrgn program, so the
  mrgn account just sees a balance like any other asset might have.
- Once the user initiates a "borrow" (collateralizes their funds with mrgn via `register_kwrap`,
  which calls `start_borrow` by CPI), the user cannot withdraw from any balance registered in their
  kwrap account without the mrgn program's health check passing

### MARKET INFOS

- Kwrap accounts primarily hold Kamino Market Information (aka KaminoMarketInfo or info)
- A Kamino user may collataralize postions from different markets (for example USDC from the main
  Kamino pool and the Jupiter pool). Each will have its own info.
- That is, each info recorded is a UNIQUE obligation and a market which may not be unique (a user
  may collateralize multiple obligations on the same market).
- The market info tracks the user's positions on that obligation, but is not considered
  authoritative unless synced (see below).

## THE SYNC SYSTEM

- Kamino currently enforces that the obligation's owner is the only one that can deposit (via
  `token::authority = owner` check on the source ATA), which means only the kwrap PDA can deposit
  funds today (via `fresh_deposit`), but they may not always enforce this. This program's model
  assumes that deposits may occur WITHOUT ITS KNOWLEDGE.
- Kamino interest accumulation is permissionless, we cannot enforce a check when interest
  accumulates. This is another source that increases funds without this program's knowledge.
- To handle the two source of funds above, we require `accrue_interest` to run within a certain
  number of slots of any attempt to use funds (borrow, withdraw, liquidate, etc).
- `accrue_interest` records the "unsynced" balance that is different on the obligation compared to
  the kwrap account. Again, note that these funds are any interest that has accumulated or outside
  deposits that have occured since we last accrued.
- To inform the mrgn bank and the user's mrgn account of the balance change, run `sync_kwrap`. Note
  that `sync_kwrap` calls `sync_borrow` by CPI, which resets the "unsynced" balances.
- When this process is complete, the mrgn bank, mrgn user account, kwrap account, and kamino
  obligation, have all recorded the same balance for the user (minus some small tolerance, accrue
  interest may be several slots stale)

## LIMITATIONS

- Kamino enforces a lot of transaction introspection on deposit/withdraw which expects instructions
  in a very specific order. Attempting to prepend other instructions will generally fail. See the
  test suite for examples of how to build deposit/withdraw txes.
- Mrgn accounts and Kamino accounts always have a 1:1 relationship. Kamino typically expects each
  user (i.e. wallet) to have exactly one obligation per market (although they can create more),
  whereas mrgn users often create several accounts per market. To reconcile this, a wrapped Kamino
  account is bound to a mrgn account by PDA derivation and the assets inside cannot be moved to
  another mrgn account (except, of course, by withdraw and deposit to the other account).
