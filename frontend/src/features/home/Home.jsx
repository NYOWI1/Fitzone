import { useEffect, useState } from 'react';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import gymImg from '../../assets/images/gym-hero.png';
import './Home.css';
import {
  buildScheduleDays,
  filterClassesByType,
  filters,
  getScheduleDays,
  makeScheduleTrainerLabels
} from '../../shared/schedule';
import {
  getClassSchedule,
  getMembershipPlans,
  getSiteSettings,
  getTrainers
} from '../../shared/api';
import { attachTrainerImage } from '../../shared/trainers';
import FitZoneLogo from '../../shared/ui/FitZoneLogo';
import SocialIcon, { getSocialPlatform } from '../../shared/ui/SocialIcon';
import { getPlanCtaLabel } from '../membership-flow/shared/planSelection';
import TrainerDetail from '../trainer-detail/TrainerDetail';

const navItems = [
  ['home', 'Home'],
  ['membership', 'Membership'],
  ['trainers', 'Trainers'],
  ['schedule', 'Schedule'],
  ['contact', 'Contact']
];

const sectionIdByLabel = navItems.reduce(
  (sections, [sectionId, label]) => ({
    ...sections,
    [label.toLowerCase()]: sectionId
  }),
  {}
);

const buttonBase =
  'cursor-pointer rounded-[10px] border-0 px-6 py-[11px] font-sans text-[11px] font-extrabold max-[560px]:px-4';
const outlineButton = `${buttonBase} border border-[#454545] bg-[rgba(255,255,255,0.03)] text-white transition hover:border-[#e6002e] hover:bg-[#1d1114]`;
const redButton = `${buttonBase} bg-[#e6002e] text-white shadow-[0_12px_26px_rgba(230,0,46,0.2)] transition hover:bg-[#ff123e]`;
const goldButton = redButton;
const sectionClass = 'home-section';
const sectionTitle =
  'm-0 text-center text-[clamp(36px,5vw,52px)] leading-[1.1] max-[980px]:text-[clamp(31px,9vw,42px)] max-[560px]:text-[clamp(28px,9vw,36px)]';
const redLine =
  'mx-auto mb-12 mt-4 h-[5px] w-[180px] rounded-[10px] bg-[#e6002e] max-[980px]:mb-[34px] max-[980px]:w-[132px] max-[560px]:mb-7 max-[560px]:mt-3 max-[560px]:h-1 max-[560px]:w-24';
const statusText =
  'w-full text-center text-[13px] font-extrabold text-[#d5d5d5]';

const classColorStyles = {
  green: {
    card: 'border-t-[#e6002e]',
    label: 'bg-[#e6002e] text-white'
  },
  red: {
    card: 'border-t-[#e6002e]',
    label: 'bg-[#e6002e] text-white'
  },
  gray: {
    card: 'border-t-[#e6002e]',
    label: 'bg-[#e6002e] text-white'
  },
  teal: {
    card: 'border-t-[#e6002e]',
    label: 'bg-[#e6002e] text-white'
  },
  yellow: {
    card: 'border-t-[#e6002e]',
    label: 'bg-[#e6002e] text-white'
  }
};

function getTodayIndex() {
  return new Date().getDay();
}

function getSectionIdFromLabel(label) {
  return sectionIdByLabel[label.toLowerCase()];
}

