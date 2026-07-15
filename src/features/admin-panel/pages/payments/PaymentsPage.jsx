import { useEffect, useState } from "react";
import { getPayments } from "../../../../shared/api";
import { filterPayments, filterPaymentsByMethod, formatPaymentAmount, formatPaymentDate, getPaymentAmountValue, getPaymentDetail, getPaymentStats } from "../../adminPanelUtils";
import "./PaymentsPage.css";

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [status, setStatus] = useState("loading");
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");
  const methodFilteredPayments = filterPaymentsByMethod(payments, methodFilter);
  const visiblePayments = filterPayments(methodFilteredPayments, searchTerm);
  const paymentStats = getPaymentStats(payments);
  const paidPayments = payments.filter((payment) => payment.status === "Paid");
  const paidTotal = paidPayments.reduce((total, payment) => total + getPaymentAmountValue(payment), 0);
  const paymentMethods = payments.reduce((methods, payment) => ({
    ...methods,
    [payment.method]: (methods[payment.method] || 0) + 1,
  }), {});

  useEffect(() => {
    let isCurrent = true;

    async function loadPaymentsData() {
      try {
        const nextPayments = await getPayments();

        if (isCurrent) {
          setPayments(nextPayments);
          setStatus("ready");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setPayments([]);
          setStatus("error");
        }
      }
    }

    loadPaymentsData();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <section className="admin-content admin-payments-page" id="payments">
      <header className="admin-header">
        <div>
          <h2>Payments</h2>
          <p>Track Stripe payment intents, payment methods, paid revenue, and failed payment follow-ups.</p>
        </div>

        <div className="admin-header-actions">
          <label className="admin-search">
            <span className="sr-only">Search payments</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search payments..."
              type="search"
              value={searchTerm}
            />
          </label>
        </div>
      </header>

      {status === "loading" && (
        <p className="admin-state-message">Loading payments from Stripe...</p>
      )}

      {status === "error" && (
        <p className="admin-state-message error">Stripe payments are unavailable. Check STRIPE_SECRET_KEY and the API server.</p>
      )}

      {status === "ready" && payments.length === 0 && (
        <p className="admin-state-message">No Stripe payment records are available yet.</p>
      )}

      {status === "ready" && payments.length > 0 && (
        <>
          <div className="admin-kpi-grid admin-payment-kpi-grid">
            {paymentStats.map((stat) => (
              <article className="admin-kpi-card" key={stat.label}>
                <span className={`admin-kpi-icon ${stat.tone}`}></span>
                <div className="admin-kpi-copy">
                  <h3>{stat.label}</h3>
                  <p>{stat.note}</p>
                </div>
                <strong className={stat.tone}>{stat.value}</strong>
              </article>
            ))}
          </div>

          <div className="admin-payments-management-grid">
            <section className="admin-card admin-payment-directory-card">
              <div className="admin-card-header admin-table-header">
                <h3>Payment Records</h3>
                <div className="admin-filter-tabs" aria-label="Filter payments">
                  {["All", "Credit Card", "PromptPay QR"].map((filter) => (
                    <button
                      className={methodFilter === filter ? "active" : ""}
                      key={filter}
                      onClick={() => setMethodFilter(filter)}
                      type="button"
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-payment-table">
                <div className="admin-payment-table-head">
                  <span>Invoice</span>
                  <span>Member</span>
                  <span>Plan</span>
                  <span>Amount</span>
                  <span>Method</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>

                {visiblePayments.map((payment) => (
                  <div className="admin-payment-table-row" key={payment.invoice}>
                    <div className="admin-table-payment">
                      <span className={payment.status === "Paid" ? "admin-payment-mark paid" : "admin-payment-mark"}></span>
                      <div>
                        <strong>{payment.invoice}</strong>
                        <small>{formatPaymentDate(payment.date)}</small>
                      </div>
                    </div>
                    <span>{payment.member}</span>
                    <span>{payment.plan}</span>
                    <b>{formatPaymentAmount(payment)}</b>
                    <span className="admin-payment-method">
                      {payment.method}
                      <small>{getPaymentDetail(payment)}</small>
                    </span>
                    <span className={`admin-status-pill ${payment.status.toLowerCase()}`}>{payment.status}</span>
                    <button className="admin-row-action" type="button">View</button>
                  </div>
                ))}

                {visiblePayments.length === 0 && (
                  <p className="admin-empty-row">No payments match your search.</p>
                )}
              </div>
            </section>

            <aside className="admin-payments-side">
              <section className="admin-card admin-payment-summary-card">
                <h3>Revenue Summary</h3>
                <div className="admin-payment-total">
                  <span>Collected</span>
                  <strong>{paidTotal.toLocaleString()}฿</strong>
                  <p>{paidPayments.length} paid invoices this period</p>
                </div>
              </section>

              <section className="admin-card admin-payment-method-card">
                <h3>Payment Methods</h3>
                <div className="admin-plan-list">
                  {Object.entries(paymentMethods).map(([method, count]) => (
                    <div className="admin-plan-row" key={method}>
                      <span className="admin-class-dot blue"></span>
                      <strong>{method}</strong>
                      <b>{count}</b>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
