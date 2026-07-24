import { useEffect, useState } from "react";
import {
  getClassSchedule,
  getMembers,
  getPayments,
  getStripeRevenueOverview,
} from "../../../../shared/api";
import {
  formatPaymentAmount,
  getReportYearOptions,
  getReportsKpis,
  getReportsYearRevenue,
} from "../../adminPanelUtils";

const reportToneClasses = {
  blue: "text-[#4da3ff]",
  green: "text-[#39e600]",
  red: "text-[#d90429]",
  yellow: "text-[#ffd54f]",
};
const reportChartWidth = 760;
const reportChartHeight = 240;
const reportChartBaseline = 184;
const reportChartTop = 30;
const reportChartLeft = 46;
const reportChartRight = 26;
const reportLineColors = ["#4da3ff", "#ffd54f", "#39e600", "#d90429"];
const attendanceLineColors = ["#39e600", "#ffd54f", "#4da3ff", "#d90429"];
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  label: new Date(new Date().getFullYear(), index, 1).toLocaleString("en-US", {
    month: "long",
  }),
  shortLabel: new Date(new Date().getFullYear(), index, 1).toLocaleString(
    "en-US",
    {
      month: "short",
    },
  ),
  value: index,
}));
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDateParts(dateValue) {
  const [year, month, day] = String(dateValue || "")
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return { day, month: month - 1, year };
}

function getMemberRecordedCheckIns(member) {
  return Math.max(Number(member.todayVisits || 0), 0);
}

function getMemberAttendanceRecords(member) {
  if (Array.isArray(member.attendanceHistory) && member.attendanceHistory.length) {
    return member.attendanceHistory
      .map((record) => ({
        attendanceDate: record.attendanceDate,
        visits: Math.max(Number(record.visits || 0), 0),
      }))
      .filter((record) => record.attendanceDate && record.visits > 0);
  }

  if (!member.attendanceDate) {
    return [];
  }

  const visits = getMemberRecordedCheckIns(member);

  return visits > 0
    ? [
        {
          attendanceDate: member.attendanceDate,
          visits,
        },
      ]
    : [];
}

function getLineChartData(yearTrends, lineColors = reportLineColors) {
  const maxTotal = Math.max(
    ...yearTrends.flatMap((trend) =>
      trend.bars.map((bar) => Number(bar.total || 0)),
    ),
    1,
  );
  const chartWidth = reportChartWidth - reportChartLeft - reportChartRight;
  const chartHeight = reportChartBaseline - reportChartTop;
  const monthLabels = yearTrends[0]?.bars || [];
  const divisor = Math.max(monthLabels.length - 1, 1);
  const series = yearTrends.map((trend, seriesIndex) => {
    const points = trend.bars.map((bar, index) => {
      const x = reportChartLeft + (chartWidth / divisor) * index;
      const y =
        reportChartBaseline -
        (Number(bar.total || 0) / maxTotal) * chartHeight;

      return {
        ...bar,
        x,
        y,
      };
    });
    const linePath = points
      .map(
        (point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
      )
      .join(" ");

    return {
      ...trend,
      color: lineColors[seriesIndex % lineColors.length],
      linePath,
      points,
    };
  });

  return { monthLabels, series };
}

function getMonthlyAttendanceReport({ members, selectedYears }) {
  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Date(new Date().getFullYear(), index, 1).toLocaleString("en-US", {
      month: "short",
    }),
  );

  return selectedYears.map((year) => {
    const totals = Array(12).fill(0);

    members.forEach((member) => {
      getMemberAttendanceRecords(member).forEach((record) => {
        const attendanceDate = new Date(record.attendanceDate);

        if (attendanceDate.getFullYear() === Number(year)) {
          totals[attendanceDate.getMonth()] += record.visits;
        }
      });
    });

    const yearlyTotal = totals.reduce((total, value) => total + value, 0);

    return {
      year,
      yearlyTotal,
      bars: monthNames.map((month, index) => ({
        month,
        total: totals[index],
        label: String(totals[index]),
      })),
    };
  });
}

