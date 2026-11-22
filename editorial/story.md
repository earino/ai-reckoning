<!-- Generated from the rendered site by scripts/export-story.mjs. Do not edit by hand. -->

*THE AI RECKONING · AN INVESTIGATION IN DATA*

# The crash followed the beta, not the bill

On 20 November 2026 about $2.4tn left AI-linked stocks in a day. The popular story is that investors finally saw the cost of the build-out. We followed the money through 196 sourced deals and tested that story on 215 companies. How much each one lost tracked a number you could have measured in September — and we found no link to who was spending the most.

Research, analysis, code and text produced with an AI system and published with full methods · Data to 20 November 2026 · Published 22 November 2026 · Methodology

*PROLOGUE*

## The day the market blinked

Each mark is a listed company. 146 of them build, power, finance or sell artificial intelligence. The other 69 do not. We chose them, and wrote down what we expected to find, before we downloaded any share-price data.

On Friday 20 November 2026, the day after Anthropic's record stock-market debut, the Nasdaq Composite fell 5.28%. Keep scrolling to watch it happen.

Start on 6 October 2026. The S&P 500 closed at a record 7,818.93. We set every company's height to zero on that day.

From here, height means one thing: the percent change in the share price since that close. The companies stay in their columns. Only the height moves.

Then the floor gave way, in steps. By the close on 20 November the S&P 500 was 11.6% below its record and the Nasdaq-100 was 19.8% below, one bad morning from a bear market.

The columns did not fall together. Chip and hardware companies lost 40% on average. Clouds and data-centre operators lost 36%. The non-technology controls gained 7%.

Use the slider to move through the days, or switch from percent to dollars.

### “Trillions were repriced. But what, exactly, had investors discovered?”

On 20 November alone, the 141 AI-linked companies we can value lost about $2.4tn of market value. The 67 control companies lost about $25bn. Since the October peak the AI group is down about $10.7tn; the controls are up $739bn.

Nvidia alone accounts for $2.8tn of the loss. Its chief executive resigned on 12 November, and reports of regulatory inquiries followed.

The common explanation is that investors finally saw the bill: hundreds of billions of dollars of data-centre spending with uncertain returns. That explanation makes predictions about which companies should fall. We tested them.

Market values are approximate: closing price times the diluted share count in the latest filing before the event.

*CHAPTER I*

## Not one AI economy

“AI stocks” is a label for five different businesses that pay one another.

Stack them by where the money enters and where it lands. Capital providers sit at the top. Below them are the model developers and software companies that must turn AI into revenue. Then the clouds and data-centre operators that buy the equipment, the chip and hardware makers that sell it, and the power and construction firms underneath it all.

Shape and colour mark the layer. Companies with more documented counterparties sit nearer the centre.

The layers have opposite economics. In the twelve months of filings before the selloff, the five hyperscalers — Amazon, Alphabet, Microsoft, Meta and Oracle — spent $691bn on property and equipment. That is 95% of all the cash their operations produced.

One layer down, the money arrives as profit. The 36 chip and hardware companies reported $518bn of operating income and needed only $111bn of capital spending. Nvidia earned $198bn of operating income while spending 2.4% of revenue on capex.

Oracle spent 105% of its revenue on capex. CoreWeave spent 279%.

So here is the puzzle. If investors were reassessing the bill, the spenders should have been hit hardest, and the companies collecting the profit should have been the safest. First, follow the money.

Capex is cash paid for property and equipment. It excludes equipment obtained through finance leases, which matters for some cloud companies.

*CHAPTER II*

## Follow the money

We read filings, press releases and reporting, and recorded 196 financial relationships: who invests in whom, who lends, and who has promised to buy what.

Each line points the way the money goes. A solid line with a moving dot is money that has moved. A plain solid line is a binding contract in progress. Dashed lines are promises: announced, conditional, or estimated by the press. Thicker lines are bigger disclosed amounts; the thinnest have no disclosed amount at all.

Only 35 of the 196 relationships disclose money actually paid: $591bn in total. Binding contracts and completed deals with a disclosed size add up to $2.7tn. Conditional ceilings, the “up to” numbers in press releases, add another $818bn that we keep separate. These are different kinds of number. We never add them.

Select any mark to read its relationships and sources.

Now dim everything that does not touch two companies.

