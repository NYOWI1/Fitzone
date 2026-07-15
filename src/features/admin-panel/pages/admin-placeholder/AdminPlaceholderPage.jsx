import { getMenuSlug } from "../../adminPanelUtils";
import "./AdminPlaceholderPage.css";

export default function AdminPlaceholderPage({ title, description }) {
  return (
    <section className="admin-content admin-placeholder-page" id={getMenuSlug(title)}>
      <header className="admin-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>

      <section className="admin-card admin-placeholder-card">
        <h3>{title}</h3>
        <p>This admin section is ready for its live controls and will keep the same responsive layout as the rest of the panel.</p>
      </section>
    </section>
  );
}
