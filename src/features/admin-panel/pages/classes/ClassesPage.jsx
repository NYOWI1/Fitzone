import { useEffect, useState } from "react";
import { addClassScheduleItem, getClassSchedule, getTrainers, updateClassScheduleItem } from "../../../../shared/api";
import { classCategories, classColors, filterVisibleClasses, getClassCount, getClassesStats, getEmptyClassForm, getScheduleClassesForPeriod, getTrainerName, periodFilters } from "../../adminPanelUtils";
import "./ClassesPage.css";

export default function ClassesPage() {
  const [schedule, setSchedule] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [activeDay, setActiveDay] = useState(() => new Date().getDay());
  const [activePeriod, setActivePeriod] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [classForm, setClassForm] = useState(null);
  const [formStatus, setFormStatus] = useState("idle");
  const [formError, setFormError] = useState("");
  const currentDaySchedule = schedule.find((daySchedule) => daySchedule.weekday === activeDay);
  const visibleClasses = getScheduleClassesForPeriod(currentDaySchedule, activePeriod);
  const searchedClasses = filterVisibleClasses(visibleClasses, trainers, searchTerm);
  const classesStats = getClassesStats(schedule);
  const visibleCategoryCounts = visibleClasses.reduce((categories, classItem) => {
    const category = classItem.category || "Uncategorized";

    return {
      ...categories,
      [category]: (categories[category] || 0) + 1,
    };
  }, {});

  useEffect(() => {
    let isCurrent = true;

    async function loadClassesPageData() {
      try {
        const [nextSchedule, nextTrainers] = await Promise.all([
          getClassSchedule(),
          getTrainers(),
        ]);

        if (isCurrent) {
          setSchedule(nextSchedule);
          setTrainers(nextTrainers);
          setStatus("ready");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setSchedule([]);
          setTrainers([]);
          setStatus("error");
        }
      }
    }

    loadClassesPageData();

    return () => {
      isCurrent = false;
    };
  }, []);

  const openAddClassForm = () => {
    setFormError("");
    setClassForm({
      mode: "add",
      values: getEmptyClassForm(activeDay),
    });
  };

  const openEditClassForm = (classItem) => {
    setFormError("");
    setClassForm({
      mode: "edit",
      original: {
        weekday: activeDay,
        period: classItem.periodKey,
        index: classItem.periodIndex,
      },
      values: {
        weekday: activeDay,
        period: classItem.periodKey,
        name: classItem.name,
        time: classItem.time,
        duration: classItem.duration,
        trainerIndex: classItem.trainerIndex ?? 0,
        category: classItem.category,
        color: classItem.color || "gray",
      },
    });
  };

  const updateClassFormValue = (field, value) => {
    setClassForm((currentForm) => ({
      ...currentForm,
      values: {
        ...currentForm.values,
        [field]: value,
      },
    }));
  };

  const closeClassForm = () => {
    if (formStatus === "saving") {
      return;
    }

    setClassForm(null);
    setFormError("");
  };

  const saveClassForm = async (event) => {
    event.preventDefault();

    if (!classForm) {
      return;
    }

    const values = classForm.values;
    const classItem = {
      name: values.name,
      time: values.time,
      duration: values.duration,
      trainerIndex: Number(values.trainerIndex),
      category: values.category,
      color: values.color,
    };
    const payload = {
      weekday: Number(values.weekday),
      period: values.period,
      classItem,
    };

    try {
      setFormStatus("saving");
      setFormError("");

      const nextSchedule = classForm.mode === "edit"
        ? await updateClassScheduleItem({
          ...payload,
          weekday: classForm.original.weekday,
          period: classForm.original.period,
          index: classForm.original.index,
        })
        : await addClassScheduleItem(payload);

      setSchedule(nextSchedule);
      setActiveDay(Number(values.weekday));
      setActivePeriod(values.period === "morning" ? "Morning" : "Evening");
      setClassForm(null);
    } catch (error) {
      console.error(error);
      setFormError(classForm.mode === "edit" ? "Unable to update this class." : "Unable to add this class.");
    } finally {
      setFormStatus("idle");
    }
  };

  return (
    <section className="admin-content admin-classes-page" id="classes">
      <header className="admin-header">
        <div>
          <h2>Classes</h2>
          <p>Manage the weekly class schedule using the live class schedule database.</p>
        </div>

        <div className="admin-header-actions">
          <label className="admin-search">
            <span className="sr-only">Search classes</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search classes..."
              type="search"
              value={searchTerm}
            />
          </label>
          <button className="admin-add-button" onClick={openAddClassForm} type="button">+ Add Class</button>
        </div>
      </header>

      {status === "loading" && (
        <p className="admin-state-message">Loading class schedule from database...</p>
      )}

      {status === "error" && (
        <p className="admin-state-message error">Class schedule is unavailable. Start the API server and try again.</p>
      )}

      {status === "ready" && schedule.length === 0 && (
        <p className="admin-state-message">No classes are available in the current database.</p>
      )}

      {status === "ready" && schedule.length > 0 && (
        <>
          <div className="admin-kpi-grid admin-class-kpi-grid">
            {classesStats.map((stat) => (
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

          <div className="admin-classes-management-grid">
            <section className="admin-card admin-class-schedule-card">
              <div className="admin-card-header admin-table-header">
                <h3>{currentDaySchedule?.dayName || "Classes"} Schedule</h3>
                <div className="admin-filter-tabs" aria-label="Filter class period">
                  {periodFilters.map((period) => (
                    <button
                      className={period === activePeriod ? "active" : ""}
                      key={period}
                      onClick={() => setActivePeriod(period)}
                      type="button"
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-day-tabs" aria-label="Select schedule day">
                {schedule.map((daySchedule) => (
                  <button
                    className={daySchedule.weekday === activeDay ? "active" : ""}
                    key={daySchedule.weekday}
                    onClick={() => setActiveDay(daySchedule.weekday)}
                    type="button"
                  >
                    <strong>{daySchedule.dayName.slice(0, 3)}</strong>
                    <span>{getClassCount(daySchedule)} classes</span>
                  </button>
                ))}
              </div>

              <div className="admin-class-table">
                <div className="admin-class-table-head">
                  <span>Class</span>
                  <span>Time</span>
                  <span>Duration</span>
                  <span>Trainer</span>
                  <span>Category</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>

                {searchedClasses.map((classItem, index) => (
                  <div className="admin-class-table-row" key={`${classItem.name}-${classItem.time}-${index}`}>
                    <div className="admin-table-class">
                      <span className={`admin-class-color ${classItem.color || "gray"}`}></span>
                      <div>
                        <strong>{classItem.name}</strong>
                        <small>{classItem.period}</small>
                      </div>
                    </div>
                    <time>{classItem.time}</time>
                    <span>{classItem.duration}</span>
                    <span>{getTrainerName(trainers, classItem.trainerIndex ?? index)}</span>
                    <span className="admin-category-pill">{classItem.category}</span>
                    <span className="admin-status-pill active">Active</span>
                    <button className="admin-row-action" onClick={() => openEditClassForm(classItem)} type="button">Edit</button>
                  </div>
                ))}

                {searchedClasses.length === 0 && (
                  <p className="admin-empty-row">No classes match your search.</p>
                )}
              </div>
            </section>

            <aside className="admin-classes-side">
              <section className="admin-card admin-class-summary-card">
                <h3>Selected Day</h3>
                <div className="admin-class-summary-list">
                  <div>
                    <span>Day</span>
                    <strong>{currentDaySchedule?.dayName}</strong>
                  </div>
                  <div>
                    <span>Morning</span>
                    <strong>{currentDaySchedule?.morning?.length || 0}</strong>
                  </div>
                  <div>
                    <span>Evening</span>
                    <strong>{currentDaySchedule?.evening?.length || 0}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>{getClassCount(currentDaySchedule)}</strong>
                  </div>
                </div>
              </section>

              <section className="admin-card admin-category-card">
                <h3>Categories</h3>
                <div className="admin-plan-list">
                  {Object.entries(visibleCategoryCounts).map(([category, count]) => (
                    <div className="admin-plan-row" key={category}>
                      <span className="admin-class-dot blue"></span>
                      <strong>{category}</strong>
                      <b>{count}</b>
                    </div>
                  ))}

                  {Object.keys(visibleCategoryCounts).length === 0 && (
                    <p className="admin-empty-row">No categories for this view.</p>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}

      {classForm && (
        <div className="admin-modal-backdrop" role="presentation">
          <form className="admin-class-form" onSubmit={saveClassForm}>
            <div className="admin-form-header">
              <div>
                <h3>{classForm.mode === "edit" ? "Edit Class" : "Add Class"}</h3>
                <p>{classForm.mode === "edit" ? "Update this database schedule item." : "Create a new class in the weekly schedule."}</p>
              </div>
              <button aria-label="Close class form" onClick={closeClassForm} type="button">×</button>
            </div>

            <div className="admin-form-grid">
              <label>
                <span>Day</span>
                <select
                  disabled={classForm.mode === "edit"}
                  onChange={(event) => updateClassFormValue("weekday", Number(event.target.value))}
                  value={classForm.values.weekday}
                >
                  {schedule.map((daySchedule) => (
                    <option key={daySchedule.weekday} value={daySchedule.weekday}>
                      {daySchedule.dayName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Period</span>
                <select
                  disabled={classForm.mode === "edit"}
                  onChange={(event) => updateClassFormValue("period", event.target.value)}
                  value={classForm.values.period}
                >
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                </select>
              </label>

              <label className="wide">
                <span>Class Name</span>
                <input
                  onChange={(event) => updateClassFormValue("name", event.target.value)}
                  required
                  value={classForm.values.name}
                />
              </label>

              <label className="wide">
                <span>Time</span>
                <input
                  onChange={(event) => updateClassFormValue("time", event.target.value)}
                  required
                  value={classForm.values.time}
                />
              </label>

              <label>
                <span>Duration</span>
                <input
                  onChange={(event) => updateClassFormValue("duration", event.target.value)}
                  required
                  value={classForm.values.duration}
                />
              </label>

              <label>
                <span>Trainer</span>
                <select
                  onChange={(event) => updateClassFormValue("trainerIndex", Number(event.target.value))}
                  value={classForm.values.trainerIndex}
                >
                  {(trainers.length ? trainers : [{ name: "Unassigned trainer" }]).map((trainer, index) => (
                    <option key={trainer.slug || trainer.name || index} value={index}>
                      {trainer.name || `Trainer ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Category</span>
                <select
                  onChange={(event) => updateClassFormValue("category", event.target.value)}
                  required
                  value={classForm.values.category}
                >
                  {classCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Color</span>
                <select
                  onChange={(event) => updateClassFormValue("color", event.target.value)}
                  value={classForm.values.color}
                >
                  {classColors.map((color) => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </label>
            </div>

            {formError && <p className="admin-form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button onClick={closeClassForm} type="button">Cancel</button>
              <button className="primary" disabled={formStatus === "saving"} type="submit">
                {formStatus === "saving" ? "Saving..." : "Save Class"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
