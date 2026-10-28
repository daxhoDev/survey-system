// Marks a required field next to its label (REQ-BRAND-019).
export default function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-rust">
      *
    </span>
  );
}
