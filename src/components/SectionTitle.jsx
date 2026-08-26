export default function SectionTitle({ eyebrow, title, description, align = "left" }) {
  return (
    <header className={`section-title section-title-${align}`}>
      {eyebrow ? <span className="section-title-eyebrow">{eyebrow}</span> : null}
      {title ? <h2>{title}</h2> : null}
      {description ? <p>{description}</p> : null}
    </header>
  );
}
