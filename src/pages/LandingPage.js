import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { shopsPath, marketingHomeQuery } from '../utils/workspacePaths';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faBoxesStacked,
  faChartColumn,
  faChevronDown,
  faCircleCheck,
  faCircleQuestion,
  faEnvelope,
  faFileInvoiceDollar,
  faShop,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';
import './LandingPage.css';

/** Retail counter — Unsplash (free to hotlink for marketing demos) */
const HERO_BG =
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=2200&q=85';

function ProfitAreaChart() {
  return (
    <svg className="zbx-chartSvg" viewBox="0 0 360 120" aria-hidden>
      <defs>
        <linearGradient id="zbxAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="zbxAreaStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path
        fill="url(#zbxAreaFill)"
        d="M0,88 C36,82 54,70 72,72 C108,76 126,48 144,52 C180,58 198,32 216,28 C252,20 270,38 288,34 C324,26 342,14 360,10 L360,120 L0,120 Z"
      />
      <path
        fill="none"
        stroke="url(#zbxAreaStroke)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M0,88 C36,82 54,70 72,72 C108,76 126,48 144,52 C180,58 198,32 216,28 C252,20 270,38 288,34 C324,26 342,14 360,10"
      />
    </svg>
  );
}

function SalesBarChart() {
  const heights = [44, 62, 52, 78, 58, 88, 72, 95, 68, 82, 76, 92];
  return (
    <svg className="zbx-chartSvg zbx-chartSvg--bars" viewBox="0 0 360 100" aria-hidden>
      {heights.map((h, i) => (
        <rect
          key={i}
          x={8 + i * 28}
          y={92 - h}
          width="18"
          height={h}
          rx="5"
          fill="url(#zbxBarGrad)"
          opacity={0.35 + (i / heights.length) * 0.5}
        />
      ))}
      <defs>
        <linearGradient id="zbxBarGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const featureItems = [
  { title: 'Fast billing', desc: 'Quick search, stock checks, smoother checkout flow.', icon: faBolt },
  { title: 'Inventory', desc: 'Stock in/out with accurate movement history.', icon: faBoxesStacked },
  { title: 'Customer ledger', desc: 'Udhar balances, received payments, clear statements.', icon: faFileInvoiceDollar },
  { title: 'Vendor payables', desc: 'Purchases, due amounts, and payment tracking.', icon: faTruck },
  { title: 'Reports', desc: 'Sales, low stock, receivables, payables, profitability.', icon: faChartColumn },
  { title: 'Multi-shop', desc: 'One owner account, multiple shops, role-based access.', icon: faShop },
];

const plans = [
  {
    name: '14‑Day Trial',
    price: 'Free',
    meta: 'No card required • 1 shop',
    points: [
      'Unlimited salesmen',
      'All Starter features',
      'One trial per email — ever',
      'Data preserved after trial',
      'Upgrade anytime',
    ],
  },
  {
    name: 'Starter',
    price: '$9',
    meta: '/mo • 1 shop',
    points: [
      'Unlimited salesmen',
      'Inventory + Sales + Billing',
      'Customer ledger (Udhar)',
      'Vendor management',
      'Basic reports',
    ],
  },
  {
    name: 'Pro',
    price: '$25',
    meta: '/mo • 3 shops',
    points: [
      'Unlimited salesmen',
      'All Starter features',
      'Advanced reports',
      'Data export (CSV)',
      'Priority support',
    ],
    featured: true,
  },
  {
    name: 'Premium',
    price: '$49',
    meta: '/mo • Unlimited shops',
    points: [
      'Unlimited salesmen',
      'All Pro features',
      'Admin dashboard',
      'Audit trail / logs',
      'Dedicated support',
    ],
  },
];

const faqs = [
  {
    q: 'How do I sign up and start the trial?',
    a: 'Create an account with email and password or Google. The 14‑day trial does not require a card. After signup you can set up your shop and invite salesmen as needed.',
  },
  {
    q: 'Is the trial free, and what are the limits?',
    a: 'Yes — no card required for the trial. You get Starter‑level features for 14 days, one trial per email (not reset by signing up again). Your data stays in your account after the trial ends.',
  },
  {
    q: 'How many shops and salesmen are included?',
    a: 'Starter covers 1 shop; Pro up to 3 shops; Premium unlimited shops. Salesmen are unlimited on every plan — you do not pay per cashier; billing is per owner account.',
  },
  {
    q: 'How is my shop data kept safe?',
    a: 'Each shop’s information stays separate. Staff only see the shops they are added to, and the owner decides who can join. Sensitive actions stay within your team.',
  },
  {
    q: 'What can I run in the app day to day?',
    a: 'Billing and checkout, inventory and stock movement, customer ledger (Udhar), vendor payables, expenses, categories, purchases, rate lists, sales history, and reports.',
  },
  {
    q: 'Does Pro include data export?',
    a: 'Yes. The Pro plan includes data export (CSV) for reporting and backups, as listed on the pricing cards.',
  },
  {
    q: 'Can I use it on a phone or tablet?',
    a: 'Yes. The interface is built to work in modern mobile browsers on Android and iOS so you can use it on the shop floor or on the go.',
  },
  {
    q: 'Why does signup sometimes ask me to wait?',
    a: 'To block spam, the system may ask you to wait a few seconds between tries — simply wait and sign up again. If an email doesn’t arrive, check spam or try once more after a short break; contact support if it keeps happening.',
  },
  {
    q: 'What happens after the 14‑day trial?',
    a: 'Your data is preserved. Upgrade to a paid plan when you are ready to keep full access under that plan’s shop limits and features.',
  },
  {
    q: 'Who do I contact for help?',
    a: 'Email support@zentryasolutions.com for product or account questions.',
  },
];

export default function LandingPage() {
  const { user, activeShopId, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const workspacePath = activeShopId ? '/app' : shopsPath(user?.id);
  const mq = user?.id ? marketingHomeQuery(user.id) : '';
  const brandTo =
    user?.id != null ? { pathname: '/', ...(mq ? { search: mq } : {}) } : '/';

  useEffect(() => {
    const hash = location.hash?.replace(/^#/, '') || '';
    if (hash === 'insights') {
      navigate(
        { pathname: location.pathname, search: location.search, hash: '#features' },
        { replace: true }
      );
      window.setTimeout(() => {
        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return undefined;
    }
    if (!hash) return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname, location.search, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('.zbx-reveal'));
    if (!nodes.length) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="zbx">
      <header className="zbx-nav">
        <Link to={brandTo} className="zbx-brand">
          <span className="zbx-brandMark">
            <img
              className="zbx-brandImg"
              src={`${process.env.PUBLIC_URL}/companylogo.jpeg`}
              alt=""
              width={44}
              height={44}
              decoding="async"
            />
          </span>
          <div className="zbx-brandLockup">
            <div className="zbx-brandTitle">
              <span className="zbx-brandWord">Zentrya</span>
              <span className="zbx-brandBadge">Biz</span>
            </div>
            <p className="zbx-brandTagline">
              <span className="zbx-brandTaglineMain">Run your business</span>
              <span className="zbx-brandTaglineDot" aria-hidden="true" />
              <span className="zbx-brandTaglineAccent">simply</span>
            </p>
          </div>
        </Link>
        <nav className="zbx-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="zbx-actions">
          {user ? (
            <>
              <Link to={workspacePath} className="zbx-btn zbx-btnPrimary">
                My workspace
              </Link>
              <button type="button" className="zbx-btn zbx-btnGhost" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="zbx-btn zbx-btnGhost">Log in</Link>
              <Link to="/signup" className="zbx-btn zbx-btnPrimary">Start trial</Link>
            </>
          )}
        </div>
      </header>

      <main className="zbx-main">
        <section className="zbx-heroFull zbx-reveal zbx-revealUp" aria-label="Hero">
          <div
            className="zbx-heroFullBg"
            style={{ backgroundImage: `url(${HERO_BG})` }}
          />
          <div className="zbx-heroFullScrim" />
          <div className="zbx-heroFullNoise" aria-hidden />
          <div className="zbx-heroFullInner">
            <div className="zbx-heroFullCopy">
              <p className="zbx-tag zbx-tag--hero">Modern SaaS for retail</p>
              <h1>Run the shop. See the profit. Sleep better.</h1>
              <h2>POS, stock, udhar, and owner-grade reports — one calm system your team will actually use.</h2>
              <p className="zbx-lead zbx-lead--hero">
                Illustrative charts below show the kind of clarity owners get: trends, daily sales rhythm, and signals to act on — not spreadsheet chaos.
              </p>
              <div className="zbx-heroCtas">
                {user ? (
                  <>
                    <Link to={workspacePath} className="zbx-btn zbx-btnPrimary zbx-btnLarge">Continue to workspace</Link>
                    <a href="#pricing" className="zbx-btn zbx-btnGhost zbx-btnLarge zbx-btnGlass">View pricing</a>
                  </>
                ) : (
                  <>
                    <Link to="/signup" className="zbx-btn zbx-btnPrimary zbx-btnLarge">Start free 14-day trial</Link>
                    <Link to="/login" className="zbx-btn zbx-btnGhost zbx-btnLarge zbx-btnGlass">Explore dashboard</Link>
                  </>
                )}
              </div>
            </div>
            <div className="zbx-heroFullVisual">
              <div className="zbx-dashMock">
                <div className="zbx-dashMockHead">
                  <span className="zbx-dashMockTitle">Owner snapshot</span>
                  <span className="zbx-dashMockBadge">Sample view</span>
                </div>
                <div className="zbx-kpiRow">
                  <div className="zbx-kpi">
                    <span className="zbx-kpiLabel">Net profit (30d)</span>
                    <span className="zbx-kpiValue">+18.4%</span>
                    <span className="zbx-kpiHint">vs prior month</span>
                  </div>
                  <div className="zbx-kpi">
                    <span className="zbx-kpiLabel">Avg. ticket</span>
                    <span className="zbx-kpiValue">$24.80</span>
                    <span className="zbx-kpiHint">checkout</span>
                  </div>
                  <div className="zbx-kpi">
                    <span className="zbx-kpiLabel">Stock alerts</span>
                    <span className="zbx-kpiValue zbx-kpiValue--warn">7 SKUs</span>
                    <span className="zbx-kpiHint">low / reorder</span>
                  </div>
                </div>
                <div className="zbx-chartPanel">
                  <span className="zbx-chartPanelLabel">Profit trend</span>
                  <ProfitAreaChart />
                </div>
                <div className="zbx-chartPanel">
                  <span className="zbx-chartPanelLabel">Sales by day (sample)</span>
                  <SalesBarChart />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="zbx-section zbx-reveal zbx-revealLeft">
          <div className="zbx-sectionHead">
            <p>FEATURES</p>
            <h3>Everything your team needs to run daily operations</h3>
          </div>
          <div className="zbx-grid">
            {featureItems.map((f) => (
              <article key={f.title} className="zbx-card">
                <div className="zbx-cardIcon" aria-hidden="true">
                  <FontAwesomeIcon icon={f.icon} />
                </div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="zbx-section zbx-reveal zbx-revealRight">
          <div className="zbx-sectionHead">
            <p>PRICING</p>
            <h3>Plans & pricing</h3>
          </div>
          <div className="zbx-pricing">
            {plans.map((plan) => (
              <article key={plan.name} className={`zbx-plan ${plan.featured ? 'is-featured' : ''}`}>
                {plan.featured ? <span className="zbx-badge">Most popular</span> : null}
                <div className="zbx-planHeader">
                  <h4>{plan.name}</h4>
                  <div className="zbx-price">{plan.price}</div>
                  <div className="zbx-meta">{plan.meta}</div>
                </div>
                <div className="zbx-planBody">
                  <ul>
                    {plan.points.map((p) => (
                      <li key={p}>
                        <span className="zbx-listCheck" aria-hidden="true">
                          <FontAwesomeIcon icon={faCircleCheck} />
                        </span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    className={`zbx-btn zbx-planCta ${plan.featured ? 'zbx-btnPrimary' : 'zbx-btnGhost'}`}
                    to={user ? workspacePath : '/signup'}
                  >
                    {user
                      ? 'Open workspace'
                      : plan.name.includes('Trial')
                        ? 'Start trial'
                        : `Choose ${plan.name}`}
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="zbx-trialRules">
            <div className="zbx-trialRulesTitle">Trial rules — enforce strictly</div>
            <ul>
              {[
                'One trial per email address — cannot be reset by signing up again',
                'Trial gives full Starter plan access for 14 days',
                'Data is preserved after trial',
                'Upgrade anytime',
              ].map((rule) => (
                <li key={rule}>
                  <span className="zbx-listCheck" aria-hidden="true">
                    <FontAwesomeIcon icon={faCircleCheck} />
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="faq" className="zbx-section zbx-reveal zbx-revealLeft">
          <div className="zbx-sectionHead">
            <p>FAQ</p>
            <h3>Answers that match how Zentrya Biz works</h3>
          </div>
          <div className="zbx-faq">
            {faqs.map((item, i) => {
              const isOpen = openFaqIndex === i;
              const headId = `zbx-faq-head-${i}`;
              const panelId = `zbx-faq-panel-${i}`;
              return (
                <div key={item.q} className={`zbx-faqItem${isOpen ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="zbx-faqTrigger"
                    id={headId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                  >
                    <span className="zbx-faqIcon" aria-hidden="true">
                      <FontAwesomeIcon icon={faCircleQuestion} />
                    </span>
                    <span className="zbx-faqQuestion">{item.q}</span>
                    <span className={`zbx-faqChevron${isOpen ? ' is-open' : ''}`} aria-hidden="true">
                      <FontAwesomeIcon icon={faChevronDown} />
                    </span>
                  </button>
                  <div
                    id={panelId}
                    className="zbx-faqPanel"
                    role="region"
                    aria-labelledby={headId}
                    hidden={!isOpen}
                  >
                    <p>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="zbx-footer zbx-reveal zbx-revealUp">
        <div className="zbx-footerInner">
          <div>
            <h5>Zentrya Biz</h5>
            <p>Premium retail software for modern shops.</p>
          </div>
          <div className="zbx-footerLinks">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            {user ? <Link to={workspacePath}>My workspace</Link> : <Link to="/login">Log in</Link>}
          </div>
          <div>
            <p className="zbx-footerEmail">
              <FontAwesomeIcon icon={faEnvelope} aria-hidden />
              <a href="mailto:support@zentryasolutions.com">support@zentryasolutions.com</a>
            </p>
            <p className="zbx-footerCopy">© {new Date().getFullYear()} Zentrya Biz</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
