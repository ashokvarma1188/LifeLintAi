import { Inbox } from "lucide-react";

/** A consistent icon + message for "nothing here yet" states, instead of bare text. */
function EmptyState({ icon: Icon = Inbox, title, hint }) {
  return (
    <div className="portal-empty portal-empty-icon">
      <div className="portal-empty-icon-wrap">
        <Icon size={24} />
      </div>
      <p>{title}</p>
      {hint && <p className="portal-empty-hint">{hint}</p>}
    </div>
  );
}

export default EmptyState;