function getAttendanceCalendarDays({ members, selectedMonth, selectedYear }) {
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstWeekday = new Date(selectedYear, selectedMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const memberVisits = members.flatMap((member) =>
      getMemberAttendanceRecords(member)
        .filter((record) => {
          const attendanceDate = getDateParts(record.attendanceDate);

          return (
            attendanceDate &&
            attendanceDate.year === Number(selectedYear) &&
            attendanceDate.month === Number(selectedMonth) &&
            attendanceDate.day === day
          );
        })
        .map((record) => ({
          id: `${member.memberId || member.clerkUserId || member.email}-${record.attendanceDate}`,
          name: member.name || "Unnamed member",
          visits: record.visits,
        })),
    );
    const totalVisits = memberVisits.reduce(
      (total, member) => total + member.visits,
      0,
    );

    return {
      day,
      memberVisits,
      totalVisits,
    };
  });

  return [
    ...Array.from({ length: firstWeekday }, (_, index) => ({
      day: `empty-${index}`,
      isEmpty: true,
    })),
    ...days,
  ];
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState({
    members: [],
    schedule: [],
    payments: [],
    stripeRevenue: {},
  });
  const [selectedYears, setSelectedYears] = useState(() => [
    new Date().getFullYear(),
  ]);
  const [selectedAttendanceMonth, setSelectedAttendanceMonth] = useState(() =>
    new Date().getMonth(),
  );
  const [selectedAttendanceYear, setSelectedAttendanceYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [selectedAttendanceDay, setSelectedAttendanceDay] = useState(() =>
    new Date().getDate(),
  );
  const [status, setStatus] = useState("loading");
  const reportKpis = getReportsKpis(reportData);
  const yearOptions = getReportYearOptions(reportData.payments);
  const selectedYearTrends = selectedYears.map((year) => ({
    year,
    ...getReportsYearRevenue({
      payments: reportData.payments,
      stripeRevenue: reportData.stripeRevenue,
      selectedYear: year,
    }),
  }));
  const selectedYearsTotal = selectedYearTrends.reduce(
    (total, trend) => total + trend.yearlyTotal,
    0,
  );
  const reportChart = getLineChartData(selectedYearTrends);
  const attendanceTrends = getMonthlyAttendanceReport({
    members: reportData.members,
    selectedYears,
  });
  const attendanceTotal = attendanceTrends.reduce(
    (total, trend) => total + trend.yearlyTotal,
    0,
  );
  const attendanceChart = getLineChartData(
    attendanceTrends,
    attendanceLineColors,
  );
  const attendanceCalendarDays = getAttendanceCalendarDays({
    members: reportData.members,
    selectedMonth: selectedAttendanceMonth,
    selectedYear: selectedAttendanceYear,
  });
  const attendanceCalendarTotal = attendanceCalendarDays.reduce(
    (total, day) => total + Number(day.totalVisits || 0),
    0,
  );
  const selectedAttendanceDate =
    attendanceCalendarDays.find((day) => day.day === selectedAttendanceDay) ||
    attendanceCalendarDays.find((day) => !day.isEmpty && day.totalVisits > 0) ||
    attendanceCalendarDays.find((day) => !day.isEmpty);

  const toggleSelectedYear = (year) => {
    setSelectedYears((currentYears) => {
      if (currentYears.includes(year)) {
        return currentYears.length === 1
          ? currentYears
          : currentYears.filter((currentYear) => currentYear !== year);
      }

      return yearOptions.filter((yearOption) =>
        [...currentYears, year].includes(yearOption),
      );
    });
  };

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
    <section
      className="admin-content min-h-[calc(100vh_-_64px)] overflow-visible pb-5"
      id="reports"
    >
      <header className="admin-header mb-[clamp(28px,5vh,44px)] flex-none">
        <div>
          <h2 className="text-[clamp(34px,3.3vw,44px)]">Reports & Analytics</h2>
          <p>Review gym performance, attendance, revenue, and class demand.</p>
        </div>
      </header>

      {status === "loading" && (
        <p className="admin-state-message">
          Loading reports from live data sources...
        </p>
      )}

      {status === "error" && (
        <p className="admin-state-message error">
          Reports are unavailable. Check the API server, Clerk, Stripe, and
          database settings.
        </p>
      )}

      {status === "ready" && (
        <>
          <div className="mb-[clamp(34px,5.5vh,50px)] grid flex-none grid-cols-4 gap-x-8 gap-y-7 max-[1360px]:grid-cols-2 max-[680px]:grid-cols-1">
            {reportKpis.map((kpi) => (
              <article
                className="grid min-h-[116px] gap-3 rounded-[22px] border border-[#393939] bg-[#242424] px-6 py-7 shadow-[0_16px_32px_rgba(0,0,0,0.28)]"
                key={kpi.label}
              >
                <strong
                  className={`block text-[clamp(28px,2.6vw,34px)] leading-none ${reportToneClasses[kpi.tone] || reportToneClasses.blue}`}
                >
                  {kpi.value}
                </strong>
                <span className="text-sm font-extrabold text-white">
                  {kpi.label}
                </span>
              </article>
            ))}
          </div>

          <section className="admin-card mb-6 flex min-h-0 flex-col p-0">
            <div className="flex items-center justify-between gap-5 border-b border-[#393939] px-7 pb-3 pt-[26px] max-[680px]:items-stretch max-[680px]:flex-col">
              <div>
                <h3 className="mb-2 text-3xl leading-none">Revenue Overview</h3>
                <p className="m-0 text-[13px] text-[#b8b8b8]">
                  {formatPaymentAmount({ amount: selectedYearsTotal })}{" "}
                  collected across selected years
                </p>
              </div>
              <div className="grid gap-[7px]">
                <span className="text-[11px] font-black uppercase text-[#b8b8b8]">
                  Compare years
                </span>
                <div className="flex max-w-[420px] flex-wrap gap-2">
                  {yearOptions.map((year) => (
                    <button
                      className={
                        selectedYears.includes(year)
                          ? "min-h-[34px] rounded-[11px] border border-[#4da3ff] bg-[rgba(77,163,255,0.14)] px-3 text-xs font-black text-white"
                          : "min-h-[34px] rounded-[11px] border border-[#393939] bg-[#2b2b2b] px-3 text-xs font-black text-[#b8b8b8]"
                      }
                      key={year}
                      onClick={() => toggleSelectedYear(year)}
                      type="button"
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-h-0 overflow-x-auto px-7 pb-6 pt-5 max-[680px]:px-5">
              <div className="mb-4 flex flex-wrap gap-3">
                {reportChart.series.map((series) => (
                  <span
                    className="inline-flex items-center gap-2 rounded-full border border-[#393939] bg-[#202020] px-3 py-1.5 text-xs font-black text-white"
                    key={series.year}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: series.color }}
                    ></span>
                    {series.year}
                    <small className="text-[11px] text-[#b8b8b8]">
                      {formatPaymentAmount({ amount: series.yearlyTotal })}
                    </small>
                  </span>
                ))}
              </div>

              <svg
                aria-label="Monthly revenue comparison by selected years"
                className="block h-[240px] w-full min-w-[680px] rounded-[18px] border border-[#393939] bg-[#1b1b1b] px-2"
                role="img"
                viewBox={`0 0 ${reportChartWidth} ${reportChartHeight}`}
              >
                {[0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y =
                    reportChartBaseline -
                    (reportChartBaseline - reportChartTop) * ratio;

                  return (
                    <line
                      key={ratio}
                      x1={reportChartLeft}
                      x2={reportChartWidth - reportChartRight}
                      y1={y}
                      y2={y}
                      stroke="#303030"
                      strokeWidth="1"
                    />
                  );
                })}

                {reportChart.series.map((series) => (
                  <g key={series.year}>
                    <path
                      d={series.linePath}
                      fill="none"
                      stroke={series.color}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="4"
                    />
                    {series.points.map((point) => (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        fill="#1b1b1b"
                        key={`${series.year}-${point.month}`}
                        r="6"
                        stroke={series.color}
                        strokeWidth="3"
                      />
                    ))}
                  </g>
                ))}

                {reportChart.monthLabels.map((bar, index) => (
                  <text
                    fill="#b8b8b8"
                    fontSize="12"
                    fontWeight="700"
                    key={bar.month}
                    textAnchor="middle"
                    x={
                      reportChartLeft +
                      ((reportChartWidth - reportChartLeft - reportChartRight) /
                        Math.max(reportChart.monthLabels.length - 1, 1)) *
                        index
                    }
                    y="218"
                  >
                    {bar.month}
                  </text>
                ))}
              </svg>

            </div>
          </section>

          <section className="admin-card flex min-h-0 flex-col p-0">
            <div className="flex items-center justify-between gap-5 border-b border-[#393939] px-7 pb-3 pt-[26px] max-[680px]:items-stretch max-[680px]:flex-col">
              <div>
                <h3 className="mb-2 text-3xl leading-none">
                  Monthly Attendance
                </h3>
                <p className="m-0 text-[13px] text-[#b8b8b8]">
                  {attendanceTotal} recorded check-ins across selected years
                </p>
              </div>
              <span className="rounded-[14px] border border-[rgba(57,230,0,0.25)] bg-[rgba(57,230,0,0.1)] px-4 py-2 text-sm font-black text-[#39e600]">
                Attendance report
              </span>
            </div>

            <div className="min-h-0 overflow-x-auto px-7 pb-[34px] pt-5 max-[680px]:px-5">
              <div className="mb-4 flex flex-wrap gap-3">
                {attendanceChart.series.map((series) => (
                  <span
                    className="inline-flex items-center gap-2 rounded-full border border-[#393939] bg-[#202020] px-3 py-1.5 text-xs font-black text-white"
                    key={series.year}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: series.color }}
                    ></span>
                    {series.year}
                    <small className="text-[11px] text-[#b8b8b8]">
                      {series.yearlyTotal} check-ins
                    </small>
                  </span>
                ))}
              </div>

              <div className="rounded-[18px] border border-[#393939] bg-[#1b1b1b] p-4">
                <div className="mb-4 flex items-center justify-between gap-4 max-[680px]:items-stretch max-[680px]:flex-col">
                  <div>
                    <h4 className="m-0 text-xl leading-none">
                      Daily Check-ins
                    </h4>
                    <p className="mb-0 mt-2 text-xs font-bold text-[#b8b8b8]">
                      {attendanceCalendarTotal} check-ins in{" "}
                      {monthOptions[selectedAttendanceMonth].label}{" "}
                      {selectedAttendanceYear}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="min-h-[38px] rounded-[11px] border border-[#393939] bg-[#2b2b2b] px-3 text-xs font-black text-white outline-none focus:border-[#39e600]"
                      onChange={(event) =>
                        setSelectedAttendanceMonth(Number(event.target.value))
                      }
                      value={selectedAttendanceMonth}
                    >
                      {monthOptions.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="min-h-[38px] rounded-[11px] border border-[#393939] bg-[#2b2b2b] px-3 text-xs font-black text-white outline-none focus:border-[#39e600]"
                      onChange={(event) =>
                        setSelectedAttendanceYear(Number(event.target.value))
                      }
                      value={selectedAttendanceYear}
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 [grid-template-columns:minmax(0,1fr)_minmax(220px,0.38fr)] max-[980px]:grid-cols-1">
                  <div>
                    <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-black uppercase text-[#b8b8b8] max-[680px]:gap-1.5">
                      {weekdayLabels.map((weekday) => (
                        <span key={weekday}>{weekday}</span>
                      ))}
                    </div>

                    <div className="mt-2 grid grid-cols-7 gap-2 max-[680px]:gap-1.5">
                      {attendanceCalendarDays.map((day) =>
                        day.isEmpty ? (
                          <div
                            className="min-h-[78px] rounded-[14px] border border-transparent max-[680px]:min-h-[58px]"
                            key={day.day}
                          ></div>
                        ) : (
                          <button
                            className={
                              selectedAttendanceDate?.day === day.day
                                ? "min-h-[78px] cursor-pointer rounded-[14px] border border-[#39e600] bg-[rgba(57,230,0,0.16)] p-2.5 text-left outline-none ring-1 ring-[rgba(57,230,0,0.2)] max-[680px]:min-h-[58px] max-[680px]:p-2"
                                : day.totalVisits
                                  ? "min-h-[78px] cursor-pointer rounded-[14px] border border-[rgba(57,230,0,0.34)] bg-[rgba(57,230,0,0.08)] p-2.5 text-left outline-none transition hover:border-[#39e600] max-[680px]:min-h-[58px] max-[680px]:p-2"
                                  : "min-h-[78px] cursor-pointer rounded-[14px] border border-[#303030] bg-[#202020] p-2.5 text-left outline-none transition hover:border-[#555] max-[680px]:min-h-[58px] max-[680px]:p-2"
                            }
                            key={day.day}
                            onClick={() => setSelectedAttendanceDay(day.day)}
                            type="button"
                          >
                            <span className="mb-2 flex items-center justify-between gap-2">
                              <strong className="text-sm text-white">
                                {day.day}
                              </strong>
                              {day.totalVisits > 0 && (
                                <span className="rounded-full bg-[#39e600] px-2 py-1 text-[10px] font-black text-[#111]">
                                  {day.totalVisits}
                                </span>
                              )}
                            </span>
                            <span className="block text-[11px] font-bold text-[#b8b8b8]">
                              {day.totalVisits
                                ? `${day.memberVisits.length} member${day.memberVisits.length === 1 ? "" : "s"}`
                                : "No check-ins"}
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <aside className="min-h-[300px] rounded-[16px] border border-[#303030] bg-[#202020] p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h5 className="m-0 text-base leading-none text-white">
                          {monthOptions[selectedAttendanceMonth].shortLabel}{" "}
                          {selectedAttendanceDate?.day}
                        </h5>
                        <p className="mb-0 mt-2 text-[11px] font-bold text-[#b8b8b8]">
                          {selectedAttendanceDate?.totalVisits || 0} check-ins
                        </p>
                      </div>
                      <span className="rounded-full bg-[#39e600] px-2.5 py-1 text-[10px] font-black text-[#111]">
                        {selectedAttendanceDate?.memberVisits.length || 0}
                      </span>
                    </div>

                    <div className="grid max-h-[248px] gap-2 overflow-y-auto pr-1">
                      {selectedAttendanceDate?.memberVisits.length ? (
                        selectedAttendanceDate.memberVisits.map((member) => (
                          <div
                            className="rounded-[12px] border border-[#393939] bg-[#242424] px-3 py-2"
                            key={member.id}
                          >
                            <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-white">
                              {member.name}
                            </strong>
                            <span className="mt-1 block text-[11px] font-bold text-[#b8b8b8]">
                              {member.visits} check-in
                              {member.visits === 1 ? "" : "s"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="m-0 rounded-[12px] border border-[#303030] bg-[#242424] px-3 py-4 text-xs font-bold text-[#b8b8b8]">
                          No members checked in on this date.
                        </p>
                      )}
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
