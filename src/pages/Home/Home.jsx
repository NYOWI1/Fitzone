import { useEffect, useState } from "react";
import "./Home.css";
import gymImg from "../../assets/gym 2.png";
import trainers from "../../data/trainers";
import TrainerDetail from "../TrainerDetail/TrainerDetail";

const plans = [
  {
    name: "Basic",
    price: "1299฿",
    desc: "Best for beginners who want simple gym access.",
    title: "What you get",
    features: ["Full Gym Access", "Locker Access", "Free Consultation", "Cardio & Weight Equipment", "Live Crowd Detection"],
  },
  {
    name: "Standard",
    price: "2299฿",
    desc: "Most balanced plan for regular fitness progress.",
    badge: "MOST POPULAR",
    popular: true,
    title: "What you get",
    features: ["3 Group Fitness Classes", "2 Personal Training Sessions", "Monthly Body Analysis", "Sauna & Recovery Sessions", "All Basic features"],
  },
  {
    name: "Premium",
    price: "4299฿",
    desc: "For members who want maximum support and results.",
    badge: "ELITE",
    premium: true,
    title: "What you get",
    features: ["Unlimited Fitness Classes", "4 Personal Training Sessions", "Weekly Body Analysis", "Free Nutrition Plan", "VIP Support"],
  },
];

const morningClasses = [
  ["HIIT X FUSION", "07:30am - 08:00am", "30min • Centralplaza Bangna", "Chin - Fam Sattawat", "HIIT", "green"],
  ["HyroFit", "08:15am - 09:00am", "45min • Centralplaza Bangna", "Chin - Aun Arunrat", "HIIT", "green"],
  ["GENTLE FLOW YOGA", "09:00am - 10:00am", "60min • Centralplaza Bangna", "Chin - Nu Pamwattich", "YOGA", "gray"],
  ["BODYCOMBAT®", "10:00am - 11:00am", "60min • Centralplaza Bangna", "Chin - Sam Tanyut", "CORE", "red"],
  ["BODYPUMP®", "11:00am - 12:00pm", "60min • Centralplaza Bangna", "Chin - Plam Chayutpong", "STR", "teal"],
  ["SUSPENSION EXERCISE", "11:00am - 11:30am", "30min • Centralplaza Bangna", "Chin - Arm Saksi", "STR", "teal"],
  ["AERIAL FLOW YOGA L2", "12:00pm - 01:00pm", "60min • Centralplaza Bangna", "Chin - Patcharin", "YOGA", "gray"],
  ["SUSPENSION EXERCISE", "03:00pm - 03:30pm", "30min • Centralplaza Bangna", "Chin - Eke A-Tist", "STR", "teal"],
];

const eveningClasses = [
  ["BODYCOMBAT®", "04:30pm - 05:30pm", "60min • Centralplaza Bangna", "Chin - Volt Kampanat", "CORE", "red"],
  ["Obstacle", "05:30pm - 06:15pm", "45min • Centralplaza Bangna", "Chin - Moo Pradit", "HIIT", "green"],
  ["Bike Tour", "05:30pm - 06:15pm", "45min • Centralplaza Bangna", "Chin - Ball Rungrat", "BIKE", "yellow"],
  ["Combolo", "05:30pm - 06:30pm", "60min • Centralplaza Bangna", "Chin - M Natchanon", "CORE", "red"],
  ["Gym Ball", "06:15pm - 07:00pm", "45min • Centralplaza Bangna", "Chin - Ice Intira-On", "STR", "teal"],
  ["BODYPUMP®", "06:35pm - 07:35pm", "60min • Centralplaza Bangna", "Chin - Fam Yuttapong", "STR", "teal"],
  ["HIIT X FUSION", "07:00pm - 07:30pm", "30min • Centralplaza Bangna", "Chin - Mark Phongsakorn", "HIIT", "green"],
  ["BODYSTEP®", "07:40pm - 08:40pm", "60min • Centralplaza Bangna", "Chin - Ton Nataksa", "CORE", "red"],
];

