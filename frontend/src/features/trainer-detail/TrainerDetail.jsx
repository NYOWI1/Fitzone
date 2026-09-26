import { useEffect, useState } from 'react';
import { getTrainers } from '../../shared/api';
import { attachTrainerImage } from '../../shared/trainers';
import { getTrainerProfile } from './trainerProfileContent';
import './TrainerDetail.css';

function TrainerDetail({ trainer, onBack }) {
  const profile = getTrainerProfile(trainer);
  const paragraphs = profile?.paragraphs || [trainer.bio];
  const expertise = profile?.expertise || trainer.specialties || [];
  return (
    <main className='trainer-profile'>
      <header className='trainer-profile-header'>
        <div>
          <button
            className='trainer-profile-back'
            onClick={onBack}
            type='button'
          >
            <span aria-hidden='true'>‹</span>
            Back to Teams
          </button>
          <small>FitZone · Trainer Profile</small>
        </div>
      </header>
      <div className='trainer-profile-layout'>
        <figure className='trainer-profile-photo'>
          <img src={trainer.image} alt={trainer.name} />
        </figure>
        <section className='trainer-profile-content'>
          <p className='trainer-profile-eyebrow'>Meet your coach</p>
          <h1>{trainer.name}</h1>
          <p className='trainer-profile-role'>
            {profile?.role || trainer.role}
          </p>
          <span className='trainer-profile-training'>
            {profile?.training || trainer.coach}
          </span>
          {profile?.quote && <blockquote>“{profile.quote}”</blockquote>}
          <div className='trainer-profile-about'>
            <h2>About {trainer.name}</h2>
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <section
            className='trainer-profile-expertise'
            aria-label='Trainer expertise'
          >
            <h2>Expertise</h2>
            <ul>
              {expertise.map((specialty) => (
                <li key={specialty}>{specialty}</li>
              ))}
            </ul>
          </section>
        </section>
      </div>
    </main>
  );
}

export default TrainerDetail;

export function TrainerDetailRoute({ trainerSlug }) {
  const [trainer, setTrainer] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let isCurrent = true;

    async function loadTrainer() {
      try {
        const trainers = await getTrainers();
        const nextTrainer = trainers
          .map(attachTrainerImage)
          .find((trainerItem) => trainerItem.slug === trainerSlug);

        if (isCurrent) {
          setTrainer(nextTrainer || null);
          setStatus(nextTrainer ? 'ready' : 'not-found');
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setTrainer(null);
          setStatus('error');
        }
      }
    }

    loadTrainer();

    return () => {
      isCurrent = false;
    };
  }, [trainerSlug]);

  const goBackToTrainers = () => {
    window.location.href = '/#trainers';
  };

  if (status === 'ready' && trainer) {
    return <TrainerDetail trainer={trainer} onBack={goBackToTrainers} />;
  }

  return (
    <main className='fitzone-ui grid min-h-screen place-items-center bg-[#f8f9fb] px-6 text-center text-[#1d2939]'>
      <div className='max-w-[520px] rounded-xl border border-[#e4e7ec] bg-white p-8 shadow-sm'>
        <p className='mb-3 mt-0 text-xs font-black uppercase text-[#e6002e]'>
          Trainer Profile
        </p>
        <h1 className='mb-3 mt-0 text-[clamp(28px,7vw,42px)]'>
          {status === 'loading'
            ? 'Loading trainer...'
            : status === 'not-found'
              ? 'Trainer not found'
              : 'Unable to load trainer'}
        </h1>
        <p className='mb-6 mt-0 text-sm leading-[1.5] text-[#bdbdbd]'>
          {status === 'loading'
            ? 'Fetching the trainer profile from the server.'
            : 'Return to the trainers section and choose another profile.'}
        </p>
        <button
          className='min-h-11 cursor-pointer rounded-lg bg-[#e6002e] px-5 text-sm font-black text-white'
          onClick={goBackToTrainers}
          type='button'
        >
          Back to Teams
        </button>
      </div>
    </main>
  );
}