function ScheduleBlock({
  title,
  description,
  heading,
  classes,
  days,
  activeDay,
  activeFilter,
  onDayChange,
  onFilterChange
}) {
  const visibleClasses = filterClassesByType(classes, activeFilter);

  return (
    <section
      id={title === 'Class Schedule' ? 'schedule' : undefined}
      className='mx-auto mb-[72px] w-[calc(100%_-_72px)] rounded-xl border border-[#e4e7ec] border-t-[6px] border-t-[#b42318] bg-white px-6 pb-[34px] pt-9 shadow-[0_1px_2px_rgba(16,24,40,0.05)] last:mb-0 max-[980px]:mb-[42px] max-[980px]:w-[calc(100%_-_28px)] max-[980px]:px-4 max-[980px]:pb-[26px] max-[980px]:pt-7 max-[560px]:mb-8 max-[560px]:w-[calc(100%_-_20px)] max-[560px]:px-3.5 max-[560px]:pb-5 max-[560px]:pt-5'
    >
      <div className='mb-12 grid grid-cols-2 items-end gap-[60px] max-[980px]:mb-[30px] max-[980px]:grid-cols-1 max-[980px]:gap-3.5 max-[560px]:mb-5'>
        <div>
          <h5 className='mb-2.5 mt-0 text-[10px] font-black text-[#e6002e]'>
            FITZONE CLASSES
          </h5>
          <h2 className='m-0 text-[39px] leading-none max-[980px]:text-[clamp(29px,8vw,38px)] max-[560px]:text-[28px]'>
            {title}
          </h2>
        </div>
        <p className='m-0 text-[13px] font-bold leading-[1.35] text-[#a8a8a8] max-[560px]:text-xs'>
          {description}
        </p>
      </div>

      <div className='mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-6 max-[980px]:gap-2.5 max-[560px]:grid-flow-col max-[560px]:grid-cols-none max-[560px]:auto-cols-[76px] max-[560px]:overflow-x-auto max-[560px]:pb-1'>
        {days.map((day, index) => {
          const isActive = index === activeDay;

          return (
            <button
              className={`min-h-[54px] cursor-pointer rounded-[14px] border p-2.5 text-[11px] font-black text-white transition max-[560px]:min-h-[50px] max-[560px]:rounded-xl max-[560px]:text-[10px] ${isActive ? 'border-[#e6002e] bg-[#e6002e] shadow-[0_10px_20px_rgba(230,0,46,0.18)]' : 'border-[#3b3b3b] bg-[#202020] hover:border-[#666]'}`}
              key={day[0]}
              onClick={() => onDayChange(index)}
              type='button'
            >
              {day[0]}
              <br />
              <span
                className={`mt-1 inline-block ${isActive ? 'text-white' : 'text-[#bdbdbd]'}`}
              >
                {day[1]}
              </span>
            </button>
          );
        })}
      </div>

      <div className='mb-[26px] flex flex-wrap gap-3 max-[560px]:gap-2'>
        {filters.map((filter) => (
          <button
            className={`min-h-7 min-w-[78px] cursor-pointer rounded-[18px] border px-3 text-[9px] font-black transition max-[560px]:flex-1 ${filter === activeFilter ? 'border-[#e6002e] bg-[#e6002e] text-white' : 'border-[#373737] bg-[#202020] text-[#c9c9c9] hover:border-[#666]'}`}
            key={filter}
            onClick={() => onFilterChange(filter)}
            type='button'
          >
            {filter}
          </button>
        ))}
      </div>

      <h3 className='mb-[22px] mt-0 inline-block border-b-4 border-[#e6002e] pb-[9px] text-[15px]'>
        {heading}
      </h3>

      <div className='grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-[22px]'>
        {visibleClasses.map((item) => {
          const colors = classColorStyles[item[5]] || classColorStyles.green;

          return (
            <div
              className={`relative min-h-[118px] rounded-xl border border-[#3c3c3c] border-t-[5px] bg-[#262626] px-[15px] py-3.5 shadow-[0_12px_24px_rgba(0,0,0,0.18)] max-[560px]:min-h-[124px] max-[560px]:pb-[42px] ${colors.card}`}
              key={`${title}-${item[0]}-${item[1]}`}
            >
              <h3 className='mb-2 mt-0 text-xs'>{item[0]}</h3>
              <h4 className='mb-1.5 mt-0 text-[13px] text-[#efefef]'>
                {item[1]}
              </h4>
              <p className='m-0 block text-[9px] leading-[1.45] text-[#b8b8b8]'>
                {item[2]}
              </p>
              <strong className='block text-[9px] leading-[1.45] text-[#b8b8b8]'>
                {item[3]}
              </strong>
              <span
                className={`absolute bottom-3 right-3 rounded-[20px] px-3 py-[5px] text-[8px] font-black ${colors.label}`}
              >
                {item[4]}
              </span>
            </div>
          );
        })}
      </div>

      {visibleClasses.length === 0 && (
        <p className='mb-0 mt-5 text-center text-xs font-extrabold text-[#bfbfbf]'>
          No classes match this filter.
        </p>
      )}
    </section>
  );
}

