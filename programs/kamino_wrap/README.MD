Wraps Kamino positions for use with Mrgnlend integration.

## LIMITATIONS

- Kamino enforces a lot of transaction introspection on deposit/withdraw which expects instructions
  in a very specific order. Attempting to prepend other instructions will generally fail. See the
  test suite for examples of how to build deposit/withdraw txes.
- Mrgn accounts and Kamino accounts always have a 1:1 relationship. Kamino typically expects each
  user (i.e. wallet) to have exactly one obligation per market, whereas mrgn users often create
  several accounts per market. To reconcile this, a wrapped Kamino account is bound to a mrgn
  account by PDA derivation and the assets inside cannot be moved to another mrgn account (except,
  of course, by withdraw and deposit to the other account).
