"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { dogeNum } from "@/lib/format";
import s from "./landing.module.css";

// ---------------------------------------------------------------- connect actions

// The landing sends people into the app; the wallet connects there (the app's own Connect action).
export function SiteActions() {
  return (
    <div className={s.barRight}>
      <Link href="/verify" className={s.barLink}>
        Verify
      </Link>
      <Link href="/arm" className={s.button}>
        Open app
      </Link>
    </div>
  );
}

export function CloseAction() {
  return (
    <Link href="/arm" className={`${s.button} ${s.buttonInverse}`}>
      Open app
    </Link>
  );
}

// ---------------------------------------------------------------- hero: slow crossfade (the signature move)

const HERO = [
  { src: "/media/shiba-taiki.jpg", alt: "Taiki, a Shiba Inu, looking into the camera", pos: "50% 30%" },
  { src: "/media/coin-black-tails.jpg", alt: "A gold-plated Dogecoin coin on a dark cloth", pos: "50% 50%" },
  { src: "/media/shiba-cream.jpg", alt: "A cream Shiba Inu standing on a lawn", pos: "40% 50%" },
];

export function HeroPictures() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => (id = setInterval(() => setI((n) => (n + 1) % HERO.length), 7100));
    const stop = () => clearInterval(id);
    const onVis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return (
    <div className={s.heroPictures}>
      {HERO.map((h, n) => (
        <img
          key={h.src}
          src={h.src}
          alt={n === i ? h.alt : ""}
          aria-hidden={n !== i}
          width={1920}
          height={1280}
          className={s.heroImg}
          style={{ objectPosition: h.pos, opacity: n === i ? 1 : 0 }}
          fetchPriority={n === 0 ? "high" : "low"}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- entrances

export function Rise() {
  useEffect(() => {
    document.documentElement.classList.add("js");
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-rise]"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          // Reveal what is in view, and anything already scrolled past, so nothing stays hidden above.
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return null;
}

// ---------------------------------------------------------------- the live thing: set a stop, read it back

const BALANCE = 100; // the PRD demo wallet (prd.md §19.1)
const FLOORS = [1, 2, 5, 10];
const EXPIRIES = [
  { id: "none", label: "None" },
  { id: "24h", label: "24 hours" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

export function LiveStop() {
  const [stop, setStop] = useState(0.07);
  const [floor, setFloor] = useState(2);
  const [amount, setAmount] = useState(98);
  const [expiry, setExpiry] = useState("none");
  const maxAmount = BALANCE - floor;
  const a = Math.min(amount, maxAmount);
  const proceeds = a * stop;
  const fee = proceeds * 0.005;
  const rest = BALANCE - a - floor;
  const exp = EXPIRIES.find((e) => e.id === expiry)!.label;

  return (
    <section className={s.live} aria-labelledby="live-title">
      <div className={s.liveField}>
        <div className={s.ticket} data-ui aria-live="polite">
          <p className={s.ticketHead}>
            <span>Stop ticket</span>
            <span className={s.ticketWallet}>{BALANCE.toFixed(2)} DOGE wallet</span>
          </p>
          <p className={s.ticketSentence}>
            Sooth will sell <b>{dogeNum(a)} DOGE</b> only if DOGE/USD ≤ <b className={s.stopFigure}>${stop.toFixed(4)}</b>,
            and will leave at least <b>{dogeNum(floor)} DOGE</b>.
          </p>
          <div className={s.split} role="img" aria-label={`${dogeNum(a)} DOGE to sell, ${dogeNum(rest)} untouched, ${dogeNum(floor)} kept for gas`}>
            <span className={s.splitSell} style={{ width: `${(a / BALANCE) * 100}%` }} />
            {rest > 0 && <span className={s.splitRest} style={{ width: `${(rest / BALANCE) * 100}%` }} />}
            <span className={s.splitFloor} style={{ width: `${(floor / BALANCE) * 100}%` }} />
          </div>
          <dl className={s.ticketRows}>
            <div>
              <dt>To sell</dt>
              <dd>{dogeNum(a)} DOGE</dd>
            </div>
            <div>
              <dt>Untouched</dt>
              <dd>{dogeNum(rest)} DOGE</dd>
            </div>
            <div>
              <dt>Kept for gas</dt>
              <dd>{dogeNum(floor)} DOGE</dd>
            </div>
            <div>
              <dt>Paid to you if sold at the stop</dt>
              <dd>≈ {(proceeds - fee).toFixed(2)} tDOLLAR</dd>
            </div>
            <div>
              <dt>Ends</dt>
              <dd>{exp === "None" ? "Never" : `After ${exp}`}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className={s.liveCol}>
        <h2 id="live-title" className={s.head} data-rise>
          Set a stop, read it back
        </h2>

        <div className={s.block}>
          <p className={s.blockSentence}>Pick the price that ends it</p>
          <p>The stop is the most DOGE/USD can be at the moment it sells. Above it, every trigger is refused.</p>
          <label className={s.control}>
            <span>
              Stop price <b>${stop.toFixed(4)}</b>
            </span>
            <input
              type="range"
              min={0.05}
              max={0.08}
              step={0.0005}
              value={stop}
              onChange={(e) => setStop(Number(e.target.value))}
            />
          </label>
        </div>

        <div className={s.block}>
          <p className={s.blockSentence}>Choose how much it may sell</p>
          <p>It moves exactly this amount and no more, whatever allowance you gave it.</p>
          <label className={s.control}>
            <span>
              Amount <b>{dogeNum(a)} DOGE</b> of {BALANCE}
            </span>
            <input
              type="range"
              min={1}
              max={maxAmount}
              step={1}
              value={a}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
        </div>

        <div className={s.block}>
          <p className={s.blockSentence}>Keep DOGE for gas</p>
          <p>What the contract leaves behind, so you can still pay to revoke. Never less than 1 DOGE.</p>
          <div className={s.choice} role="radiogroup" aria-label="Gas floor">
            {FLOORS.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={floor === f}
                onClick={() => setFloor(f)}
              >
                {f} DOGE
              </button>
            ))}
          </div>
        </div>

        <div className={s.block}>
          <p className={s.blockSentence}>Give it an end</p>
          <p>After this the stop cannot fire, and you arm a new one if you still want it.</p>
          <div className={s.choice} role="radiogroup" aria-label="Expiry">
            {EXPIRIES.map((e) => (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={expiry === e.id}
                onClick={() => setExpiry(e.id)}
              >
                {e.label}
              </button>
            ))}
          </div>
          <Link href="/arm" className={s.button}>
            Arm this stop
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- list: cards that fold into spines

type Limit = { title: string; body: string; kind: string };

export function SpineDeck({ limits }: { limits: Limit[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    const apply = () => setPinned(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!pinned) return;
    const onScroll = () => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = el.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / span));
      setActive(Math.min(limits.length - 1, Math.floor(p * limits.length)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pinned, limits.length]);

  const goTo = (n: number) => {
    const el = wrap.current;
    if (!el || !pinned) return setActive(n);
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + (span * (n + 0.5)) / limits.length, behavior: "smooth" });
  };

  return (
    <section className={`${s.deckWrap} ${pinned ? s.deckPinned : ""}`} ref={wrap} aria-labelledby="limits-title">
      <div className={s.deckStage}>
        <h2 id="limits-title" className={s.head}>
          What Sooth does not do
        </h2>
        <ol className={s.deck}>
          {limits.map((l, n) => {
            const folded = pinned && n < active;
            const hidden = pinned && n > active;
            return (
              <li
                key={l.title}
                className={s.deckCard}
                data-tone={n % 3}
                style={
                  pinned
                    ? {
                        transform: `translateX(${hidden ? "110vw" : `${n * 120}px`})`,
                        zIndex: n,
                      }
                    : undefined
                }
                aria-current={pinned && n === active ? "true" : undefined}
                data-folded={folded}
              >
                <span className={s.spineLabel} aria-hidden="true">
                  {l.title}
                </span>
                <button
                  type="button"
                  className={s.deckSpine}
                  onClick={() => goTo(n)}
                  tabIndex={folded ? 0 : -1}
                  aria-hidden={!folded}
                  aria-label={`Show: ${l.title}`}
                />
                <h3 className={s.deckTitle}>{l.title}</h3>
                <p className={s.deckBody}>{l.body}</p>
                <p className={s.deckFoot}>
                  <span>{l.kind}</span>
                  <Link href="/verify#claims">Read the claims</Link>
                </p>
              </li>
            );
          })}
        </ol>
        <p className={s.deckCount}>
          {limits.length} limits, stated in the README and on{" "}
          <Link href="/verify#claims">the claims ledger</Link>
        </p>
      </div>
    </section>
  );
}
