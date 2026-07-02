const defaultMembershipPlans = [
  {
    slug: "basic",
    name: "Basic",
    price: "1299฿",
    desc: "Best for beginners who want simple gym access.",
    title: "What you get",
    features: ["Full Gym Access", "Locker Access", "Free Consultation", "Cardio & Weight Equipment", "Live Crowd Detection"],
    sortOrder: 1,
    active: true,
  },
  {
    slug: "standard",
    name: "Standard",
    price: "2299฿",
    desc: "Most balanced plan for regular fitness progress.",
    badge: "MOST POPULAR",
    popular: true,
    title: "What you get",
    features: ["3 Group Fitness Classes", "2 Personal Training Sessions", "Monthly Body Analysis", "Sauna & Recovery Sessions", "All Basic features"],
    sortOrder: 2,
    active: true,
  },
  {
    slug: "premium",
    name: "Premium",
    price: "4299฿",
    desc: "For members who want maximum support and results.",
    badge: "ELITE",
    premium: true,
    title: "What you get",
    features: ["Unlimited Fitness Classes", "4 Personal Training Sessions", "Weekly Body Analysis", "Free Nutrition Plan", "VIP Support"],
    sortOrder: 3,
    active: true,
  },
];

module.exports = defaultMembershipPlans;