63% of the $2.7tn in firm, disclosed commitments has OpenAI or Anthropic on one side. OpenAI is the payer in 27% of the total and Anthropic in 23%. The receivers are household names: Oracle (13%), Amazon (13%), Microsoft (11%).

Neither payer traded on a stock exchange until Anthropic listed on 19 November. OpenAI still does not. The largest obligations in the AI economy sat inside companies that the market could not price directly. It could only price their suppliers.

Shares describe disclosed amounts in our dataset only. Undisclosed contracts are not in the denominator. Many of the largest figures come from news reports of filings. Using only high-confidence relationships the share is 51%; using only filings and company releases it is 76%.

In 9 pairs the money runs both ways. Nvidia invests in OpenAI, and OpenAI buys Nvidia chips. Amazon and Alphabet invest in Anthropic, and Anthropic buys their cloud capacity. AMD grants warrants to customers that commit to buy its processors.

A circle is not proof of anything improper. An investor that is also a supplier has reasons to do both. But it means one company's revenue can depend on another company's ability to raise money, sometimes from the first company. We flag these pairs and do not net or add them.

Look at the top layer. Much of the building is paid for with borrowed money, and much of that debt does not sit on the balance sheet of the company that will use the data centre.

It sits in joint ventures and special-purpose vehicles, funded by bond investors, bank syndicates and private-credit managers. In 2026 that market began to charge more: our sources record CoreWeave loan spreads rising and Oracle-linked project debt trading below face value.

That is the structure. The next question is whether the stock market punished it.

*CHAPTER III*

## The infrastructure bill

Now place each company by its own accounts.

Left to right: capital spending as a share of revenue, on a log scale. Front to back: free cash flow as a share of revenue. Height: the share-price return in the week of 16–20 November.

At first sight the bill theory works. Among the 120 AI-linked companies with usable accounts, heavier spenders did fall further: about 1.2 percentage points more for each additional 100% of revenue spent (p = 0.03).

Then remove one thing: how each stock normally moves with the market.

The slope goes flat. After beta, size, momentum, profitability and leverage, the estimated effect of capital intensity on the week's return is −0.6 points per 100% of revenue, with a 95% bootstrap range of −3.0 to 1.1 (p = 0.53). The same holds from the October peak.

We could not find the infrastructure bill in the selloff. Companies that spend the most did not fall more than their ordinary sensitivity to the market already implied. This was our second pre-registered hypothesis. It failed.

A null result from 120 companies in one event does not prove there is no effect. The range above excludes large effects; it does not exclude small ones. Dropping the ten most influential companies produces a negative slope, so the result depends on including the extreme spenders.

*CHAPTER IV*

## The market's verdict

So what did predict the losses? A number you could have computed in September.

Beta measures how much a stock tends to move when the S&P 500 moves 1%. We estimated it for every company on the 250 trading days ending 30 September, a week before the peak. Chip and cloud stocks averaged about 2.7. The non-tech controls averaged 0.1.

The view is now flat on purpose: beta left to right, the 20 November return up and down. The dashed line is not fitted. It is the textbook prediction, beta times the market's −3.6% return. The fitted slope is −3.58% per unit of beta.

That single pre-crash number explains 80% of the differences between 207 companies that day. Knowing whether a company is “an AI company” adds 0.2 points to that.

*CHAPTER IV, CONTINUED · THE EVENT-STUDY OBSERVATORY*

## Test it yourself

Our first pre-registered test asked whether primary AI companies fell more than controls after allowing for beta. On 20 November the gap was −0.9% (p = 0.63). Over the week it was +6.4%, in the AI companies' favour (p = 0.16). Neither is distinguishable from an ordinary day or week. Measured from the October peak the gap is −19.8% (p = 0.03), which does not survive our correction for running six planned tests (adjusted p = 0.16).

By the market's own yardstick, this was not a selective verdict on AI business models. It was a large market fall, delivered in proportion to sensitivities that already existed.

### But the yardstick is made of AI

There is a serious objection, and the controls below let you test it. The S&P 500 is not a neutral ruler. Its largest members are the companies in this story, and the estimation window was a year in which AI news moved the whole index. A high beta may simply be how AI exposure looked in 2026.