const scheduleDays = [["Today", "28/6"], ["Mon", "29/6"], ["Tue", "30/6"], ["Wed", "1/7"], ["Thu", "2/7"], ["Fri", "3/7"], ["Sat", "4/7"]];
const filters = ["All Classes", "Strength", "HIIT", "Yoga", "Cycling"];
const navItems = [
  ["home", "Home"],
  ["membership", "Membership"],
  ["trainers", "Trainers"],
  ["schedule", "Schedule"],
  ["contact", "Contact"],
];

function ScheduleBlock({ title, description, heading, classes }) {
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
        {scheduleDays.map((day, index) => (
          <button className={index === 1 ? "day active-day" : "day"} key={day[0]}>
            {day[0]}<br />
            <span>{day[1]}</span>
          </button>
        ))}
      </div>

      <div className="filters">
        {filters.map((filter, index) => (
          <button className={index === 0 ? "filter active-filter" : "filter"} key={filter}>{filter}</button>
        ))}
      </div>

      <h3 className="schedule-label">{heading}</h3>

      <div className="class-grid">
        {classes.map((item) => (
          <div className={`class-card ${item[5]}`} key={`${title}-${item[0]}-${item[1]}`}>
            <h3>{item[0]}</h3>
            <h4>{item[1]}</h4>
            <p>{item[2]}</p>
            <strong>{item[3]}</strong>
            <span>{item[4]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Home() {
  const [activeSection, setActiveSection] = useState("home");
  const [selectedTrainer, setSelectedTrainer] = useState(null);

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

        <div className="nav-actions">
          <button className="outline-btn">Login</button>
          <button className="red-btn">Join Now</button>
        </div>
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
          <button className="red-btn hero-btn">Join Us Now!</button>
        </div>
      </section>

      <section id="membership" className="section">
        <h2 className="section-title">Membership Plans</h2>
        <div className="red-line"></div>

        <div className="plan-grid">
          {plans.map((plan) => (
            <div className={`plan-card ${plan.premium ? "premium" : ""}`} key={plan.name}>
              {plan.badge && <span className="badge">{plan.badge}</span>}
              <h3>{plan.name}</h3>
              <p>{plan.desc}</p>
              <h4>{plan.price}<small>/month</small></h4>

              <h5>{plan.title}</h5>
              <ul>
                {plan.features.map((f) => (
                  <li key={f}><span>✓</span>{f}</li>
                ))}
              </ul>

              <button className={plan.premium ? "gold-btn" : "red-btn"}>
                {plan.popular ? "Choose Standard" : "Get Started"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="trainers" className="section dark">
        <h2 className="section-title">MEET THE TEAMS...</h2>
        <div className="red-line"></div>
        <p className="section-subtitle">Professional coaches ready to guide your fitness journey</p>

        <div className="trainer-grid">
          {trainers.map((trainer, index) => (
            <div
              className="trainer-card"
              key={trainer.name}
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
      </section>

      <div className="schedule-section">
        <ScheduleBlock
          title="Class Schedule"
          description="Plan your workout with daily classes, expert coaches, and clear class categories."
          heading="MORNING + AFTERNOON"
          classes={morningClasses}
        />
        <ScheduleBlock
          title="Evening Schedule"
          description="High-energy evening sessions designed for strength, cardio, and post-work training."
          heading="EVENING CLASSES"
          classes={eveningClasses}
        />
      </div>

      <footer id="contact" className="footer">
        <div>
          <h2>FITZONE</h2>
          <p>Your fitness journey starts here. Train smarter and stay stronger.</p>
        </div>

        <div>
          <h3>Quick Links</h3>
          <p>Home</p>
          <p>Membership</p>
          <p>Trainers</p>
          <p>Schedule</p>
        </div>

        <div>
          <h3>Contact</h3>
          <p>CentralPlaza Bangna, Bangkok</p>
          <p>+66 XX XXX XXXX</p>
          <p>info@fitzone.com</p>
        </div>

        <div>
          <h3>Opening Hours</h3>
          <p>Mon - Fri: 7:00 AM - 10:00 PM</p>
          <p>Sat - Sun: 8:00 AM - 9:00 PM</p>
          <h3>Follow Us</h3>
          <div className="socials">
            <span>FB</span>
            <span>IG</span>
            <span>TT</span>
            <span>YT</span>
          </div>
        </div>
      </footer>
      <div className="copyright">© 2026 FITZONE. All Rights Reserved.</div>
    </div>
  );
}

export default Home;
