// Landing (docs/FRONTEND.md §3.1): the printed annual. Copy from prd.md §1, §4, §5, §12.3, §15.
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DEPLOYED, RECORDED, TESTED, addrLink, txLink, shortHex } from "@/lib/evidence";
import { PreviewLine } from "@/components/PreviewLine";
import { SiteActions, HeroPictures, LiveStop, SpineDeck, Rise, CloseAction } from "./LandingClient";
import s from "./landing.module.css";

const LIMITS = [
  {
    title: "No hosted keeper",
    body: "Sooth sells only when someone calls trigger. Nobody watches the price for you in this build.",
    kind: "Known limit",
  },
  {
    title: "Gap risk is yours",
    body: "If the price falls far below your stop before a trigger, it sells at that lower signed price.",
    kind: "Known limit",
  },
  {
    title: "A testnet venue",
    body: "The buyer is a backstop that pays a test dollar with no market, not real liquidity.",
    kind: "Testnet stand-in",
  },
  {
    title: "Oracle trust, stated",
    body: "The price is the median of five exchanges, signed by keys the Sooth operator holds: 3 of 5, at most 60 seconds old. Not an independent oracle.",
    kind: "Trust assumption",
  },
  {
    title: "No promise it cannot keep",
    body: "Sooth does not claim to prevent losses, or to sell at exactly the stop price.",
    kind: "Not claimed",
  },
];

