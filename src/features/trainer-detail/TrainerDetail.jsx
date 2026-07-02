import "./TrainerDetail.css";

function TrainerDetail({ trainer, onBack }) {
  return (
    <main className="trainer-profile-page">
      <div className="trainer-profile-frame">
        <button className="profile-back-btn" onClick={onBack}>
          <span>‹</span>
          Back to Teams
        </button>

        <div className="profile-visual">
          <div className="profile-glow"></div>
          <img src={trainer.image} alt={trainer.name} />
          <button className="profile-book-btn">Book a Session</button>
        </div>

        <section className="profile-card">
          <p className="profile-eyebrow">TRAINER PROFILE</p>
          <h1>{trainer.name}</h1>
          <h2>{trainer.role}</h2>
          <div className="profile-red-line"></div>
          <p className="profile-bio">{trainer.bio}</p>
          <p className="profile-expertise">Expertise: {trainer.expertise}</p>
          <span className="profile-coach-pill">{trainer.coach}</span>

          <div className="profile-stats">
            {trainer.stats.map(([value, label]) => (
              <div className="profile-stat" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <h3>Specialties</h3>
          <div className="profile-specialties">
            {trainer.specialties.map((specialty) => (
              <span key={specialty}>{specialty}</span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default TrainerDetail;
