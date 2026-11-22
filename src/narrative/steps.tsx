/** Chapter and step definitions: the analytical state of the shared scene, and the prose that goes with it. */
import type { ReactNode } from "react";
import type { DataBundle, ModelKey, WindowKey } from "../data/types";
import type { ViewKey } from "../scenes/layouts";
import { CAMERA } from "../scenes/layouts";
import { dateLong, mag, num, pct, pctPlain, pValue, usd } from "../data/format";

export type ControlSet = "none" | "repricing" | "network" | "landscape" | "verdict" | "explorer";
export interface Step {
  id: string; chapter: string; view: ViewKey; camera: keyof typeof CAMERA; labels?: string[]; focus?: "hubs" | "reciprocal" | "credit" | "chips" | null;
  colorMode?: "role" | "return"; date?: "peak" | "last"; play?: boolean; window?: WindowKey; model?: ModelKey; controls: ControlSet; interactive?: boolean;
  hud: { title: string; kind: "observed" | "modeled" | "documented"; size: string };
  body: (d: DataBundle) => ReactNode;
}
export interface Chapter { id: string; kicker: string; title: string; steps: Step[] }

const SIZE_MCAP = "Mark size: market value on 6 October (approximate)";
const SIZE_NET = "Mark size: market value on 6 October; fixed size for unlisted entities";

