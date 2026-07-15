import { useEffect, useState } from "react";
import { getClassSchedule, getMembers, getStripeRevenueOverview, getTrainers } from "../../../../shared/api";
import { formatPaymentAmount, getOverviewKpis, getOverviewRecentMembers, getOverviewRevenueBars, getOverviewRevenueSummary, getOverviewTodayClasses } from "../../adminPanelUtils";
import "./OverviewPage.css";

export default function OverviewPage() {
  const [overviewData, setOverviewData] = useState({
    members: [],
    schedule: [],
    trainers: [],
    stripeRevenue: {},
  });
  const [status, setStatus] = useState("loading");
  const kpis = getOverviewKpis(overviewData);
  const recentMembers = getOverviewRecentMembers(overviewData.members);
  const todayClasses = getOverviewTodayClasses(overviewData.schedule);
  const revenueBars = getOverviewRevenueBars(overviewData.stripeRevenue);
  const revenueSummary = getOverviewRevenueSummary(overviewData.stripeRevenue);

  useEffect(() => {
    let isCurrent = true;

    async function loadOverviewData() {
      try {
        const [members, schedule, trainers, stripeRevenue] = await Promise.all([
          getMembers(),
          getClassSchedule(),
          getTrainers(),
          getStripeRevenueOverview(),
        ]);

        if (isCurrent) {
          setOverviewData({
            members,
            schedule,
            trainers,
            stripeRevenue,
          });
          setStatus("ready");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setStatus("error");
        }
      }
    }

    loadOverviewData();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <section className="admin-content" id="overview">
      <header className="admin-header">
        <div>
          <h2>Admin Panel</h2>
          <p>Manage members, bookings, trainers, payments, and gym operations in one place.</p>
        </div>
      </header>

      {status === "loading" && (
        <p className="admin-state-message">Loading overview data from database...</p>
      )}

      {status === "error" && (
        <p className="admin-state-message error">Overview data is unavailable. Check the API server, database, Clerk, and Stripe configuration.</p>
      )}

      {status === "ready" && (
        <>
          <div className="admin-kpi-grid">
            {kpis.map((kpi) => (
              <article className="admin-kpi-card" key={kpi.label}>
                <span className={`admin-kpi-icon ${kpi.tone}`}></span>
                <div className="admin-kpi-copy">
                  <h3>{kpi.label}</h3>
                  <p>{kpi.note}</p>
                </div>
                <strong className={kpi.tone}>{kpi.value}</strong>
              </article>
            ))}
          </div>

          <div className="admin-dashboard-grid">
            <section className="admin-card admin-members-card">
              <div className="admin-card-header">
                <h3>Recent Members</h3>
                <button type="button">View all</button>
              </div>

              <div className="admin-member-list">
                {recentMembers.map((member) => (
                  <div className="admin-member-row" key={member.id}>
                    <span className={`admin-member-avatar ${member.tone}`}></span>
                    <div className="admin-overview-member-copy">
                      <strong>{member.name}</strong>
                      <small>{member.email}</small>
                    </div>
                    <span>{member.plan}</span>
                    <span className={`admin-status-pill ${member.status.toLowerCase()}`}>{member.status}</span>
                    <time>{member.joined}</time>
                  </div>
                ))}

                {recentMembers.length === 0 && (
                  <p className="admin-empty-row">No members are available yet.</p>
                )}
              </div>
            </section>

            <section className="admin-card admin-classes-card">
              <h3>Today Classes</h3>

              <div className="admin-class-list">
                {todayClasses.map((item) => (
                  <div className="admin-class-row" key={item.id}>
                    <span className={item.status === "full" ? "admin-class-dot full" : "admin-class-dot"}></span>
                    <div>
                      <strong>{item.name}</strong>
                      <time>{item.time}</time>
                      <small>{item.meta}</small>
                    </div>
                    <b className={item.status === "full" ? "full" : ""}>{item.duration}</b>
                  </div>
                ))}

                {todayClasses.length === 0 && (
                  <p className="admin-empty-row">No classes are scheduled today.</p>
                )}
              </div>
            </section>

            <section className="admin-card admin-revenue-card">
              <h3>Revenue Overview</h3>
              <div className="admin-revenue-chart" aria-label="Revenue overview by month">
                {revenueBars.map((bar) => (
                  <div className="admin-revenue-item" key={bar.month}>
                    <b title={formatPaymentAmount({ amount: bar.total })}>{bar.label}</b>
                    <span className="admin-revenue-track">
                      <span
                        className="admin-revenue-fill"
                        style={{ height: bar.height }}
                      ></span>
                    </span>
                    <small>{bar.month}</small>
                  </div>
                ))}
              </div>
              <div className="admin-overview-summary">
                {revenueSummary.map(([label, value]) => (
                  <div className="admin-overview-summary-row" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
