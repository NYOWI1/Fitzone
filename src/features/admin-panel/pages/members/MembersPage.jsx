import { useEffect, useState } from "react";
import { getMembers, updateMemberAttendance } from "../../../../shared/api";
import { filterMembers, filterMembersByStatus, formatPaymentDate, getMemberActivity, getMemberPlanBreakdown, getMemberStats, getTodayIsoDate } from "../../adminPanelUtils";
import "./MembersPage.css";

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [attendanceForm, setAttendanceForm] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState("idle");
  const [attendanceError, setAttendanceError] = useState("");
  const statusFilteredMembers = filterMembersByStatus(members, statusFilter);
  const visibleMembers = filterMembers(statusFilteredMembers, searchTerm);
  const databaseMemberStats = getMemberStats(members);
  const databasePlanBreakdown = getMemberPlanBreakdown(members);
  const databaseMemberActivity = getMemberActivity(members);

  useEffect(() => {
    let isCurrent = true;

    async function loadMembersData() {
      try {
        const nextMembers = await getMembers();

        if (isCurrent) {
          setMembers(nextMembers);
          setStatus("ready");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setMembers([]);
          setStatus("error");
        }
      }
    }

    loadMembersData();

    return () => {
      isCurrent = false;
    };
  }, []);

  const openAttendanceForm = (member) => {
    const today = getTodayIsoDate();
    const todayVisits = member.attendanceDate === today ? Number(member.todayVisits || 0) : 0;

    setAttendanceError("");
    setAttendanceStatus("idle");
    setAttendanceForm({
      member,
      attendanceValue: todayVisits > 0 ? "present" : "absent",
      attendanceDate: today,
    });
  };

  const closeAttendanceForm = () => {
    if (attendanceStatus === "saving") {
      return;
    }

    setAttendanceForm(null);
    setAttendanceError("");
  };

  const setAttendanceValue = (value) => {
    setAttendanceForm((currentForm) => currentForm ? {
      ...currentForm,
      attendanceValue: value,
    } : currentForm);
  };

  const saveAttendanceForm = async (event) => {
    event.preventDefault();

    if (!attendanceForm) {
      return;
    }

    const memberId = attendanceForm.member.memberId || attendanceForm.member.clerkUserId;
    const todayVisits = attendanceForm.attendanceValue === "present" ? 1 : 0;
    const currentTotalVisits = Number(attendanceForm.member.visits) || 0;
    const previousTodayVisits = attendanceForm.member.attendanceDate === attendanceForm.attendanceDate
      ? Number(attendanceForm.member.todayVisits || 0)
      : 0;
    const visits = Math.max(0, currentTotalVisits - previousTodayVisits + todayVisits);

    if (!memberId || !["present", "absent"].includes(attendanceForm.attendanceValue)) {
      setAttendanceError("Choose present or absent.");
      return;
    }

    try {
      setAttendanceStatus("saving");
      setAttendanceError("");

      const updatedAttendance = await updateMemberAttendance({
        memberId,
        visits,
        todayVisits,
        attendanceDate: attendanceForm.attendanceDate,
      });

      setMembers((currentMembers) => currentMembers.map((member) => (
        (member.memberId || member.clerkUserId) === memberId
          ? {
            ...member,
            visits: updatedAttendance.visits ?? visits,
            todayVisits: updatedAttendance.todayVisits ?? todayVisits,
            attendanceDate: updatedAttendance.attendanceDate ?? attendanceForm.attendanceDate,
          }
          : member
      )));
      setAttendanceForm(null);
      setAttendanceStatus("idle");
    } catch (error) {
      console.error(error);
      setAttendanceStatus("idle");
      setAttendanceError(error.message || "Unable to update attendance.");
    }
  };

  return (
    <section className="admin-content admin-members-page" id="members">
      <header className="admin-header">
        <div>
          <h2>Members</h2>
          <p>Review Clerk member accounts with Stripe payment status, plan renewals, and activity.</p>
        </div>

        <div className="admin-header-actions">
          <label className="admin-search">
            <span className="sr-only">Search members</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search members..."
              type="search"
              value={searchTerm}
            />
          </label>
        </div>
      </header>

      {status === "loading" && (
        <p className="admin-state-message">Loading members from Clerk...</p>
      )}

      {status === "error" && (
        <p className="admin-state-message error">Members are unavailable. Check CLERK_SECRET_KEY and the API server.</p>
      )}

      {status === "ready" && members.length === 0 && (
        <p className="admin-state-message">No Clerk members are available in the current workspace.</p>
      )}

      {status === "ready" && members.length > 0 && (
        <>
          <div className="admin-kpi-grid admin-member-kpi-grid">
            {databaseMemberStats.map((stat) => (
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

          <div className="admin-members-management-grid">
            <section className="admin-card admin-members-table-card">
              <div className="admin-card-header admin-table-header">
                <h3>Member Directory</h3>
                <div className="admin-filter-tabs" aria-label="Filter members">
                  {["All", "Active", "Pending", "Expired", "Expiring"].map((filter) => (
                    <button
                      className={statusFilter === filter ? "active" : ""}
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      type="button"
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-member-table">
                <div className="admin-member-table-head">
                  <span>Member</span>
                  <span>Plan</span>
                  <span>Status</span>
                  <span>Renewal</span>
                  <span>Visits</span>
                  <span>Attendance</span>
                </div>

                {visibleMembers.map((member) => (
                  <div className="admin-member-table-row" key={member.memberId || member.email}>
                    <div className="admin-table-member">
                      <span className={`admin-member-avatar ${member.tone || "blue"}`}></span>
                      <div>
                        <strong>{member.name}</strong>
                        <small>{member.email}</small>
                      </div>
                    </div>
                    <span>{member.plan}</span>
                    <span className={`admin-status-pill ${member.status.toLowerCase()}`}>{member.status}</span>
                    <time>{formatPaymentDate(member.renewal)}</time>
                    <b>{member.visits}</b>
                    <button onClick={() => openAttendanceForm(member)} type="button">Edit</button>
                  </div>
                ))}

                {visibleMembers.length === 0 && (
                  <p className="admin-empty-row">No members match your filters.</p>
                )}
              </div>
            </section>

            <aside className="admin-members-side">
              <section className="admin-card admin-plan-card">
                <h3>Plan Breakdown</h3>
                <div className="admin-plan-list">
                  {databasePlanBreakdown.map(([plan, count, tone]) => (
                    <div className="admin-plan-row" key={plan}>
                      <span className={`admin-class-dot ${tone}`}></span>
                      <strong>{plan}</strong>
                      <b>{count}</b>
                    </div>
                  ))}
                </div>
              </section>

              <section className="admin-card admin-activity-card">
                <h3>Member Activity</h3>
                <div className="admin-activity-list">
                  {databaseMemberActivity.map(([label, value]) => (
                    <div className="admin-activity-row" key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}

      {attendanceForm && (
        <div className="admin-modal-backdrop" role="presentation">
          <form className="admin-class-form admin-attendance-form" onSubmit={saveAttendanceForm}>
            <div className="admin-form-header">
              <div>
                <h3>Edit Attendance</h3>
                <p>Manually correct check-ins for {attendanceForm.member.name}.</p>
              </div>
              <button aria-label="Close attendance form" onClick={closeAttendanceForm} type="button">×</button>
            </div>

            <div className="admin-attendance-member">
              <span className={`admin-member-avatar ${attendanceForm.member.tone || "blue"}`}></span>
              <div>
                <strong>{attendanceForm.member.name}</strong>
                <small>{attendanceForm.member.email}</small>
              </div>
            </div>

            <div className="admin-attendance-controls">
              <span>Today attendance</span>
              <div className="admin-attendance-choice-group" role="group" aria-label="Today attendance">
                <button
                  className={attendanceForm.attendanceValue === "present" ? "active present" : ""}
                  onClick={() => setAttendanceValue("present")}
                  type="button"
                >
                  Present
                </button>
                <button
                  className={attendanceForm.attendanceValue === "absent" ? "active absent" : ""}
                  onClick={() => setAttendanceValue("absent")}
                  type="button"
                >
                  Absent
                </button>
              </div>
            </div>

            {attendanceError && <p className="admin-form-error">{attendanceError}</p>}

            <div className="admin-form-actions">
              <button disabled={attendanceStatus === "saving"} onClick={closeAttendanceForm} type="button">Cancel</button>
              <button className="primary" disabled={attendanceStatus === "saving"} type="submit">
                {attendanceStatus === "saving" ? "Saving..." : "Save Attendance"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