export function chapters(d: DataBundle): Chapter[] {
  const n = d.n; const ix = n.indices; const mv = n.mv; const g = n.graph; const fin = n.fin;
  return [
    {
      id: "prologue", kicker: "Prologue", title: "The day the market blinked",
      steps: [
        { id: "field", chapter: "prologue", view: "field", camera: "field", controls: "none", hud: { title: `${n.n_companies} listed companies, grouped by economic role`, kind: "documented", size: SIZE_MCAP },
          body: () => (<>
            <p className="lede">Each mark is a listed company. {n.n_ai + n.n_limited} of them build, power, finance or sell artificial intelligence. The other {n.n_controls} do not. We chose them, and wrote down what we expected to find, before we downloaded any share-price data.</p>
            <p>On Friday {dateLong(d.meta.research_cutoff)}, the day after Anthropic's record stock-market debut, the Nasdaq Composite fell {mag(ix["^IXIC"].day_pct / 100, 2)}. Keep scrolling to watch it happen.</p>
          </>) },
        { id: "peak", chapter: "prologue", view: "repricing", camera: "repricingWide", date: "peak", controls: "repricing", hud: { title: "Share prices on 6 October 2026, the S&P 500's record close", kind: "observed", size: SIZE_MCAP },
          body: () => (<>
            <p>Start on {dateLong(n.peak_date)}. The S&P 500 closed at a record {ix["^GSPC"].record_close.toLocaleString("en-US")}. We set every company's height to zero on that day.</p>
            <p>From here, height means one thing: the percent change in the share price since that close. The companies stay in their columns. Only the height moves.</p>
          </>) },
        { id: "fall", chapter: "prologue", view: "repricing", camera: "repricingWide", date: "last", play: true, controls: "repricing", hud: { title: "Percent change in share price since 6 October", kind: "observed", size: SIZE_MCAP },
          body: () => (<>
            <p>Then the floor gave way, in steps. By the close on 20 November the S&P 500 was {mag(ix["^GSPC"].from_record_pct / 100, 1)} below its record and the Nasdaq-100 was {mag(ix["^NDX"].from_record_pct / 100, 1)} below, one bad morning from a bear market.</p>
            <p>The columns did not fall together. Chip and hardware companies lost {mag(n.group_means.compute.raw_peak.mean)} on average. Clouds and data-centre operators lost {mag(n.group_means.infrastructure.raw_peak.mean)}. The non-technology controls <em>gained</em> {mag(n.group_means.control_other.raw_peak.mean)}.</p>
            <p className="aside">Use the slider to move through the days, or switch from percent to dollars.</p>
          </>) },
        { id: "question", chapter: "prologue", view: "repricing", camera: "repricingChips", date: "last", colorMode: "return", labels: ["NVDA", "TSM", "MU", "AVGO", "AMD"], controls: "repricing",
          hud: { title: "Percent change in share price since 6 October", kind: "observed", size: SIZE_MCAP },
          body: () => (<>
            <h3 className="pull">“Trillions were repriced. But what, exactly, had investors discovered?”</h3>
            <p>On 20 November alone, the {mv.n_ai} AI-linked companies we can value lost about <b>{usd(-mv.ai_day)}</b> of market value. The {mv.n_ctrl} control companies lost about {usd(-mv.ctrl_day, 0)}. Since the October peak the AI group is down about {usd(-mv.ai_peak)}; the controls are up {usd(mv.ctrl_peak)}.</p>
            <p>Nvidia alone accounts for {usd(-mv.nvda_peak)} of the loss. Its chief executive resigned on 12 November, and reports of regulatory inquiries followed.</p>
            <p>The common explanation is that investors finally saw the bill: hundreds of billions of dollars of data-centre spending with uncertain returns. That explanation makes predictions about <em>which</em> companies should fall. We tested them.</p>
            <p className="small">Market values are approximate: closing price times the diluted share count in the latest filing before the event.</p>
          </>) },
      ],
    },
    {
      id: "chapter-1", kicker: "Chapter I", title: "Not one AI economy",
      steps: [
        { id: "layers", chapter: "chapter-1", view: "layers", camera: "layers", controls: "none", hud: { title: "The same companies, stacked by their place in the money chain", kind: "documented", size: SIZE_MCAP },
          body: () => (<>
            <p className="lede">“AI stocks” is a label for five different businesses that pay one another.</p>
            <p>Stack them by where the money enters and where it lands. Capital providers sit at the top. Below them are the model developers and software companies that must turn AI into revenue. Then the clouds and data-centre operators that buy the equipment, the chip and hardware makers that sell it, and the power and construction firms underneath it all.</p>
            <p>Shape and colour mark the layer. Companies with more documented counterparties sit nearer the centre.</p>
          </>) },
        { id: "earn-spend", chapter: "chapter-1", view: "layers", camera: "layers", labels: ["NVDA", "MSFT", "ORCL", "CRWV", "AMZN", "GOOGL", "META"], controls: "none",
          hud: { title: "The same companies, stacked by their place in the money chain", kind: "documented", size: SIZE_MCAP },
          body: () => (<>
            <p>The layers have opposite economics. In the twelve months of filings before the selloff, the five hyperscalers — Amazon, Alphabet, Microsoft, Meta and Oracle — spent <b>{usd(fin.hyperscaler_capex, 0)}</b> on property and equipment. That is {pctPlain(fin.hyperscaler_capex / fin.hyperscaler_ocf)} of all the cash their operations produced.</p>
            <p>One layer down, the money arrives as profit. The {fin.by_role.compute.n} chip and hardware companies reported {usd(fin.by_role.compute.operating_income, 0)} of operating income and needed only {usd(fin.by_role.compute.capex, 0)} of capital spending. Nvidia earned {usd(fin.nvda_operating_income, 0)} of operating income while spending {pct(fin.nvda_capex_to_revenue, 1, false)} of revenue on capex.</p>
            <p>Oracle spent {pctPlain(fin.orcl_capex_to_revenue)} of its revenue on capex. CoreWeave spent {pctPlain(fin.crwv_capex_to_revenue)}.</p>
            <p>So here is the puzzle. If investors were reassessing the bill, the spenders should have been hit hardest, and the companies collecting the profit should have been the safest. First, follow the money.</p>
            <p className="small">Capex is cash paid for property and equipment. It excludes equipment obtained through finance leases, which matters for some cloud companies.</p>
          </>) },
      ],
    },
    {
      id: "chapter-2", kicker: "Chapter II", title: "Follow the money",
      steps: [
        { id: "network", chapter: "chapter-2", view: "network", camera: "network", controls: "network", interactive: true, labels: ["priv:openai", "ANT", "NVDA", "MSFT", "ORCL", "CRWV", "SFTBY"],
          hud: { title: `${g.n_edges} documented relationships between ${g.n_nodes} entities`, kind: "documented", size: SIZE_NET },
          body: () => (<>
            <p className="lede">We read filings, press releases and reporting, and recorded {g.n_edges} financial relationships: who invests in whom, who lends, and who has promised to buy what.</p>
            <p>Each line points the way the money goes. A solid line with a moving dot is money that has moved. A plain solid line is a binding contract in progress. Dashed lines are promises: announced, conditional, or estimated by the press. Thicker lines are bigger disclosed amounts; the thinnest have no disclosed amount at all.</p>
            <p>Only {g.edges_with_realized} of the {g.n_edges} relationships disclose money actually paid: {usd(g.realized_total, 0)} in total. Binding contracts and completed deals with a disclosed size add up to {usd(g.firm_total)}. Conditional ceilings, the “up to” numbers in press releases, add another {usd(g.totals.conditional.ceiling, 0)} that we keep separate. These are different kinds of number. We never add them.</p>
            <p className="aside">Select any mark to read its relationships and sources.</p>
          </>) },
        { id: "hubs", chapter: "chapter-2", view: "network", camera: "networkTop", focus: "hubs", controls: "network", interactive: true, labels: ["priv:openai", "ANT", "ORCL", "MSFT", "AMZN", "GOOGL", "AVGO", "SPCX", "NVDA"],
          hud: { title: "Relationships of OpenAI and Anthropic", kind: "documented", size: SIZE_NET },
          body: () => (<>
            <p>Now dim everything that does not touch two companies.</p>
            <p><b>{pctPlain(g.share_top2)}</b> of the {usd(g.firm_total)} in firm, disclosed commitments has OpenAI or Anthropic on one side. OpenAI is the payer in {pctPlain(g.payer_shares[0].share)} of the total and Anthropic in {pctPlain(g.payer_shares[1].share)}. The receivers are household names: Oracle ({pctPlain(g.recipient_shares[0].share)}), Amazon ({pctPlain(g.recipient_shares[1].share)}), Microsoft ({pctPlain(g.recipient_shares[2].share)}).</p>
            <p>Neither payer traded on a stock exchange until Anthropic listed on 19 November. OpenAI still does not. The largest obligations in the AI economy sat inside companies that the market could not price directly. It could only price their suppliers.</p>
            <p className="small">Shares describe disclosed amounts in our dataset only. Undisclosed contracts are not in the denominator. Many of the largest figures come from news reports of filings. Using only high-confidence relationships the share is {pctPlain(n.graph_sensitivity.high_confidence_only.share_top2)}; using only filings and company releases it is {pctPlain(n.graph_sensitivity.primary_sources_only.share_top2)}.</p>
          </>) },
        { id: "circular", chapter: "chapter-2", view: "network", camera: "network", focus: "reciprocal", controls: "network", interactive: true, labels: ["NVDA", "priv:openai", "ANT", "AMD", "AMZN", "GOOGL", "MSFT", "META"],
          hud: { title: "Pairs where money flows in both directions", kind: "documented", size: SIZE_NET },
          body: () => (<>
            <p>In {g.n_reciprocal_pairs} pairs the money runs both ways. Nvidia invests in OpenAI, and OpenAI buys Nvidia chips. Amazon and Alphabet invest in Anthropic, and Anthropic buys their cloud capacity. AMD grants warrants to customers that commit to buy its processors.</p>
            <p>A circle is not proof of anything improper. An investor that is also a supplier has reasons to do both. But it means one company's revenue can depend on another company's ability to raise money, sometimes from the first company. We flag these pairs and do not net or add them.</p>
          </>) },
        { id: "credit", chapter: "chapter-2", view: "network", camera: "networkCredit", focus: "credit", controls: "network", interactive: true, labels: ["pool:bonds", "pool:banks", "OWL", "veh:hyperion", "veh:jupiter", "ORCL", "META", "CRWV", "APO"],
          hud: { title: "Debt financing and the vehicles that carry it", kind: "documented", size: SIZE_NET },
          body: () => (<>
            <p>Look at the top layer. Much of the building is paid for with borrowed money, and much of that debt does not sit on the balance sheet of the company that will use the data centre.</p>
            <p>It sits in joint ventures and special-purpose vehicles, funded by bond investors, bank syndicates and private-credit managers. In 2026 that market began to charge more: our sources record CoreWeave loan spreads rising and Oracle-linked project debt trading below face value.</p>
            <p>That is the structure. The next question is whether the stock market punished it.</p>
          </>) },
      ],
    },
    {
      id: "chapter-3", kicker: "Chapter III", title: "The infrastructure bill",
      steps: [
        { id: "landscape", chapter: "chapter-3", view: "landscape", camera: "landscape", window: "week", model: "raw", colorMode: "return", controls: "landscape", labels: ["ORCL", "CRWV", "NVDA", "MSFT", "META", "IREN"],
          hud: { title: "Capital intensity, cash generation and the week's return", kind: "observed", size: SIZE_MCAP },
          body: () => (<>
            <p className="lede">Now place each company by its own accounts.</p>
            <p>Left to right: capital spending as a share of revenue, on a log scale. Front to back: free cash flow as a share of revenue. Height: the share-price return in the week of 16–20 November.</p>
            <p>At first sight the bill theory works. Among the {n.h2.n} AI-linked companies with usable accounts, heavier spenders did fall further: about {num(-n.h2.raw_week_bivariate.b * 100, 1)} percentage points more for each additional 100% of revenue spent ({pValue(n.h2.raw_week_bivariate.p)}).</p>
          </>) },
        { id: "landscape-adjusted", chapter: "chapter-3", view: "landscape", camera: "landscapeFront", window: "week", model: "m2_market_model", colorMode: "return", controls: "landscape", labels: ["ORCL", "CRWV", "NVDA", "MSFT", "META", "IREN"],
          hud: { title: "The same view after removing what each stock's beta predicts", kind: "modeled", size: SIZE_MCAP },
          body: () => (<>
            <p>Then remove one thing: how each stock normally moves with the market.</p>
            <p>The slope goes flat. After beta, size, momentum, profitability and leverage, the estimated effect of capital intensity on the week's return is {num(n.h2.week.b * 100, 1)} points per 100% of revenue, with a 95% bootstrap range of {num(n.h2.week_boot[0] * 100, 1)} to {num(n.h2.week_boot[1] * 100, 1)} ({pValue(n.h2.week.p)}). The same holds from the October peak.</p>
            <p><b>We could not find the infrastructure bill in the selloff.</b> Companies that spend the most did not fall more than their ordinary sensitivity to the market already implied. This was our second pre-registered hypothesis. It failed.</p>
            <p className="small">A null result from {n.h2.n} companies in one event does not prove there is no effect. The range above excludes large effects; it does not exclude small ones. Dropping the ten most influential companies produces a negative slope, so the result depends on including the extreme spenders.</p>
          </>) },
      ],
    },
    {
      id: "chapter-4", kicker: "Chapter IV", title: "The market's verdict",
      steps: [
        { id: "verdict", chapter: "chapter-4", view: "verdict", camera: "verdict", window: "day", model: "raw", controls: "verdict", labels: ["NVDA", "CRWV", "IREN", "MU", "MSFT", "AAPL", "WMT", "ORCL"],
          hud: { title: "Beta before the selloff against the return on 20 November", kind: "observed", size: SIZE_MCAP },
          body: () => (<>
            <p className="lede">So what did predict the losses? A number you could have computed in September.</p>
            <p>Beta measures how much a stock tends to move when the S&P 500 moves 1%. We estimated it for every company on the 250 trading days ending 30 September, a week before the peak. Chip and cloud stocks averaged about {num(n.group_means.compute.beta.mean, 1)}. The non-tech controls averaged {num(n.group_means.control_other.beta.mean, 1)}.</p>
            <p>The view is now flat on purpose: beta left to right, the 20 November return up and down. The dashed line is not fitted. It is the textbook prediction, beta times the market's {pct(n.vd.day.market, 1)} return. The fitted slope is {pct(n.vd.day.slope, 2)} per unit of beta.</p>
            <p>That single pre-crash number explains <b>{pctPlain(n.vd.day.beta_only_r2)}</b> of the differences between {n.vd.day.n} companies that day. Knowing whether a company is “an AI company” adds {num((n.vd.day.beta_plus_ai_r2 - n.vd.day.beta_only_r2) * 100, 1)} points to that.</p>
          </>) },
      ],
    },
  ];
}