function Home({ clerkEnabled }) {
  const [activeSection, setActiveSection] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [plans, setPlans] = useState([]);
  const [plansStatus, setPlansStatus] = useState('loading');
  const [trainers, setTrainers] = useState([]);
  const [trainersStatus, setTrainersStatus] = useState('loading');
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [scheduleStatus, setScheduleStatus] = useState('loading');
  const [siteSettings, setSiteSettings] = useState(null);
  const [siteSettingsStatus, setSiteSettingsStatus] = useState('loading');
  const [scheduleDays, setScheduleDays] = useState(() => getScheduleDays());
  const [activeScheduleDay, setActiveScheduleDay] = useState(() =>
    getTodayIndex()
  );
  const [activeScheduleFilter, setActiveScheduleFilter] = useState(filters[0]);
  const scheduleTrainerLabels = makeScheduleTrainerLabels(trainers);
  const classScheduleDays = buildScheduleDays(
    weeklySchedule,
    scheduleTrainerLabels,
    scheduleDays
  );
  const morningClasses = classScheduleDays[activeScheduleDay]?.morning || [];
  const eveningClasses = classScheduleDays[activeScheduleDay]?.evening || [];

  useEffect(() => {
    const updateActiveSection = () => {
      const markerPosition = window.innerHeight * 0.35;
      const isPageBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      let currentSection = 'home';

      if (isPageBottom) {
        currentSection = 'contact';
      } else {
        navItems.forEach(([sectionId]) => {
          const section = document.getElementById(sectionId);

          if (
            section &&
            section.getBoundingClientRect().top <= markerPosition
          ) {
            currentSection = sectionId;
          }
        });
      }

      setActiveSection((previousSection) =>
        previousSection === currentSection ? previousSection : currentSection
      );
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
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
          setSiteSettingsStatus('ready');
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setSiteSettings(null);
          setSiteSettingsStatus('error');
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
          setScheduleStatus('ready');
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setWeeklySchedule([]);
          setScheduleStatus('error');
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
          setPlans(nextPlans.filter((plan) => plan.active !== false));
          setPlansStatus('ready');
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setPlans([]);
          setPlansStatus('error');
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
          setTrainersStatus('ready');
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setTrainers([]);
          setTrainersStatus('error');
        }
      }
    }

    loadTrainers();

    return () => {
      isCurrent = false;
    };
  }, []);

  const openTrainerProfile = (trainer) => {
    window.history.pushState(
      null,
      '',
      `/trainers/${encodeURIComponent(trainer.slug)}`
    );
    setSelectedTrainer(trainer);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeTrainerProfile = () => {
    window.history.pushState(null, '', '/#trainers');
    setSelectedTrainer(null);
    setActiveSection('trainers');
    setTimeout(() => {
      document
        .getElementById('trainers')
        ?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  const handleNavClick = (sectionId) => {
    setActiveSection(sectionId);
    setIsMobileMenuOpen(false);
  };

  if (selectedTrainer) {
    return (
      <TrainerDetail trainer={selectedTrainer} onBack={closeTrainerProfile} />
    );
  }

  return (
    <div className='fitzone-ui home-page min-h-screen w-full overflow-x-hidden bg-[#f8f9fb] font-sans text-[#1d2939]'>
      <nav className='fixed inset-x-0 top-0 z-10 flex h-18 items-center justify-between border-b border-[#e4e7ec] bg-[rgba(255,255,255,0.96)] px-[max(24px,5vw)] shadow-[0_1px_2px_rgba(16,24,40,0.05)] backdrop-blur-md max-[980px]:sticky max-[980px]:h-auto max-[980px]:flex-col max-[980px]:gap-3 max-[980px]:p-3 max-[640px]:items-stretch max-[640px]:gap-0 max-[640px]:p-0'>
        <div className='hidden min-h-[64px] grid-cols-[48px_1fr_auto] items-center border-b border-[#e4e7ec] px-3 max-[640px]:grid'>
          <button
            aria-controls='home-mobile-menu'
            aria-expanded={isMobileMenuOpen}
            aria-label='Toggle navigation menu'
            className='grid h-11 w-11 cursor-pointer place-items-center rounded-lg bg-transparent text-[#344054]'
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
            type='button'
          >
            <span className='grid gap-[5px]'>
              <span className='block h-0.5 w-5 rounded-full bg-[#344054]'></span>
              <span className='block h-0.5 w-5 rounded-full bg-[#344054]'></span>
              <span className='block h-0.5 w-5 rounded-full bg-[#344054]'></span>
            </span>
          </button>

          <a
            className='justify-self-center text-center no-underline'
            href='#home'
            onClick={() => handleNavClick('home')}
          >
            <div className='flex items-center justify-center gap-2'>
              <FitZoneLogo className='h-8 w-8' />
              <div className='text-left'>
                <strong className='block text-[15px] leading-none text-white'>
                  FITZONE
                </strong>
                <span className='mt-0.5 block text-[7px] font-extrabold text-[#e6002e]'>
                  GYM & FITNESS
                </span>
              </div>
            </div>
          </a>

          <div className='flex min-w-[86px] items-center justify-end gap-2'>
            {clerkEnabled ? (
              <>
                <SignedOut>
                  <button
                    className='min-h-9 cursor-pointer rounded-lg border border-[#3f3f3f] bg-transparent px-3 text-[10px] font-black text-white'
                    onClick={() => {
                      window.location.href = '/login';
                    }}
                    type='button'
                  >
                    Login
                  </button>
                </SignedOut>
                <SignedIn>
                  <button
                    className='min-h-9 cursor-pointer rounded-lg border border-[#3f3f3f] bg-transparent px-2.5 text-[10px] font-black text-white'
                    onClick={() => {
                      window.location.href = '/dashboard';
                    }}
                    type='button'
                  >
                    Dashboard
                  </button>
                  <UserButton afterSignOutUrl='/' />
                </SignedIn>
              </>
            ) : (
              <button
                className='min-h-9 cursor-pointer rounded-lg border border-[#3f3f3f] bg-transparent px-3 text-[10px] font-black text-white'
                onClick={() => {
                  window.location.href = '/login';
                }}
                type='button'
              >
                Login
              </button>
            )}
          </div>
        </div>

        <div
          className={`${isMobileMenuOpen ? 'grid' : 'hidden'} border-b border-[#e4e7ec] bg-white px-3 py-3 max-[640px]:grid-cols-1 min-[641px]:hidden`}
          id='home-mobile-menu'
        >
          <div className='grid gap-2'>
            {navItems.map(([sectionId, label]) => (
              <a
                className={`rounded-lg px-3 py-3 text-sm font-extrabold no-underline ${activeSection === sectionId ? 'bg-[#e6002e] text-white' : 'bg-[#1b1b1b] text-[#d0d0d0]'}`}
                href={`#${sectionId}`}
                key={sectionId}
                onClick={() => handleNavClick(sectionId)}
              >
                {label}
              </a>
            ))}
          </div>
          {clerkEnabled ? (
            <>
              <SignedOut>
                <div className='mt-3 grid grid-cols-2 gap-2'>
                  <button
                    className={`${outlineButton} min-h-10 w-full`}
                    onClick={() => {
                      window.location.href = '/login';
                    }}
                    type='button'
                  >
                    Login
                  </button>
                  <button
                    className={`${redButton} min-h-10 w-full`}
                    onClick={() => {
                      window.location.href = '/signup';
                    }}
                    type='button'
                  >
                    Join Now
                  </button>
                </div>
              </SignedOut>
              <SignedIn>
                <button
                  className={`${outlineButton} mt-3 min-h-10 w-full`}
                  onClick={() => {
                    window.location.href = '/dashboard';
                  }}
                  type='button'
                >
                  Dashboard
                </button>
              </SignedIn>
            </>
          ) : (
            <div className='mt-3 grid grid-cols-2 gap-2'>
              <button
                className={`${outlineButton} min-h-10 w-full`}
                onClick={() => {
                  window.location.href = '/login';
                }}
                type='button'
              >
                Login
              </button>
              <button
                className={`${redButton} min-h-10 w-full`}
                onClick={() => {
                  window.location.href = '/signup';
                }}
                type='button'
              >
                Join Now
              </button>
            </div>
          )}
        </div>

        <div className='flex min-w-[170px] items-center gap-2.5 max-[980px]:min-w-0 max-[640px]:hidden'>
          <FitZoneLogo className='h-9 w-9' />
          <div>
            <h2 className='m-0 text-lg leading-none'>FITZONE</h2>
            <span className='mt-[3px] block text-[8px] font-extrabold text-[#e6002e]'>
              GYM & FITNESS
            </span>
          </div>
        </div>

        <div className='flex items-center gap-5 max-[980px]:w-full max-[980px]:justify-center max-[980px]:overflow-x-auto max-[980px]:pb-1 max-[640px]:hidden'>
          {navItems.map(([sectionId, label]) => (
            <a
              href={`#${sectionId}`}
              className={`shrink-0 cursor-pointer rounded-lg px-3.5 py-[7px] text-[11px] font-bold no-underline transition-colors ${activeSection === sectionId ? 'border border-[#fecdca] bg-[#fef3f2] text-[#b42318]' : 'text-[#475467] hover:bg-[#f9fafb] hover:text-[#1d2939]'}`}
              onClick={() => handleNavClick(sectionId)}
              key={sectionId}
            >
              {label}
            </a>
          ))}
        </div>

        {clerkEnabled ? (
          <div className='flex min-w-[170px] justify-end gap-2.5 max-[980px]:min-w-0 max-[980px]:flex-wrap max-[980px]:justify-center max-[640px]:hidden'>
            <SignedOut>
              <button
                className={`${outlineButton} max-[560px]:w-full`}
                onClick={() => {
                  window.location.href = '/login';
                }}
                type='button'
              >
                Login
              </button>
              <button
                className={`${redButton} max-[560px]:w-full`}
                onClick={() => {
                  window.location.href = '/signup';
                }}
                type='button'
              >
                Join Now
              </button>
            </SignedOut>

            <SignedIn>
              <div className='flex items-center gap-2.5 max-[560px]:col-span-2 max-[560px]:justify-center'>
                <button
                  className={`${outlineButton} min-h-[42px] px-[18px] max-[560px]:w-full`}
                  onClick={() => {
                    window.location.href = '/dashboard';
                  }}
                  type='button'
                >
                  Dashboard
                </button>
                <div className='inline-flex min-h-[42px] items-center gap-2.5 rounded-xl border border-[#3f3f3f] bg-[#1d1d1d] py-0 pl-2 pr-[13px]'>
                  <UserButton afterSignOutUrl='/' />
                  <span className='text-[11px] font-extrabold text-white'>
                    Account
                  </span>
                </div>
              </div>
            </SignedIn>
          </div>
        ) : (
          <div className='flex min-w-[170px] justify-end gap-2.5 max-[980px]:min-w-0 max-[980px]:flex-wrap max-[980px]:justify-center max-[640px]:hidden'>
            <button
              className={`${outlineButton} max-[560px]:w-full`}
              onClick={() => {
                window.location.href = '/login';
              }}
              type='button'
            >
              Login
            </button>
            <button
              className={`${redButton} max-[560px]:w-full`}
              onClick={() => {
                window.location.href = '/signup';
              }}
              type='button'
            >
              Join Now
            </button>
          </div>
        )}
      </nav>

      <section id='home' className='home-hero'>
        <div className='home-hero-copy'>
          <div className='home-eyebrow'>Training built around your goals</div>
          <h1 className='mb-6 mt-0 text-[clamp(43px,6vw,62px)] leading-[1.04] tracking-normal max-[560px]:mb-4 max-[560px]:text-[clamp(34px,11vw,44px)]'>
            Sweat, Strengthen, and Transform Your Body at Our Gym
          </h1>
          <p className='m-0 max-w-[610px] text-sm font-bold leading-[1.35] text-[#f0f0f0] max-[560px]:text-[13px] max-[560px]:leading-[1.5]'>
            Welcome to FitZone, where we are dedicated to helping you achieve
            your fitness goals. With expert trainers and modern equipment, we
            provide a strong fitness experience for all levels.
          </p>
          <div className='mt-[38px] flex flex-wrap gap-3 max-[560px]:mt-6'>
            <button
              className={`${redButton} min-h-12 min-w-[180px] text-sm max-[560px]:w-full`}
              onClick={() => {
                window.location.href = '/signup';
              }}
              type='button'
            >
              Join Us Now!
            </button>
            <a
              className={`${outlineButton} inline-flex min-h-12 min-w-[150px] items-center justify-center text-sm no-underline max-[560px]:w-full`}
              href='#schedule'
              onClick={() => handleNavClick('schedule')}
            >
              View Schedule
            </a>
          </div>
          <div className='home-benefits'>
            {['Expert Coaches', 'Daily Classes', 'Crowd Aware'].map((label) => (
              <span className='home-benefit' key={label}>
                {label}
              </span>
            ))}
          </div>
        </div>
        <figure className='home-hero-visual'>
          <img
            src={gymImg}
            alt='Athlete training with battle ropes at the gym'
            fetchPriority='high'
          />
          <figcaption>
            <span>FITZONE</span>
            <strong>Training built around your goals</strong>
          </figcaption>
        </figure>
      </section>

      <section id='membership' className={sectionClass}>
        <h2 className={sectionTitle}>Membership Plans</h2>
        <div className={redLine}></div>

        {plansStatus === 'loading' && (
          <p className={statusText}>Loading membership plans...</p>
        )}

        {plansStatus === 'error' && (
          <p className={`${statusText} text-[#ff7088]`}>
            Membership plans are unavailable right now.
          </p>
        )}

        {plansStatus === 'ready' && plans.length === 0 && (
          <p className={statusText}>
            No membership plans are available right now.
          </p>
        )}

        {plansStatus === 'ready' && plans.length > 0 && (
          <div className='home-plan-grid'>
            {plans.map((plan) => (
              <div
                className={`home-plan-card ${plan.popular ? 'home-plan-popular' : ''}`}
                key={plan.slug || plan.name}
              >
                {plan.popular && (
                  <span className='mx-auto mb-3.5 mt-[-14px] table rounded-[20px] bg-[#e6002e] px-[22px] py-1.5 text-[9px] font-black text-white'>
                    MOST POPULAR
                  </span>
                )}
                <h3 className='mb-2.5 mt-0 text-center text-2xl leading-[1.1] min-[1200px]:text-[28px] max-[560px]:text-[22px]'>
                  {plan.name}
                </h3>
                <p className='mb-3.5 mt-0 text-center text-[11px] font-bold leading-[1.35] text-[#aaa] min-[1200px]:text-xs max-[560px]:text-[12px]'>
                  {plan.desc}
                </p>
                <h4 className='mb-[22px] mt-0 text-[38px] leading-none text-white min-[1200px]:mb-6 min-[1200px]:text-[46px] max-[560px]:mb-5 max-[560px]:text-[34px]'>
                  {plan.price}
                  <small className='ml-3.5 text-xs text-[#a8a8a8]'>
                    /month
                  </small>
                </h4>

                <h5 className='mb-3 mt-0 text-[11px] min-[1200px]:text-xs'>
                  {plan.title}
                </h5>
                <ul className='mb-[22px] grid list-none gap-[9px] p-0 min-[1200px]:mb-6 min-[1200px]:gap-[11px] max-[560px]:gap-2.5'>
                  {(plan.features || []).map((feature) => (
                    <li
                      className='flex items-center gap-[9px] text-[11px] font-bold text-[#d3d3d3] min-[1200px]:text-xs max-[560px]:text-xs'
                      key={feature}
                    >
                      <span className='grid h-4 w-4 flex-[0_0_16px] place-items-center rounded-full bg-[#e6002e] text-[9px] text-white min-[1200px]:h-[19px] min-[1200px]:w-[19px] min-[1200px]:flex-[0_0_19px] min-[1200px]:text-[10px]'>
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`${plan.premium ? goldButton : redButton} min-h-10 w-full min-[1200px]:min-h-11 min-[1200px]:text-xs max-[560px]:min-h-11`}
                  onClick={() => {
                    window.location.href = `/payment?plan=${encodeURIComponent(plan.slug)}`;
                  }}
                  type='button'
                >
                  {getPlanCtaLabel(plan)}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id='trainers' className={sectionClass}>
        <h2 className={sectionTitle}>MEET THE TEAMS...</h2>
        <div className={redLine}></div>
        <p className='-mt-[30px] mb-[58px] text-center text-sm font-bold text-[#a9a9a9] max-[980px]:-mt-[18px] max-[980px]:mb-9 max-[560px]:mx-auto max-[560px]:max-w-[280px] max-[560px]:text-xs'>
          Professional coaches ready to guide your fitness journey
        </p>

        {trainersStatus === 'loading' && (
          <p className={statusText}>Loading trainers...</p>
        )}

        {trainersStatus === 'error' && (
          <p className={`${statusText} text-[#ff7088]`}>
            Trainers are unavailable right now.
          </p>
        )}

        {trainersStatus === 'ready' && trainers.length === 0 && (
          <p className={statusText}>No trainers are available right now.</p>
        )}

        {trainersStatus === 'ready' && trainers.length > 0 && (
          <div className='home-trainer-grid'>
            {trainers.map((trainer, index) => (
              <div
                className='group home-trainer-card'
                key={trainer.slug || trainer.name}
                role='button'
                tabIndex='0'
                onClick={() => openTrainerProfile(trainer)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openTrainerProfile(trainer);
                  }
                }}
              >
                <div className='absolute left-3.5 right-3.5 top-3 z-[2] flex justify-between gap-2 max-[560px]:flex-wrap'>
                  <span className='rounded-[14px] bg-[#242424] px-[13px] py-1.5 text-[8px] font-black text-white min-[1200px]:px-[15px] min-[1200px]:py-[7px] min-[1200px]:text-[9px]'>
                    {trainer.category}
                  </span>
                  {trainer.badge && (
                    <span className='rounded-[14px] bg-[#e6002e] px-[13px] py-1.5 text-[8px] font-black text-white min-[1200px]:px-[15px] min-[1200px]:py-[7px] min-[1200px]:text-[9px]'>
                      {trainer.badge}
                    </span>
                  )}
                </div>
                <div className='flex h-[70%] items-end justify-center bg-[linear-gradient(180deg,#f8f8f8,#dedede)]'>
                  <img
                    className={`block h-full w-full object-cover ${index === 1 ? 'object-[center_-45px]' : 'object-top'}`}
                    src={trainer.image}
                    alt={trainer.name}
                  />
                </div>
                <div className='home-trainer-copy'>
                  <div className='mb-2.5 h-1.5 w-[52px] rounded-lg bg-[#e6002e]'></div>
                  <h3 className='mb-1.5 mt-0 text-[15px] min-[1200px]:text-lg'>
                    {trainer.name}
                  </h3>
                  <p className='mb-4 mt-0 text-[11px] font-bold text-[#b8b8b8] min-[1200px]:mb-5 min-[1200px]:text-[13px] max-[560px]:mb-3'>
                    {trainer.role}
                  </p>
                  <button
                    className='w-full cursor-pointer rounded-[10px] border border-[#e6002e] bg-transparent p-[9px] text-[10px] font-black text-white transition group-hover:bg-[#e6002e] min-[1200px]:p-[11px] min-[1200px]:text-[11px]'
                    onClick={(event) => {
                      event.stopPropagation();
                      openTrainerProfile(trainer);
                    }}
                    type='button'
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className='home-schedules'>
        {scheduleStatus === 'loading' && (
          <p className='text-center text-[13px] font-extrabold text-[#d5d5d5]'>
            Loading class schedule...
          </p>
        )}

        {scheduleStatus === 'error' && (
          <p className='text-center text-[13px] font-extrabold text-[#ff7088]'>
            Class schedule is unavailable right now.
          </p>
        )}

        {scheduleStatus === 'ready' && weeklySchedule.length === 0 && (
          <p className='text-center text-[13px] font-extrabold text-[#d5d5d5]'>
            No class schedule is available right now.
          </p>
        )}

        {scheduleStatus === 'ready' && weeklySchedule.length > 0 && (
          <>
            <ScheduleBlock
              title='Class Schedule'
              description='Plan your workout with daily classes, expert coaches, and clear class categories.'
              heading='MORNING + AFTERNOON'
              classes={morningClasses}
              days={scheduleDays}
              activeDay={activeScheduleDay}
              activeFilter={activeScheduleFilter}
              onDayChange={setActiveScheduleDay}
              onFilterChange={setActiveScheduleFilter}
            />
            <ScheduleBlock
              title='Evening Schedule'
              description='High-energy evening sessions designed for strength, cardio, and post-work training.'
              heading='EVENING CLASSES'
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

      <footer id='contact' className='home-footer'>
        {siteSettingsStatus === 'loading' && (
          <p className='col-span-full m-0 text-center text-[13px] font-extrabold text-[#d5d5d5]'>
            Loading contact information...
          </p>
        )}

        {siteSettingsStatus === 'error' && (
          <p className='col-span-full m-0 text-center text-[13px] font-extrabold text-[#ff7088]'>
            Contact information is unavailable right now.
          </p>
        )}

        {siteSettingsStatus === 'ready' && siteSettings && (
          <>
            <div>
              <h2 className='mb-4 mt-0 text-[34px] max-[560px]:text-[28px]'>
                {siteSettings.brand?.name}
              </h2>
              <p className='mb-2.5 mt-0 text-xs leading-[1.45] text-[#d6d6d6] max-[560px]:text-[13px]'>
                {siteSettings.brand?.description}
              </p>
            </div>

            <div>
              <h3 className='mb-[18px] mt-0 text-sm text-[#e6002e] max-[560px]:mb-3'>
                Quick Links
              </h3>
              {(siteSettings.quickLinks || []).map((link) => {
                const sectionId = getSectionIdFromLabel(link);

                if (!sectionId) {
                  return (
                    <p
                      className='mb-2.5 mt-0 text-xs leading-[1.45] text-[#d6d6d6] max-[560px]:text-[13px]'
                      key={link}
                    >
                      {link}
                    </p>
                  );
                }

                return (
                  <a
                    className='mb-2.5 block text-xs font-bold leading-[1.45] text-[#d6d6d6] no-underline transition-colors hover:text-[#e6002e] max-[560px]:text-[13px]'
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
              <h3 className='mb-[18px] mt-0 text-sm text-[#e6002e] max-[560px]:mb-3'>
                Contact
              </h3>
              <p className='mb-2.5 mt-0 text-xs leading-[1.45] text-[#d6d6d6] max-[560px]:text-[13px]'>
                {siteSettings.contact?.location}
              </p>
              <p className='mb-2.5 mt-0 text-xs leading-[1.45] text-[#d6d6d6] max-[560px]:text-[13px]'>
                {siteSettings.contact?.phone}
              </p>
              <p className='mb-2.5 mt-0 text-xs leading-[1.45] text-[#d6d6d6] max-[560px]:text-[13px]'>
                {siteSettings.contact?.email}
              </p>
            </div>

            <div>
              <h3 className='mb-[18px] mt-0 text-sm text-[#e6002e] max-[560px]:mb-3'>
                Opening Hours
              </h3>
              {(siteSettings.openingHours || []).map((hours) => (
                <p
                  className='mb-2.5 mt-0 text-xs leading-[1.45] text-[#d6d6d6] max-[560px]:text-[13px]'
                  key={hours}
                >
                  {hours}
                </p>
              ))}
              <h3 className='mb-[18px] mt-0 text-sm text-[#e6002e] max-[560px]:mb-3'>
                Follow Us
              </h3>
              <div className='flex gap-2.5'>
                {(siteSettings.socials || []).map((social) => {
                  const platform = getSocialPlatform(social);

                  if (!platform) return null;

                  return (
                    <a
                      aria-label={`Visit FitZone on ${platform.label}`}
                      className='grid h-8 w-8 place-items-center rounded-full border border-[#e6002e] text-white no-underline transition hover:-translate-y-0.5 hover:bg-[#e6002e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6002e]'
                      href={platform.url}
                      key={social}
                      rel='noopener noreferrer'
                      target='_blank'
                      title={platform.label}
                    >
                      <SocialIcon name={social} />
                    </a>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </footer>
      <div className='border-t border-[#252525] bg-[#0f0f0f] p-[18px] text-center text-[11px] text-[#9f9f9f] max-[560px]:px-4 max-[560px]:text-[10px]'>
        {siteSettings?.copyright || '© 2026 FITZONE. All Rights Reserved.'}
      </div>
    </div>
  );
}

export default Home;