const CREDITS = [
  ["Shiba inu taiki", "Roberto Vasarri", "public domain", "https://commons.wikimedia.org/wiki/File:Shiba_inu_taiki.jpg", "https://creativecommons.org/publicdomain/mark/1.0/"],
  ["Cream shiba inu dllu", "Dllu", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Cream_shiba_inu_dllu.jpg", "https://creativecommons.org/licenses/by-sa/4.0"],
  ["A Shiba Inu at Itaim Bibi, Sao Paulo", "Slyronit", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:A_Shiba_Inu_at_Itaim_Bibi,_Sao_Paulo.jpg", "https://creativecommons.org/licenses/by-sa/4.0"],
  ["Dogecoin gold coin black background 1", "Cyril Ernst", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Dogecoin_gold_coin_black_background_1_-_tails.jpg", "https://creativecommons.org/licenses/by-sa/4.0"],
  ["Dogecoin gold coin on wood 2", "Cyril Ernst", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Dogecoin_gold_coin_on_wood_2_-_tails.jpg", "https://creativecommons.org/licenses/by-sa/4.0"],
  ["Shiba hond die wil wandelen (video)", "noritama1954", "CC BY 3.0", "https://commons.wikimedia.org/wiki/File:Shiba_hond_die_wil_wandelen,_-Oct,_2012_a.ogv", "https://creativecommons.org/licenses/by/3.0"],
];

export default function Landing() {
  return (
    <div className={s.page}>
      <Rise />
      <PreviewLine tone="page" />

      <main>
      {/* Hero: view with two cards in the corner */}
      <section className={s.hero} aria-labelledby="hero-title">
        <HeroPictures />
        <div className={s.scrim} aria-hidden="true" />
        <header className={s.bar}>
          <Link href="/" className={s.wordmark}>
            Sooth
          </Link>
          <SiteActions />
        </header>
        <div className={s.heroText}>
          <h1 id="hero-title" className={s.heroTitle}>
            A DOGE stop-loss <br />
            in your own wallet
          </h1>
          <p className={s.heroLine}>
            Sooth sells your native DOGE only when the signed DOGE/USD price falls to your stop, and always leaves DOGE
            for gas.
          </p>
        </div>
        <p className={s.pin}>
          <span className={s.pinDot} aria-hidden="true" />
          100 DOGE, still in your wallet
        </p>
        <nav className={s.cards} aria-label="Next steps">
          <Link href="/verify" className={s.card}>
            <img src="/media/coin-wood-tails.jpg" alt="A physical Dogecoin coin on a wooden table" width={420} height={280} />
            <span className={s.cardBar}>
              Both outcomes <ArrowUpRight size={18} strokeWidth={1.75} aria-hidden="true" />
            </span>
          </Link>
          <a href={addrLink(DEPLOYED.Sooth)} className={s.card} target="_blank" rel="noreferrer">
            <img src="/media/shiba-sao-paulo.jpg" alt="A white Shiba Inu resting on a pavement" width={420} height={280} />
            <span className={s.cardBar}>
              The contract <ArrowUpRight size={18} strokeWidth={1.75} aria-hidden="true" />
            </span>
          </a>
        </nav>
      </section>

      {/* Intro: lead line over four columns, then the mosaic */}
      <section className={s.intro} aria-labelledby="intro-title">
        <h2 id="intro-title" className="visually-hidden">
          What Sooth is
        </h2>
        <p className={s.lead} data-rise>
          MyDoge and other self-custody wallets have no stop-loss, so a holder who wants one has to hand coins to an
          exchange. Sooth adds one without moving a coin until the moment it sells.
        </p>
        <div className={s.fourCols}>
          <p data-rise style={{ ["--i" as string]: 0 }}>
            <b>Kept in your wallet.</b> You approve an exact amount, never an unlimited one. Sooth holds nothing before a
            trigger: on Chikyū, the contract and the venue held 0 of the test holder&rsquo;s DOGE while the stop was armed.
          </p>
          <p data-rise style={{ ["--i" as string]: 1 }}>
            <b>Sold at a signed price.</b> The contract reads DOGE/USD in the same call: the median of five exchanges, each signed by its own key. It needs 3 of 5
            signers, a price no more than 60 seconds old, and a price at or below your stop. Nobody sending the transaction
            can choose it.
          </p>
          <p data-rise style={{ ["--i" as string]: 2 }}>
            <b>Gas left behind.</b> Approving your gas token is a trap: sell all of it and you can no longer pay to revoke.
            Every stop keeps a floor of at least 1 DOGE that the contract will not sell.
          </p>
          <p data-rise style={{ ["--i" as string]: 3 }}>
            <b>Fired by anyone.</b> There is no hosted keeper. Anyone can call trigger when the price reaches your stop,
            and earns 0.5% of the proceeds for paying the gas.
          </p>
        </div>
      </section>

      <div className={s.mosaic} aria-label="Pictures of DOGE's world">
        <img src="/media/shiba-taiki.jpg" alt="Taiki, a Shiba Inu, looking into the camera" width={960} height={1132} loading="lazy" data-rise />
        <div className={s.mosaicField} data-rise style={{ ["--i" as string]: 1 }}>
          <p className={s.mosaicFigure}>2 DOGE</p>
          <p className={s.mosaicCaption}>kept for gas on every stop, so you can still revoke</p>
        </div>
        <img src="/media/coin-wood-tails.jpg" alt="A silver Dogecoin coin lying on wood" width={960} height={709} loading="lazy" data-rise style={{ ["--i" as string]: 2 }} />
        <video
          className={s.mosaicVideo}
          src="/media/shiba-ron.webm"
          poster="/media/shiba-ron-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-label="Ron, an eleven-year-old Shiba Inu, walking through a room at home"
          data-rise
          style={{ ["--i" as string]: 3 }}
        />
      </div>

      {/* How it works: call and response */}
      <section className={s.how} aria-labelledby="how-title">
        <div className={s.howSide}>
          <h2 id="how-title" className={s.head} data-rise>
            Three calls, no deposit
          </h2>
          <p className={s.howNote} data-rise style={{ ["--i" as string]: 1 }}>
            Two of them come from you. The third can come from anyone, and it only sells if the signed price says so.
          </p>
          <img
            src="/media/shiba-cream.jpg"
            alt="A cream Shiba Inu standing on a lawn"
            width={960}
            height={720}
            loading="lazy"
            data-rise
            style={{ ["--i" as string]: 2 }}
          />
        </div>
        <div className={s.axisCol}>

          <div className={s.exchange}>
            <p className={s.exSentence} data-rise>
              First, allow Sooth to move an exact amount
            </p>
            <div className={s.call} data-ui data-rise>
              <span className={s.uiLabel}>Amount to sell</span>
              <span className={s.uiInput}>
                <span>98.00</span>
                <span className={s.uiUnit}>DOGE</span>
              </span>
              <span className={s.uiButton}>Allow Sooth to sell up to 98.00 DOGE</span>
            </div>
            <dl className={s.response} data-ui data-rise>
              <div>
                <dt>Allowance for Sooth</dt>
                <dd>98.00 DOGE</dd>
              </div>
              <div>
                <dt>Call</dt>
                <dd>approve(Sooth, 98.00)</dd>
              </div>
              <div>
                <dt>Network fee</dt>
                <dd>0.0060 DOGE</dd>
              </div>
            </dl>
          </div>

          <div className={s.exchange}>
            <p className={s.exSentence} data-rise>
              Then arm the stop
            </p>
            <div className={s.call} data-ui data-rise>
              <span className={s.uiLabel}>Stop price</span>
              <span className={s.uiInput}>
                <span>$0.0700</span>
                <span className={s.uiUnit}>USD</span>
              </span>
              <span className={s.uiLabel}>Gas floor</span>
              <span className={s.uiInput}>
                <span>2.00</span>
                <span className={s.uiUnit}>DOGE</span>
              </span>
            </div>
            <dl className={s.response} data-ui data-rise>
              <div>
                <dt>State</dt>
                <dd>Armed</dd>
              </div>
              <div>
                <dt>Stop</dt>
                <dd className={s.stopFigure}>$0.0700</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>98.00 DOGE</dd>
              </div>
              <div>
                <dt>Gas floor</dt>
                <dd>2.00 DOGE</dd>
              </div>
            </dl>
          </div>

          <div className={s.exchange}>
            <p className={s.exSentence} data-rise>
              When DOGE/USD reaches it, anyone fires it
            </p>
            <div className={s.call} data-ui data-rise>
              <span className={s.uiLabel}>Call</span>
              <span className={s.uiCode}>trigger(0x7a3f…91c2) with the signed price $0.0698</span>
            </div>
            <div className={`${s.response} ${s.responseWide}`} data-ui data-rise>
              <p className={s.receiptTitle}>Sold 98.00 DOGE at $0.0698</p>
              <dl className={s.receiptRows}>
                <div>
                  <dt>Proceeds</dt>
                  <dd>6.84 tDOLLAR</dd>
                </div>
                <div>
                  <dt>Fee to the caller, 0.5%</dt>
                  <dd>0.03 tDOLLAR</dd>
                </div>
                <div>
                  <dt>Paid to the holder</dt>
                  <dd>6.81 tDOLLAR</dd>
                </div>
                <div>
                  <dt>Holder DOGE, before and after</dt>
                  <dd>100.00 → 2.00</dd>
                </div>
                <div>
                  <dt>Gas floor</dt>
                  <dd>2.00 DOGE, met</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Features: fixed output, live controls (the live thing) */}
      <LiveStop />

      {/* Why only DogeOS: a red page */}
      <section className={s.only} aria-labelledby="only-title">
        <img
          className={s.onlyPicture}
          src="/media/coin-black-tails.jpg"
          alt="A gold-plated Dogecoin coin on a dark cloth"
          width={1920}
          height={1280}
          loading="lazy"
          data-rise
        />
        <div className={s.onlyText}>
          <h2 id="only-title" className={s.head} data-rise>
            Only on DogeOS
          </h2>
          <p data-rise style={{ ["--i" as string]: 1 }}>
            On other chains the gas coin is not a token, so a stop-loss means wrapping it or depositing it first. On
            DogeOS, native DOGE is also an ERC-20 at {shortHex(DEPLOYED.NativeDoge)}, and a contract can pull it from your
            wallet directly.
          </p>
          <p className={s.onlyProof} data-rise style={{ ["--i" as string]: 2 }}>
            On {RECORDED.pull.date} a 20-line contract pulled exactly 1.00 DOGE from a test wallet on Chikyū, then gave it
            back.{" "}
            <a href={txLink(RECORDED.pull.tx)} target="_blank" rel="noreferrer">
              See the pull on Blockscout
            </a>
          </p>
        </div>
      </section>

      {/* Proof: plain names in columns */}
      <section className={s.proof} aria-labelledby="proof-title">
        <h2 id="proof-title" className={s.head} data-rise>
          Checked on Chikyū
        </h2>
        <div className={s.names} data-rise style={{ ["--i" as string]: 1 }}>
          <ul>
            <li className={s.kind}>Deployed, source verified</li>
            <li>
              <a href={addrLink(DEPLOYED.Sooth)} target="_blank" rel="noreferrer">
                Sooth
              </a>
            </li>
            <li>
              <a href={addrLink(DEPLOYED.BackstopVenue)} target="_blank" rel="noreferrer">
                BackstopVenue
              </a>
            </li>
            <li>
              <a href={addrLink(DEPLOYED.TestDollar)} target="_blank" rel="noreferrer">
                TestDollar
              </a>
            </li>
            <li>
              <a href={addrLink(DEPLOYED.NativeDoge)} target="_blank" rel="noreferrer">
                Native DOGE
              </a>
            </li>
          </ul>
          <ul>
            <li className={s.kind}>Recorded on-chain</li>
            <li>
              <a href={txLink(RECORDED.pull.tx)} target="_blank" rel="noreferrer">
                A contract pulled 1 DOGE
              </a>
            </li>
            <li>
              <a href={txLink(RECORDED.arm.tx)} target="_blank" rel="noreferrer">
                An exact approve and arm
              </a>
            </li>
            <li>No custody before trigger</li>
            <li>
              <a href={txLink(RECORDED.afterCancel.tx)} target="_blank" rel="noreferrer">
                After cancel, refused
              </a>
            </li>
          </ul>
          <ul>
            <li className={s.kind}>Tested</li>
            <li>{TESTED.tests} contract tests</li>
            <li>
              {TESTED.mutantsCaught} of {TESTED.mutants} breaks caught
            </li>
            <li>{TESTED.fuzzRuns} fuzzed stops</li>
          </ul>
          <ul>
            <li className={s.kind}>Triggered at a signed price</li>
            <li>
              <a href={txLink(RECORDED.aboveStop.tx)} target="_blank" rel="noreferrer">
                Above the stop, refused
              </a>
            </li>
            <li>
              <a href={txLink(RECORDED.sell.tx)} target="_blank" rel="noreferrer">
                Below the stop, sold
              </a>
            </li>
          </ul>
        </div>
      </section>

      {/* List: cards that fold into spines */}
      <SpineDeck limits={LIMITS} />

      {/* CTA: the idea again, inverted */}
      <section className={s.close} aria-labelledby="close-title">
        <h2 id="close-title" className={s.closeTitle} data-rise>
          Keep the DOGE, <br />
          set the stop
        </h2>
        <div className={s.closeFoot}>
          <p data-rise style={{ ["--i" as string]: 1 }}>
            Approve an exact amount, arm a stop, keep at least 1 DOGE for gas.
          </p>
          <CloseAction />
        </div>
      </section>

      </main>

      {/* Footer: columns above, wordmark below */}
      <footer className={s.footer}>
        <div className={s.footCols}>
          <div>
            <p>Network</p>
            <p className={s.soft}>DogeOS Chikyū testnet</p>
            <p className={s.soft}>Chain 6281971</p>
          </div>
          <nav aria-label="Pages">
            <p>Pages</p>
            <Link href="/arm">Arm a stop</Link>
            <Link href="/status">Your stop</Link>
            <Link href="/verify">Verify</Link>
          </nav>
          <div>
            <p>Contracts</p>
            <a href={addrLink(DEPLOYED.Sooth)} target="_blank" rel="noreferrer">
              Sooth {shortHex(DEPLOYED.Sooth)}
            </a>
            <a href={addrLink(DEPLOYED.BackstopVenue)} target="_blank" rel="noreferrer">
              BackstopVenue {shortHex(DEPLOYED.BackstopVenue)}
            </a>
            <a href={addrLink(DEPLOYED.TestDollar)} target="_blank" rel="noreferrer">
              TestDollar {shortHex(DEPLOYED.TestDollar)}
            </a>
          </div>
          <div className={s.credits}>
            <p>Pictures</p>
            {CREDITS.map(([title, by, lic, page, licUrl]) => (
              <p key={page} className={s.soft}>
                <a href={page} target="_blank" rel="noreferrer">
                  {title}
                </a>{" "}
                by {by},{" "}
                <a href={licUrl} target="_blank" rel="noreferrer">
                  {lic}
                </a>
              </p>
            ))}
          </div>
        </div>
        <svg className={s.wordmarkBig} viewBox="0 0 1000 250" role="img" aria-label="Sooth">
          <text x="-6" y="216" textLength="1006" lengthAdjust="spacingAndGlyphs">
            Sooth
          </text>
        </svg>
        <p className={s.legal}>Made for VIBE CODE ON DOGE. Testnet only; tDOLLAR has no value.</p>
      </footer>
    </div>
  );
}
