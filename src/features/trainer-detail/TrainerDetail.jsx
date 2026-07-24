import { useEffect, useState } from "react";
import { getTrainers } from "../../shared/api";
import { attachTrainerImage } from "../../shared/trainers";

function TrainerDetail({ trainer, onBack }) {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#0d0d0d] text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-[1280px] grid-cols-[minmax(280px,0.78fr)_minmax(0,1fr)] items-center gap-[clamp(28px,5vw,72px)] px-[clamp(22px,5vw,72px)] pb-[clamp(34px,6vh,64px)] pt-[clamp(84px,10vh,116px)] max-[960px]:grid-cols-1 max-[960px]:items-start max-[960px]:gap-7 max-[960px]:pt-[92px] max-[640px]:px-4 max-[640px]:pb-7 max-[640px]:pt-[78px]">
        <button
          className="fixed left-[clamp(18px,4vw,56px)] top-[clamp(18px,4vw,38px)] z-20 inline-flex min-h-11 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg border border-[#3a3a3a] bg-[#181818] py-0 pl-2 pr-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(0,0,0,0.36)] transition hover:border-[#e6002e] max-[640px]:min-h-10 max-[640px]:text-xs"
          onClick={onBack}
          type="button"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e6002e] text-[27px] leading-none max-[640px]:h-6 max-[640px]:w-6 max-[640px]:text-2xl">
            ‹
          </span>
          Back to Teams
        </button>

        <div className="grid justify-items-center max-[960px]:order-2 max-[960px]:mx-auto max-[960px]:w-[min(100%,520px)]">
          <div className="relative flex min-h-[560px] w-full items-end justify-center overflow-hidden rounded-lg border border-[#2f2f2f] bg-[linear-gradient(180deg,#1b1b1b_0%,#101010_100%)] px-6 pt-8 max-[1100px]:min-h-[500px] max-[960px]:min-h-[420px] max-[640px]:min-h-[360px] max-[640px]:px-3">
            <div className="absolute inset-x-0 bottom-0 h-1/3 border-t border-[#2f2f2f] bg-[#181818]"></div>
            <img
              className="relative z-[1] block max-h-[560px] w-[min(100%,480px)] object-contain object-bottom drop-shadow-[0_24px_34px_rgba(0,0,0,0.48)] max-[1100px]:max-h-[500px] max-[960px]:max-h-[420px] max-[640px]:max-h-[360px]"
              src={trainer.image}
              alt={trainer.name}
            />
          </div>
        </div>

        <section className="min-w-0 max-[960px]:order-1">
          <div className="mb-5 inline-flex min-h-8 items-center rounded-full border border-[#e6002e] px-4 text-xs font-black uppercase text-[#ff3156]">
            Trainer Profile
          </div>
          <h1 className="mb-3 mt-0 break-words text-[clamp(40px,5.6vw,72px)] leading-none tracking-normal max-[640px]:text-[clamp(34px,11vw,48px)]">
            {trainer.name}
          </h1>
          <h2 className="mb-5 mt-0 max-w-[720px] text-[clamp(21px,2.2vw,30px)] leading-tight text-[#f1f1f1]">
            {trainer.role}
          </h2>
          <div className="mb-7 h-1.5 w-[104px] rounded-lg bg-[#e6002e]"></div>

          <div className="rounded-lg border border-[#333] bg-[#202020] p-[clamp(22px,3.4vw,38px)] shadow-[0_24px_50px_rgba(0,0,0,0.26)]">
            <p className="mb-5 mt-0 text-[clamp(15px,1.45vw,18px)] leading-[1.55] text-[#d0d0d0]">
              {trainer.bio}
            </p>
            <div className="grid gap-3 border-y border-[#363636] py-5">
              <p className="m-0 text-xs font-black uppercase tracking-normal text-[#8f8f8f]">
                Expertise
              </p>
              <p className="m-0 text-[clamp(15px,1.35vw,17px)] font-bold leading-[1.45] text-white">
                {trainer.expertise}
              </p>
            </div>
            <span className="mt-5 inline-flex min-h-[38px] max-w-full items-center justify-center rounded-full bg-[#e6002e] px-5 text-center text-xs font-black uppercase text-white">
              {trainer.coach}
            </span>
          </div>

          <div className="my-6 grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
            {(trainer.stats || []).map(([value, label]) => (
              <div
                className="grid min-h-[88px] content-center gap-1 rounded-lg border border-[#353535] bg-[#171717] p-4"
                key={label}
              >
                <strong className="text-[30px] leading-none text-[#e6002e]">
                  {value}
                </strong>
                <span className="text-xs font-bold leading-tight text-[#c9c9c9]">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <h3 className="mb-3 mt-0 text-lg">Specialties</h3>
          <div className="flex flex-wrap gap-3">
            {(trainer.specialties || []).map((specialty) => (
              <span
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#e6002e] bg-[#161616] px-5 text-center text-xs font-extrabold text-white max-[640px]:w-full"
                key={specialty}
              >
                {specialty}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default TrainerDetail;

export function TrainerDetailRoute({ trainerSlug }) {
  const [trainer, setTrainer] = useState(null);
  const [status, setStatus] = useState("loading");

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
          setStatus(nextTrainer ? "ready" : "not-found");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setTrainer(null);
          setStatus("error");
        }
      }
    }

    loadTrainer();

    return () => {
      isCurrent = false;
    };
  }, [trainerSlug]);

  const goBackToTrainers = () => {
    window.location.href = "/#trainers";
  };

  if (status === "ready" && trainer) {
    return <TrainerDetail trainer={trainer} onBack={goBackToTrainers} />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0d0d0d] px-6 text-center text-white">
      <div className="max-w-[520px] rounded-lg border border-[#333] bg-[#181818] p-8">
        <p className="mb-3 mt-0 text-xs font-black uppercase text-[#e6002e]">
          Trainer Profile
        </p>
        <h1 className="mb-3 mt-0 text-[clamp(28px,7vw,42px)]">
          {status === "loading"
            ? "Loading trainer..."
            : status === "not-found"
              ? "Trainer not found"
              : "Unable to load trainer"}
        </h1>
        <p className="mb-6 mt-0 text-sm leading-[1.5] text-[#bdbdbd]">
          {status === "loading"
            ? "Fetching the trainer profile from the server."
            : "Return to the trainers section and choose another profile."}
        </p>
        <button
          className="min-h-11 cursor-pointer rounded-lg bg-[#e6002e] px-5 text-sm font-black text-white"
          onClick={goBackToTrainers}
          type="button"
        >
          Back to Teams
        </button>
      </div>
    </main>
  );
}
