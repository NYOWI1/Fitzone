import { useEffect, useState } from "react";
import "./AdminPanel.css";
import ClassesPage from "./pages/classes/ClassesPage";
import CrowdDetectionPage from "./pages/crowd-detection/CrowdDetectionPage";
import MembersPage from "./pages/members/MembersPage";
import OverviewPage from "./pages/overview/OverviewPage";
import PaymentsPage from "./pages/payments/PaymentsPage";
import PlansPage from "./pages/plans/PlansPage";
import ReportsPage from "./pages/reports/ReportsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import TrainersPage from "./pages/trainers/TrainersPage";
import { getActiveAdminPage, getAdminPageFromMenuSlug, getAdminPageUrl, getMenuSlug, menuItems } from "./adminPanelUtils";
import { getSiteSettings } from "../../shared/api";

function AdminPanel() {
  const [activePage, setActivePage] = useState(() => getActiveAdminPage());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState({});
  const brandName = siteSettings.brand?.name || "Gym";
  const brandInitial = brandName.trim().charAt(0).toUpperCase() || "G";
  const adminContact = siteSettings.contact?.email || "Admin account";

  useEffect(() => {
    const updateActivePage = () => {
      setActivePage(getActiveAdminPage());
      setIsMobileMenuOpen(false);
    };

    window.addEventListener("hashchange", updateActivePage);
    window.addEventListener("popstate", updateActivePage);

    return () => {
      window.removeEventListener("hashchange", updateActivePage);
      window.removeEventListener("popstate", updateActivePage);
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadAdminShellSettings() {
      try {
        const settings = await getSiteSettings();

        if (isCurrent) {
          setSiteSettings(settings || {});
        }
      } catch (error) {
        console.error("Unable to load admin shell settings", error);
      }
    }

    loadAdminShellSettings();

    return () => {
      isCurrent = false;
    };
  }, []);

  const navigateToAdminPage = (event, nextPage) => {
    event.preventDefault();
    window.history.pushState(null, "", getAdminPageUrl(nextPage));
    setActivePage(nextPage);
    setIsMobileMenuOpen(false);
  };

  return (
    <main className="admin-page">
      <div className="admin-glow admin-glow-red"></div>
      <div className="admin-glow admin-glow-blue"></div>

      <header className="admin-mobile-bar">
        <div className="admin-brand">
          <div className="admin-logo">{brandInitial}</div>
          <div>
            <h1>{brandName}</h1>
            <span>ADMIN PANEL</span>
          </div>
        </div>
        <button
          aria-controls="admin-sidebar"
          aria-expanded={isMobileMenuOpen}
          aria-label="Toggle admin navigation"
          className="admin-mobile-menu-button"
          onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
          type="button"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </header>

      <button
        aria-label="Close admin navigation"
        className={isMobileMenuOpen ? "admin-nav-backdrop open" : "admin-nav-backdrop"}
        onClick={() => setIsMobileMenuOpen(false)}
        type="button"
      ></button>

      <aside
        className={isMobileMenuOpen ? "admin-sidebar mobile-open" : "admin-sidebar"}
        id="admin-sidebar"
        aria-label="Admin navigation"
      >
        <div className="admin-brand">
          <div className="admin-logo">{brandInitial}</div>
          <div>
            <h1>{brandName}</h1>
            <span>ADMIN PANEL</span>
          </div>
        </div>

        <nav className="admin-menu">
          {menuItems.map((item) => {
            const slug = getMenuSlug(item);
            const isActive = slug === activePage || (slug !== "members" && activePage === "overview" && slug === "overview");
            const nextPage = getAdminPageFromMenuSlug(slug);

            return (
              <a
                className={isActive ? "admin-menu-item active" : "admin-menu-item"}
                href={getAdminPageUrl(nextPage)}
                key={item}
                onClick={(event) => navigateToAdminPage(event, nextPage)}
              >
                <span className="admin-menu-dot"></span>
                {item}
              </a>
            );
          })}
        </nav>

        <div className="admin-profile-card">
          <div className="admin-avatar">{adminContact.charAt(0).toUpperCase()}</div>
          <div>
            <strong>{adminContact}</strong>
            <span>Site contact</span>
          </div>
        </div>
      </aside>

      {activePage === "classes" && <ClassesPage />}
      {activePage === "trainers" && <TrainersPage />}
      {activePage === "plans" && <PlansPage />}
      {activePage === "payments" && <PaymentsPage />}
      {activePage === "members" && <MembersPage />}
      {activePage === "reports" && <ReportsPage />}
      <CrowdDetectionPage isActive={activePage === "crowd-detection"} />
      {activePage === "settings" && <SettingsPage />}
      {activePage === "overview" && <OverviewPage />}
    </main>
  );
}

export default AdminPanel;