Switch the benchmark to a portfolio of non-AI companies and the picture changes. Against that ruler the primary AI group fell an extra 24% in the week and 44% from the peak, and the S&P 500 itself fell 8% and 15% more than the non-AI portfolio's behaviour predicted. This comparison was not in our plan; we ran it after seeing the first result, and we label it exploratory.

Both statements are true at once. The selloff was concentrated in AI, and it was almost fully described by pre-existing market sensitivity. The data cannot tell us which way the arrow runs.

### What was not explained by beta

Two things stand out. First, the layers did differ (p = 0.007, the one planned test that survives correction). From the peak, the chip and hardware portfolio fell 22% more than its beta predicted. The capital providers fell 12% less. The companies collecting AI's profits took the largest unexplained losses; the companies financing it took the smallest.

Second, Nvidia. On 20 November it fell 14.0%, which is 7.2% more than its beta implied (−3.8 standard errors). From the peak its unexplained loss is 40%, the largest in the universe. That part of the story is specific to one company: a chief executive's resignation and reported regulatory inquiries, not data-centre economics.

An abnormal return is the gap between an observed return and a statistical model's expectation. It describes; it does not show cause. One cross-section of one event cannot prove why prices moved.

*[Interactive event-study observatory: see the site.]*

*CHAPTER V*

## What breaks first?

The stock market did not single out the spenders. That does not make them safe. It may only mean the question has not been asked yet.

This tool asks it in the simplest possible way. It takes each company's reported numbers and the contracts in our dataset, and applies a shock you choose. It does not predict prices or defaults, and it does not pass losses around the network, because we cannot measure how they would spread.

Three different weak points appear. By our rules, 28 listed AI companies depend on outside financing: they spend more than their operations bring in, or carry heavy debt. 3 depend on a few customers: their disclosed contracts with model developers exceed a full year of revenue. And 18 are exposed mainly through valuation: they generate cash, but trade above ten times sales.

*[Interactive slowdown simulator: see the site.]*

*CHAPTER VI*

## What we actually learned

### The losses followed a number that existed before the crash.

Beta to the S&P 500, measured through 30 September, explains 80% of the cross-company differences in returns on 20 November, 61% over the week and 75% from the peak. An AI label adds almost nothing once beta is known.

### We did not find the infrastructure bill.

Capital spending relative to revenue does not predict abnormal losses (−0.6 points per 100% of revenue; 95% range −3.0 to 1.1). The hypothesis this project started with is not supported.

### The companies that collect the profits bore the losses.

Of roughly $10.7tn lost by AI-linked companies since 6 October, about $7.3tn came from chip and hardware makers, the layer with $518bn of operating income. Their portfolio fell 22% beyond what beta predicted. Financiers fell less than predicted.

### The AI economy's obligations run through two companies the market could barely see.

63% of $2.7tn in firm, disclosed commitments involve OpenAI or Anthropic. One listed the day before the crash. The other is private. Only $591bn across 35 relationships is disclosed as actually paid.

### “Was it AI, or was it the market?” has no clean answer, because the market is AI.

Against the S&P 500, AI stocks behaved normally. Against non-AI companies, the S&P 500 itself fell 15% more than expected from the peak. The benchmark is contaminated by the thing being measured.

### What remains unknown

- Present profitability. Listed suppliers are very profitable today. For the private model developers we have only second-hand reads of filings; we make no claim about their profitability.

- Dependence on future growth. The contracts in Chapter II are promises stretching to the 2030s. Whether they are paid depends on revenue that does not yet exist. Our scenario tool shows the size of that dependence, not its probability.

- Market pricing. We show how prices moved together. We cannot show why. Rate fears after the Federal Reserve's September increase, the midterm election result, Nvidia's leadership crisis and Anthropic's listing all landed in the same weeks.

- Coverage. The relationship data contain only what was disclosed and what we found. Financial data exclude finance leases and are approximate for foreign filers. Betas are estimates with error.

*EPILOGUE*

## Explore the system

This is the research instrument behind the story. Choose a view, filter the relationships, switch between raw and adjusted returns, and select any company to see its numbers and sources.

Drag to rotate. The page still scrolls with the wheel. Link to a selection with ?select=NVDA&view=network.

Research cutoff: 20 November 2026. Published 22 November 2026. This is a static publication; it does not update automatically. 215 companies, 196 relationships, 511 sources.

This is journalism, not investment advice. No one sponsored it. Produced with an AI system; see About.
