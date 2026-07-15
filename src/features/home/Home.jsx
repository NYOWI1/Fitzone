import { useEffect, useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import "./Home.css";
import gymImg from "../../assets/images/gym 2.png";
import { buildScheduleDays, filterClassesByType, filters, getScheduleDays, makeScheduleTrainerLabels } from "../../data/schedule";
import { getClassSchedule, getMembershipPlans, getSiteSettings, getTrainers } from "../../shared/api";
import { attachTrainerImage } from "../../shared/trainers";
import TrainerDetail from "../trainer-detail/TrainerDetail";
const navItems = [
  ["home", "Home"],
  ["membership", "Membership"],
  ["trainers", "Trainers"],
  ["schedule", "Schedule"],
  ["contact", "Contact"],
];

const sectionIdByLabel = navItems.reduce((sections, [sectionId, label]) => ({
  ...sections,
  [label.toLowerCase()]: sectionId,
}), {});

function getTodayIndex() {
  return new Date().getDay();
}

function getSectionIdFromLabel(label) {
  return sectionIdByLabel[label.toLowerCase()];
}

function ScheduleBlock({ title, description, heading, classes, days, activeDay, activeFilter, onDayChange, onFilterChange }) {
  const visibleClasses = filterClassesByType(classes, activeFilter);

  return (
    <section id={title === "Class Schedule" ? "schedule" : undefined} className="schedule-panel">
      <div className="schedule-heading">
        <div>
          <h5>FITZONE CLASSES</h5>
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
      </div>

      <div className="days">
        {days.map((day, index) => (
          <button
            className={index === activeDay ? "day active-day" : "day"}
            key={day[0]}
            onClick={() => onDayChange(index)}
            type="button"
          >
            {day[0]}<br />
            <span>{day[1]}</span>
          </button>
        ))}
      </div>

      <div className="filters">
        {filters.map((filter) => (
          <button
            className={filter === activeFilter ? "filter active-filter" : "filter"}
            key={filter}
            onClick={() => onFilterChange(filter)}
            type="button"
          >
            {filter}
          </button>
        ))}
      </div>

      <h3 className="schedule-label">{heading}</h3>

      <div className="class-grid">
        {visibleClasses.map((item) => (
          <div className={`class-card ${item[5]}`} key={`${title}-${item[0]}-${item[1]}`}>
            <h3>{item[0]}</h3>
            <h4>{item[1]}</h4>
            <p>{item[2]}</p>
            <strong>{item[3]}</strong>
            <span>{item[4]}</span>
          </div>
        ))}
      </div>

      {visibleClasses.length === 0 && (
        <p className="schedule-empty">No classes match this filter.</p>
      )}
    </section>
  );
}

function Home({ clerkEnabled }) {
  const [activeSection, setActiveSection] = useState("home");
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [plans, setPlans] = useState([]);
  const [plansStatus, setPlansStatus] = useState("loading");
  const [trainers, setTrainers] = useState([]);
  const [trainersStatus, setTrainersStatus] = useState("loading");
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [scheduleStatus, setScheduleStatus] = useState("loading");
  const [siteSettings, setSiteSettings] = useState(null);
  const [siteSettingsStatus, setSiteSettingsStatus] = useState("loading");
  const [scheduleDays, setScheduleDays] = useState(() => getScheduleDays());
  const [activeScheduleDay, setActiveScheduleDay] = useState(() => getTodayIndex());
  const [activeScheduleFilter, setActiveScheduleFilter] = useState(filters[0]);
  const scheduleTrainerLabels = makeScheduleTrainerLabels(trainers);
  const classScheduleDays = buildScheduleDays(weeklySchedule, scheduleTrainerLabels, scheduleDays);
  const morningClasses = classScheduleDays[activeScheduleDay]?.morning || [];
  const eveningClasses = classScheduleDays[activeScheduleDay]?.evening || [];

  useEffect(() => {
    const updateActiveSection = () => {
      const markerPosition = window.innerHeight * 0.35;
      const isPageBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let currentSection = "home";

      if (isPageBottom) {
        currentSection = "contact";
      } else {
        navItems.forEach(([sectionId]) => {
          const section = document.getElementById(sectionId);

          if (section && section.getBoundingClientRect().top <= markerPosition) {
            currentSection = sectionId;
          }
        });
      }

      setActiveSection((previousSection) => (
        previousSection === currentSection ? previousSection : currentSection
      ));
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  useEffect(() => {
    const todayKey = () => new Date().toDateString();
    let currentTodayKey = todayKey();

    const refreshScheduleDays = () => {
      const nextTodayKey = todayKey();

      if (nextTodayKey !== currentTodayKey) {
        currentTodayKey = nextTodayKey;
        setScheduleDays(getScheduleDays());
        setActiveScheduleDay(getTodayIndex());
      }
    };

    const intervalId = window.setInterval(refreshScheduleDays, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadSiteSettings() {
      try {
        const nextSettings = await getSiteSettings();

        if (isCurrent) {
          setSiteSettings(nextSettings);
          setSiteSettingsStatus("ready");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setSiteSettings(null);
          setSiteSettingsStatus("error");
        }
      }
    }

    loadSiteSettings();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadClassSchedule() {
      try {
        const nextSchedule = await getClassSchedule();

        if (isCurrent) {
          setWeeklySchedule(nextSchedule);
          setScheduleStatus("ready");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setWeeklySchedule([]);
          setScheduleStatus("error");
        }
      }
    }

    loadClassSchedule();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadMembershipPlans() {
      try {
        const nextPlans = await getMembershipPlans();

        if (isCurrent) {
          setPlans(nextPlans);
          setPlansStatus("ready");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setPlans([]);
          setPlansStatus("error");
        }
      }
    }

    loadMembershipPlans();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadTrainers() {
      try {
        const nextTrainers = await getTrainers();

        if (isCurrent) {
          setTrainers(nextTrainers.map(attachTrainerImage));
          setTrainersStatus("ready");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setTrainers([]);
          setTrainersStatus("error");
        }
      }
    }

    loadTrainers();

    return () => {
      isCurrent = false;
    };
  }, []);

  const openTrainerProfile = (trainer) => {
    setSelectedTrainer(trainer);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeTrainerProfile = () => {
    setSelectedTrainer(null);
    setActiveSection("trainers");
    setTimeout(() => {
      document.getElementById("trainers")?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  };

  if (selectedTrainer) {
    return <TrainerDetail trainer={selectedTrainer} onBack={closeTrainerProfile} />;
  }

  return (
    <div className="home-page">
      <nav className="navbar">
        <div className="brand">
          <div className="logo">F</div>
          <div>
            <h2>FITZONE</h2>
            <span>GYM & FITNESS</span>
          </div>
        </div>

        <div className="nav-links">
          {navItems.map(([sectionId, label]) => (
            <a
              href={`#${sectionId}`}
              className={activeSection === sectionId ? "active" : ""}
              onClick={() => setActiveSection(sectionId)}
              key={sectionId}
            >
              {label}
            </a>
          ))}
        </div>

        {clerkEnabled ? (
          <div className="nav-actions">
            <SignedOut>
              <button className="outline-btn" onClick={() => { window.location.href = "/login"; }} type="button">Login</button>
              <button className="red-btn" onClick={() => { window.location.href = "/signup"; }} type="button">Join Now</button>
            </SignedOut>

            <SignedIn>
              <div className="home-signed-in-actions">
                <button className="outline-btn dashboard-btn" onClick={() => { window.location.href = "/dashboard"; }} type="button">
                  Dashboard
                </button>
                <div className="home-user-action">
                  <UserButton afterSignOutUrl="/" />
                  <span>Account</span>
                </div>
              </div>
            </SignedIn>
          </div>
        ) : (
          <div className="nav-actions">
            <button className="outline-btn" onClick={() => { window.location.href = "/login"; }} type="button">Login</button>
            <button className="red-btn" onClick={() => { window.location.href = "/signup"; }} type="button">Join Now</button>
          </div>
        )}
      </nav>

      <section
        id="home"
        className="hero"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.86) 0%, rgba(0,0,0,.62) 34%, rgba(0,0,0,.16) 58%, rgba(0,0,0,.08) 100%), url(${gymImg})` }}
      >
        <div className="hero-content">
          <h1>Sweat, Strengthen, and Transform Your Body at Our Gym</h1>
          <p>
            Welcome to FitZone, where we are dedicated to helping you achieve your fitness goals.
            With expert trainers and modern equipment, we provide a strong fitness experience for all levels.
          </p>
          <button className="red-btn hero-btn" onClick={() => { window.location.href = "/signup"; }} type="button">Join Us Now!</button>
        </div>
      </section>

      <section id="membership" className="section">
        <h2 className="section-title">Membership Plans</h2>
        <div className="red-line"></div>

        {plansStatus === "loading" && (
          <p className="membership-status">Loading membership plans...</p>
        )}

        {plansStatus === "error" && (
          <p className="membership-status error">Membership plans are unavailable right now.</p>
        )}

        {plansStatus === "ready" && plans.length === 0 && (
          <p className="membership-status">No membership plans are available right now.</p>
        )}

        {plansStatus === "ready" && plans.length > 0 && (
          <div className="plan-grid">
            {plans.map((plan) => (
              <div className={`plan-card ${plan.premium ? "premium" : ""}`} key={plan.slug || plan.name}>
                {plan.badge && <span className="badge">{plan.badge}</span>}
                <h3>{plan.name}</h3>
                <p>{plan.desc}</p>
                <h4>{plan.price}<small>/month</small></h4>

                <h5>{plan.title}</h5>
                <ul>
                  {(plan.features || []).map((feature) => (
                    <li key={feature}><span>✓</span>{feature}</li>
                  ))}
                </ul>

                <button className={plan.premium ? "gold-btn" : "red-btn"} onClick={() => { window.location.href = `/payment?plan=${encodeURIComponent(plan.slug)}`; }} type="button">
                  {plan.popular ? "Choose Standard" : "Get Started"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="trainers" className="section dark">
        <h2 className="section-title">MEET THE TEAMS...</h2>
        <div className="red-line"></div>
        <p className="section-subtitle">Professional coaches ready to guide your fitness journey</p>

        {trainersStatus === "loading" && (
          <p className="section-status">Loading trainers...</p>
        )}

        {trainersStatus === "error" && (
          <p className="section-status error">Trainers are unavailable right now.</p>
        )}

        {trainersStatus === "ready" && trainers.length === 0 && (
          <p className="section-status">No trainers are available right now.</p>
        )}

        {trainersStatus === "ready" && trainers.length > 0 && (
          <div className="trainer-grid">
            {trainers.map((trainer, index) => (
              <div
                className="trainer-card"
                key={trainer.slug || trainer.name}
                role="button"
                tabIndex="0"
                onClick={() => openTrainerProfile(trainer)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openTrainerProfile(trainer);
                  }
                }}
              >
                <div className="trainer-badges">
                  <span>{trainer.category}</span>
                  {trainer.badge && <span>{trainer.badge}</span>}
                </div>
                <div className="trainer-photo-wrap">
                  <img className={`trainer-photo trainer-photo-${index + 1}`} src={trainer.image} alt={trainer.name} />
                </div>
                <div className="trainer-info">
                  <div className="trainer-mark"></div>
                  <h3>{trainer.name}</h3>
                  <p>{trainer.role}</p>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      openTrainerProfile(trainer);
                    }}
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="schedule-section">
        {scheduleStatus === "loading" && (
          <p className="schedule-status">Loading class schedule...</p>
        )}

        {scheduleStatus === "error" && (
          <p className="schedule-status error">Class schedule is unavailable right now.</p>
        )}

        {scheduleStatus === "ready" && weeklySchedule.length === 0 && (
          <p className="schedule-status">No class schedule is available right now.</p>
        )}

        {scheduleStatus === "ready" && weeklySchedule.length > 0 && (
          <>
            <ScheduleBlock
              title="Class Schedule"
              description="Plan your workout with daily classes, expert coaches, and clear class categories."
              heading="MORNING + AFTERNOON"
              classes={morningClasses}
              days={scheduleDays}
              activeDay={activeScheduleDay}
              activeFilter={activeScheduleFilter}
              onDayChange={setActiveScheduleDay}
              onFilterChange={setActiveScheduleFilter}
            />
            <ScheduleBlock
              title="Evening Schedule"
              description="High-energy evening sessions designed for strength, cardio, and post-work training."
              heading="EVENING CLASSES"
              classes={eveningClasses}
              days={scheduleDays}
              activeDay={activeScheduleDay}
              activeFilter={activeScheduleFilter}
              onDayChange={setActiveScheduleDay}
              onFilterChange={setActiveScheduleFilter}
            />
          </>
        )}
      </div>

      <footer id="contact" className="footer">
        {siteSettingsStatus === "loading" && (
          <p className="footer-status">Loading contact information...</p>
        )}

        {siteSettingsStatus === "error" && (
          <p className="footer-status error">Contact information is unavailable right now.</p>
        )}

        {siteSettingsStatus === "ready" && siteSettings && (
          <>
            <div>
              <h2>{siteSettings.brand?.name}</h2>
              <p>{siteSettings.brand?.description}</p>
            </div>

            <div>
              <h3>Quick Links</h3>
              {(siteSettings.quickLinks || []).map((link) => {
                const sectionId = getSectionIdFromLabel(link);

                if (!sectionId) {
                  return <p key={link}>{link}</p>;
                }

                return (
                  <a
                    className="footer-link"
                    href={`#${sectionId}`}
                    key={link}
                    onClick={() => setActiveSection(sectionId)}
                  >
                    {link}
                  </a>
                );
              })}
            </div>

            <div>
              <h3>Contact</h3>
              <p>{siteSettings.contact?.location}</p>
              <p>{siteSettings.contact?.phone}</p>
              <p>{siteSettings.contact?.email}</p>
            </div>

            <div>
              <h3>Opening Hours</h3>
              {(siteSettings.openingHours || []).map((hours) => (
                <p key={hours}>{hours}</p>
              ))}
              <h3>Follow Us</h3>
              <div className="socials">
                {(siteSettings.socials || []).map((social) => (
                  <span key={social}>{social}</span>
                ))}
              </div>
            </div>
          </>
        )}
      </footer>
      <div className="copyright">{siteSettings?.copyright || "© 2026 FITZONE. All Rights Reserved."}</div>
    </div>
  );
}

export default Home;
