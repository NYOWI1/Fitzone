import { getMenuSlug } from '../../adminPanelUtils';

export default function AdminPlaceholderPage({ title, description }) {
  return (
    <section className='admin-content gap-0' id={getMenuSlug(title)}>
      <header className='admin-header'>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>

      <section className='admin-card grid min-h-[180px] max-w-[720px] gap-3'>
        <h3>{title}</h3>
        <p className='m-0 text-sm leading-normal text-[#b8b8b8]'>
          This admin section is ready for its live controls and will keep the
          same responsive layout as the rest of the panel.
        </p>
      </section>
    </section>
  );
}
