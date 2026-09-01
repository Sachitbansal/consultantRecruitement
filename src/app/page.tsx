import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HeroVisual from "@/components/HeroVisual";
import Reveal from "@/components/Reveal";
import {
  changes,
  contact,
  engage,
  fit,
  hero,
  moment,
  returns,
  scale,
  steps,
} from "@/lib/gop-content";

export default function Page() {
  return (
    <>
      <span id="top" />
      <Header />

      <main id="main">
        {/* ------------------------------------------------------- hero */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <span className="eyebrow">{hero.eyebrow}</span>
              <h1>{hero.heading}</h1>
              <p className="hero-sub">{hero.sub}</p>
              <div className="hero-ctas">
                <a className="btn btn-primary" href={hero.primary.href}>
                  {hero.primary.label}
                </a>
                <a className="btn btn-ghost" href={hero.secondary.href}>
                  {hero.secondary.label}
                </a>
              </div>
            </div>
            <div className="hero-visual">
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* -------------------------------------------- the moment you're in */}
        <section className="moment band-dark">
          <div className="wrap-narrow">
            <Reveal>
              <span className="eyebrow on-dark">{moment.eyebrow}</span>
              {moment.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
              <p className="pull">{moment.pull}</p>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------- what we do */}
        <section id="what-we-do">
          <div className="wrap">
            <Reveal className="section-head">
              <span className="eyebrow">{scale.eyebrow}</span>
              <h2>{scale.heading}</h2>
              <p>{scale.intro}</p>
            </Reveal>

            <div className="scale-grid">
              {scale.items.map((item) => (
                <article className="scale-card" key={item.n}>
                  <span className="n">{item.n}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* ----------------------------------------------- what changes */}
        <section>
          <div className="wrap">
            <Reveal className="section-head">
              <span className="eyebrow">{changes.eyebrow}</span>
              <h2>{changes.heading}</h2>
            </Reveal>

            <div className="changes-grid">
              {changes.columns.map((column, i) => (
                <Reveal className="changes-col" key={column.title} delay={i * 80}>
                  <h3>{column.title}</h3>
                  <ul>
                    {column.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ how we work */}
        <section id="how-we-work">
          <div className="wrap">
            <Reveal className="engage">
              <span className="eyebrow">{engage.eyebrow}</span>
              <p className="statement">{engage.statement}</p>
              <p className="sub">{engage.sub}</p>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------- the return */}
        <section>
          <div className="wrap-narrow">
            <Reveal>
              <span className="eyebrow">{returns.eyebrow}</span>
              <blockquote className="return-quote">{returns.quote}</blockquote>
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------- how it starts */}
        <section>
          <div className="wrap">
            <Reveal className="section-head">
              <span className="eyebrow">{steps.eyebrow}</span>
              <h2>{steps.heading}</h2>
            </Reveal>

            <div className="steps">
              {steps.items.map((step, i) => (
                <Reveal className="step" key={step.title} delay={i * 80}>
                  <div className="step-num" aria-hidden="true">
                    {i + 1}
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------ who we work with */}
        <section id="who-we-work-with" className="fit band-navy">
          <div className="wrap">
            <div className="fit-text">
              <span className="eyebrow on-dark">{fit.eyebrow}</span>
              <p>{fit.statement}</p>
            </div>
            <a className="btn btn-ghost on-dark" href={fit.cta.href}>
              {fit.cta.label}
            </a>
          </div>
        </section>

        {/* ---------------------------------------------------- contact */}
        <section id="contact">
          <div className="wrap contact-grid">
            <div className="contact-info">
              <span className="eyebrow">{contact.eyebrow}</span>
              <h2>{contact.heading}</h2>
              <p className="sub">{contact.sub}</p>

              <div className="contact-detail">
                <div>
                  <span className="label">Email</span>
                  <span className="value">
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  </span>
                </div>
                <div>
                  <span className="label">Response time</span>
                  <span className="value">{contact.responseTime}</span>
                </div>
              </div>
            </div>

            <ContactForm />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
