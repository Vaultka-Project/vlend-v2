Wraps Kamino positions for use with Mrgnlend integration.

## LIMITATIONS

- Kamino typically expects each user (i.e. wallet) to have exactly one obligation per market,
  whereas mrgn allows users to create as many accounts per market as they wish. To reconcile this, a
  wrapped Kamino account can be used with just one mrgn account. You cannot use wrapped Kamino
  positions with multiple mrgn accounts.
