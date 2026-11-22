# Part A notes: model developers, hyperscalers, chip suppliers

Compiled 2026-11-22. 96 edges in `relationships_part_a.json`.

## Source limits

- The IPO prospectuses could not be fetched from EDGAR (only the Nvidia 10-Q was read directly). The Anthropic S-1, SpaceX S-1, Nscale S-1 and Cerebras S-1 figures come from news reports of the filings (`source_type: news`), not from the filings.
- Five disclosure dates are recalled, not sourced. Each is flagged in `notes` (a-034, a-056, a-058, a-071, a-081).

## Ambiguities

- **Double counting, Anthropic.** The S-1 commitments (a-028, a-030, a-031, a-035, a-036, a-042, a-043; $637B in total) probably contain earlier announcements (a-032, a-034, the $30B Azure figure). Do not add them. Series H (a-041) includes $15B of hyperscaler money that is also in a-027 and a-029.
- **Double counting, OpenAI.** The $100B Nvidia LOI (a-012) was replaced by the $30B investment (a-011).
- **Anthropic and SpaceX.** The SpaceX filing gives $1.25B a month (about $45B). The Anthropic S-1 gives up to $120.5B. Both are cancellable on 90 days' notice.
- **Firm or not.** Sources disagree on whether the Broadcom commitment is non-cancellable. Meta-Nebius has $12B firm and $15B backstop. The Nscale-Anthropic deal depends on Nscale financing.
- **Media estimates** (`status: estimated`): Oracle-Nvidia $40B, Microsoft revenue-share cap $38B, Stargate equity $19B each, Meta-Google $10B, Apple-Google $1B a year, Meta-Oracle $20B (talks only).
- **Unnamed customers.** TSMC and SK hynix do not name customers; the Nvidia and Apple identifications are from press. Nvidia reported unnamed direct customers at 16%, 15% and 13% of first-half fiscal 2027 revenue; they are not edges.

## Cancelled, reduced or changed in 2026

- Nvidia-OpenAI: the $100B LOI was never signed. Huang said in February 2026 that it was "never a commitment".
- Microsoft-OpenAI (April 2026): Azure exclusivity ended, Microsoft stopped paying revenue share, OpenAI payments were capped.
- Oracle-OpenAI: a 600 MW Abilene expansion was reported dropped in March 2026. Oracle disputes wider delays.
- Microsoft and neoclouds (November 2026, Bloomberg): tighter oversight of Nebius, IREN and Nscale; a roughly $3B Nscale UK deal reported cancelled; a 1.35 GW West Virginia LOI reported dropped.
- No 2026 confirmation was found for the AMD-OpenAI first tranche, Broadcom-OpenAI progress, or the Samsung and SK hynix LOIs.

## Circular financing in the reporting

- **Supplier funds customer.** Nvidia invests in OpenAI, Anthropic, xAI, CoreWeave, Nebius, Nscale and IREN, which buy or rent Nvidia GPUs.
- **Supplier backstops demand.** Nvidia guarantees up to $105B of leases for an OpenAI-linked campus (a-025), buys unsold CoreWeave capacity (a-071).
- **Equity for purchases.** AMD gave warrants to OpenAI and Meta (a-016, a-061).
- **Investor is also the vendor.** Amazon, Google and Microsoft invest in Anthropic, which commits $110B, $114.5B and $44.9B to them. Amazon invests in OpenAI, which commits $138B to AWS.
- **Paper gains.** Amazon carries its $18B Anthropic investment at about $238.7B. Alphabet booked about $98B of equity gains in Q2 2026.
