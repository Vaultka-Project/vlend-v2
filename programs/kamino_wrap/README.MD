Wraps Kamino positions for use with Mrgnlend integration.

## LIMITATIONS

- Kamino typically expects each user (i.e. wallet) to have exactly one obligation per market,
  whereas mrgn allows users to create as many accounts per market as they wish. To reconcile this, a
  wrapped Kamino account is bound to a mrgn account by PDA derivation and the assets inside cannot
  be moved to another mrgn account (except, of course, by withdraw and deposit to the other account)