/** Prose for the solid (non-3D) sections. */
export function VerdictProse({ d }: { d: DataBundle }) {
  const n = d.n;
  return (<>
    <p>Our first pre-registered test asked whether primary AI companies fell more than controls after allowing for beta. On 20 November the gap was {pct(n.h1.day.car)} ({pValue(n.h1.day.p_empirical)}). Over the week it was {pct(n.h1.week.car)}, in the AI companies' favour ({pValue(n.h1.week.p_empirical)}). Neither is distinguishable from an ordinary day or week. Measured from the October peak the gap is {pct(n.h1.peak.car)} ({pValue(n.h1.peak.p_empirical)}), which does not survive our correction for running six planned tests (adjusted {pValue(n.family.holm_p.H1_peak)}).</p>
    <p><b>By the market's own yardstick, this was not a selective verdict on AI business models. It was a large market fall, delivered in proportion to sensitivities that already existed.</b></p>
    <h3>But the yardstick is made of AI</h3>
    <p>There is a serious objection, and the controls below let you test it. The S&P 500 is not a neutral ruler. Its largest members are the companies in this story, and the estimation window was a year in which AI news moved the whole index. A high beta may simply be how AI exposure looked in 2026.</p>
    <p>Switch the benchmark to a portfolio of non-AI companies and the picture changes. Against that ruler the primary AI group fell an extra {mag(n.h1_alt.week.primary_vs_nonai.car)} in the week and {mag(n.h1_alt.peak.primary_vs_nonai.car)} from the peak, and the S&P 500 itself fell {mag(n.h1_alt.week.spy_vs_nonai.car)} and {mag(n.h1_alt.peak.spy_vs_nonai.car)} more than the non-AI portfolio's behaviour predicted. This comparison was not in our plan; we ran it after seeing the first result, and we label it exploratory.</p>
    <p>Both statements are true at once. The selloff was concentrated in AI, and it was almost fully described by pre-existing market sensitivity. The data cannot tell us which way the arrow runs.</p>
    <h3>What was not explained by beta</h3>
    <p>Two things stand out. First, the layers did differ ({pValue(n.h3.week.p_permutation)}, the one planned test that survives correction). From the peak, the chip and hardware portfolio fell {mag(n.role_car.compute.peak.car)} more than its beta predicted. The capital providers fell {mag(n.role_car.capital.peak.car)} <em>less</em>. The companies collecting AI's profits took the largest unexplained losses; the companies financing it took the smallest.</p>
    <p>Second, Nvidia. On 20 November it fell {mag(n.nvda.raw_day, 1)}, which is {mag(n.nvda.ar_m2_day, 1)} more than its beta implied ({num(n.nvda.z_day, 1)} standard errors). From the peak its unexplained loss is {mag(n.nvda.ar_m2_peak)}, the largest in the universe. That part of the story is specific to one company: a chief executive's resignation and reported regulatory inquiries, not data-centre economics.</p>
    <p className="small">An abnormal return is the gap between an observed return and a statistical model's expectation. It describes; it does not show cause. One cross-section of one event cannot prove why prices moved.</p>
  </>);
}

