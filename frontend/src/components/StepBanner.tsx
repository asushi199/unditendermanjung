export default function StepBanner({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="step-banner" aria-label="Langkah">
      {steps.map((label, i) => (
        <div
          key={i}
          className={`step-item ${i + 1 === current ? "active" : ""} ${i + 1 < current ? "done" : ""}`}
        >
          <span className="step-circle">{i + 1}</span>
          <span className="step-label">{label}</span>
        </div>
      ))}
    </div>
  );
}
