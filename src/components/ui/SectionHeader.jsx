function SectionHeader({ label, title, description, children }) {
  return (
    <div className="section-header">
      <div><span className="section-label">{label}</span><h2>{title}</h2></div>
      <div className="section-header-right"><p>{description}</p>{children}</div>
    </div>
  );
}


export { SectionHeader };
