import { useEffect, useState } from "react";
import { getClassSchedule, getMembers, getPayments, getStripeRevenueOverview } from "../../../../shared/api";
import { formatPaymentAmount, getReportYearOptions, getReportsKpis, getReportsYearRevenue } from "../../adminPanelUtils";
import "./ReportsPage.css";

export default function ReportsPage() {
  const [reportData, setReportData] = useState({
    members: [],
    schedule: [],
    payments: [],
    stripeRevenue: {},
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [status, setStatus] = useState("loading");
  const reportKpis = getReportsKpis(reportData);
  const yearOptions = getReportYearOptions(reportData.payments);
  const revenueTrend = getReportsYearRevenue({
    payments: reportData.payments,
    stripeRevenue: reportData.stripeRevenue,
    selectedYear,
  });

  useEffect(() => {
    let isCurrent = true;

    async function loadReportsData() {
      try {
        const [members, schedule, stripeRevenue, payments] = await Promise.all([
          getMembers(),
          getClassSchedule(),
          getStripeRevenueOverview(),
          getPayments(),
        ]);

        if (isCurrent) {
          setReportData({
            members,
            schedule,
            payments,
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

    loadReportsData();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <section className="admin-content admin-reports-page" id="reports">
      <header className="admin-header admin-reports-header">
        <div>
          <h2>Reports & Analytics</h2>
          <p>Review gym performance, attendance, revenue, and class demand.</p>
        </div>

      </header>

      {status === "loading" && (
        <p className="admin-state-message">Loading reports from live data sources...</p>
      )}

      {status === "error" && (
        <p className="admin-state-message error">Reports are unavailable. Check the API server, Clerk, Stripe, and database settings.</p>
      )}

      {status === "ready" && (
        <>
          <div className="admin-report-kpi-grid">
            {reportKpis.map((kpi) => (
              <article className="admin-report-kpi-card" key={kpi.label}>
                <strong className={kpi.tone}>{kpi.value}</strong>
                <span>{kpi.label}</span>
              </article>
            ))}
          </div>

          <section className="admin-card admin-report-trend-card">
            <div className="admin-report-chart-header">
              <div>
                <h3>Revenue Overview</h3>
                <p>{formatPaymentAmount({ amount: revenueTrend.yearlyTotal })} collected in {selectedYear}</p>
              </div>
              <label className="admin-report-year-select">
                <span>Year range</span>
                <select
                  onChange={(event) => setSelectedYear(Number(event.target.value))}
                  value={selectedYear}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="admin-report-revenue-bars" aria-label={`Monthly revenue for ${selectedYear}`}>
              {revenueTrend.bars.map((bar) => (
                <div className="admin-report-revenue-item" key={bar.month}>
                  <b title={formatPaymentAmount({ amount: bar.total })}>{bar.label}</b>
                  <span className="admin-report-revenue-track">
                    <span className="admin-report-revenue-fill" style={{ height: bar.height }}></span>
                  </span>
                  <small>{bar.month}</small>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