export function SlowdownProse({ d }: { d: DataBundle }) {
  const n = d.n; const fl = n.scenario_flags;
  return (<>
    <p className="lede">The stock market did not single out the spenders. That does not make them safe. It may only mean the question has not been asked yet.</p>
    <p>This tool asks it in the simplest possible way. It takes each company's reported numbers and the contracts in our dataset, and applies a shock you choose. It does not predict prices or defaults, and it does not pass losses around the network, because we cannot measure how they would spread.</p>
    <p>Three different weak points appear. By our rules, {fl.financing} listed AI companies depend on outside <b>financing</b>: they spend more than their operations bring in, or carry heavy debt. {fl.demand_concentration} depend on <b>a few customers</b>: their disclosed contracts with model developers exceed a full year of revenue. And {fl.valuation} are exposed mainly through <b>valuation</b>: they generate cash, but trade above ten times sales.</p>
  </>);
}

export function Findings({ d }: { d: DataBundle }) {
  const n = d.n; const g = n.graph; const mv = n.mv;
  return (<>
    <ol className="findings">
      <li><h3>The losses followed a number that existed before the crash.</h3>
        <p>Beta to the S&P 500, measured through 30 September, explains {pctPlain(n.vd.day.beta_only_r2)} of the cross-company differences in returns on 20 November, {pctPlain(n.vd.week.beta_only_r2)} over the week and {pctPlain(n.vd.peak.beta_only_r2)} from the peak. An AI label adds almost nothing once beta is known.</p></li>
      <li><h3>We did not find the infrastructure bill.</h3>
        <p>Capital spending relative to revenue does not predict abnormal losses ({num(n.h2.week.b * 100, 1)} points per 100% of revenue; 95% range {num(n.h2.week_boot[0] * 100, 1)} to {num(n.h2.week_boot[1] * 100, 1)}). The hypothesis this project started with is not supported.</p></li>
      <li><h3>The companies that collect the profits bore the losses.</h3>
        <p>Of roughly {usd(-mv.ai_peak)} lost by AI-linked companies since 6 October, about {usd(-mv.compute_peak)} came from chip and hardware makers, the layer with {usd(n.fin.by_role.compute.operating_income, 0)} of operating income. Their portfolio fell {mag(n.role_car.compute.peak.car)} beyond what beta predicted. Financiers fell less than predicted.</p></li>
      <li><h3>The AI economy's obligations run through two companies the market could barely see.</h3>
        <p>{pctPlain(g.share_top2)} of {usd(g.firm_total)} in firm, disclosed commitments involve OpenAI or Anthropic. One listed the day before the crash. The other is private. Only {usd(g.realized_total, 0)} across {g.edges_with_realized} relationships is disclosed as actually paid.</p></li>
      <li><h3>“Was it AI, or was it the market?” has no clean answer, because the market is AI.</h3>
        <p>Against the S&P 500, AI stocks behaved normally. Against non-AI companies, the S&P 500 itself fell {mag(n.h1_alt.peak.spy_vs_nonai.car)} more than expected from the peak. The benchmark is contaminated by the thing being measured.</p></li>
    </ol>
    <h3>What remains unknown</h3>
    <ul className="unknowns">
      <li><b>Present profitability.</b> Listed suppliers are very profitable today. For the private model developers we have only second-hand reads of filings; we make no claim about their profitability.</li>
      <li><b>Dependence on future growth.</b> The contracts in Chapter II are promises stretching to the 2030s. Whether they are paid depends on revenue that does not yet exist. Our scenario tool shows the size of that dependence, not its probability.</li>
      <li><b>Market pricing.</b> We show how prices moved together. We cannot show why. Rate fears after the Federal Reserve's September increase, the midterm election result, Nvidia's leadership crisis and Anthropic's listing all landed in the same weeks.</li>
      <li><b>Coverage.</b> The relationship data contain only what was disclosed and what we found. Financial data exclude finance leases and are approximate for foreign filers. Betas are estimates with error.</li>
    </ul>
  </>);
}
