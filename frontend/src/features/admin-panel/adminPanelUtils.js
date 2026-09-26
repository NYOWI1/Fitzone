import { attachTrainerImage } from '../../shared/trainers';

export const menuItems = [
  'Overview',
  'Members',
  'Classes',
  'Trainers',
  'PT Bookings',
  'Plans',
  'Payments',
  'Reports',
  'Crowd Detection',
  'Settings'
];

export const supportedAdminPages = new Set(menuItems.map(getMenuSlug));

export const periodFilters = ['All', 'Morning', 'Evening'];
export const classColors = ['green', 'red', 'gray', 'teal', 'yellow'];
export const classCategories = ['HIIT', 'YOGA', 'CORE', 'STR', 'BIKE'];
export const trainerImageKeys = [
  'trainer1',
  'trainer2',
  'trainer3',
  'trainer4'
];

export function getTodayIsoDate() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;

  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

export function getEmptyClassForm(activeDay = new Date().getDay()) {
  return {
    weekday: activeDay,
    period: 'morning',
    name: '',
    time: '',
    duration: '',
    trainerIndex: 0,
    category: classCategories[0],
    color: classColors[0],
    capacity: 10
  };
}

export function makeSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getEmptyTrainerForm(nextSortOrder = 1) {
  return {
    slug: '',
    name: '',
    role: '',
    imageKey: 'trainer1',
    category: 'FITNESS',
    badge: '',
    coach: '',
    bio: '',
    quote: '',
    expertise: '',
    specialties: '',
    statValue1: '',
    statLabel1: '',
    statValue2: '',
    statLabel2: '',
    statValue3: '',
    statLabel3: '',
    sortOrder: nextSortOrder,
    active: true
  };
}

export function getTrainerFormFromRecord(trainer) {
  const stats = trainer.stats || [];

  return {
    slug: trainer.slug || makeSlug(trainer.name || ''),
    name: trainer.name || '',
    role: trainer.role || '',
    imageKey: trainer.imageKey || 'trainer1',
    category: trainer.category || '',
    badge: trainer.badge || '',
    coach: trainer.coach || '',
    bio: trainer.bio || '',
    quote: trainer.quote || '',
    expertise: trainer.expertise || '',
    specialties: (trainer.specialties || []).join(', '),
    statValue1: stats[0]?.[0] || '',
    statLabel1: stats[0]?.[1] || '',
    statValue2: stats[1]?.[0] || '',
    statLabel2: stats[1]?.[1] || '',
    statValue3: stats[2]?.[0] || '',
    statLabel3: stats[2]?.[1] || '',
    sortOrder: trainer.sortOrder || 1,
    active: trainer.active !== false
  };
}

export function getTrainerPayload(values) {
  return {
    slug: values.slug || makeSlug(values.name),
    name: values.name,
    role: values.role,
    imageKey: values.imageKey,
    category: values.category,
    badge: values.badge,
    coach: values.coach,
    bio: values.bio,
    quote: values.quote || '',
    profileContentUpdated: true,
    expertise: values.expertise,
    specialties: values.specialties
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    stats: [
      [values.statValue1, values.statLabel1],
      [values.statValue2, values.statLabel2],
      [values.statValue3, values.statLabel3]
    ].filter(([value, label]) => value && label),
    sortOrder: Number(values.sortOrder),
    active: values.active
  };
}

export function getEmptyPlanForm(nextSortOrder = 1) {
  return {
    slug: '',
    name: '',
    price: '',
    desc: '',
    badge: '',
    popular: false,
    title: '',
    features: '',
    sortOrder: nextSortOrder,
    active: true
  };
}

export function getPlanFormFromRecord(plan) {
  return {
    slug: plan.slug || makeSlug(plan.name || ''),
    name: plan.name || '',
    price: plan.price || '',
    desc: plan.desc || '',
    badge: plan.popular ? 'MOST POPULAR' : '',
    popular: plan.popular === true,
    title: plan.title || '',
    features: (plan.features || []).join(', '),
    sortOrder: plan.sortOrder || 1,
    active: plan.active !== false
  };
}

export function getPlanPayload(values) {
  return {
    slug: values.slug || makeSlug(values.name),
    name: values.name,
    price: values.price,
    desc: values.desc,
    badge: values.popular ? 'MOST POPULAR' : '',
    popular: values.popular,
    premium: false,
    title: values.title,
    features: values.features
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    sortOrder: Number(values.sortOrder),
    active: values.active
  };
}

export function getMenuSlug(item) {
  return item.toLowerCase().replace(/\s+/g, '-');
}

export function getActiveAdminPage() {
  const pathPage = window.location.pathname.split('/').filter(Boolean)[1];
  const hashPage = window.location.hash.replace('#', '');
  const requestedPage = pathPage || hashPage || 'overview';

  return supportedAdminPages.has(requestedPage) ? requestedPage : 'overview';
}

export function getAdminPageFromMenuSlug(slug) {
  return supportedAdminPages.has(slug) ? slug : 'overview';
}

export function getAdminPageUrl(page) {
  return page === 'overview' ? '/admin' : `/admin/${page}`;
}

export function getClassCount(daySchedule) {
  return (
    (daySchedule?.morning?.length || 0) + (daySchedule?.evening?.length || 0)
  );
}

export function getScheduleClassesForPeriod(daySchedule, period) {
  if (!daySchedule) {
    return [];
  }

  if (period === 'Morning') {
    return (daySchedule.morning || []).map((classItem, index) => ({
      ...classItem,
      period: 'Morning',
      periodKey: 'morning',
      periodIndex: index
    }));
  }

  if (period === 'Evening') {
    return (daySchedule.evening || []).map((classItem, index) => ({
      ...classItem,
      period: 'Evening',
      periodKey: 'evening',
      periodIndex: index
    }));
  }

  return [
    ...(daySchedule.morning || []).map((classItem, index) => ({
      ...classItem,
      period: 'Morning',
      periodKey: 'morning',
      periodIndex: index
    })),
    ...(daySchedule.evening || []).map((classItem, index) => ({
      ...classItem,
      period: 'Evening',
      periodKey: 'evening',
      periodIndex: index
    }))
  ];
}

export function getTrainerName(trainers, trainerIndex) {
  const trainer = trainers[trainerIndex % Math.max(trainers.length, 1)];

  return trainer?.name || 'Unassigned trainer';
}

export function getClassesStats(schedule) {
  const allClasses = schedule.flatMap((daySchedule) => [
    ...(daySchedule.morning || []),
    ...(daySchedule.evening || [])
  ]);
  const activeDays = schedule.filter(
    (daySchedule) => daySchedule.active !== false
  ).length;
  const categories = new Set(
    allClasses.map((classItem) => classItem.category).filter(Boolean)
  );
  const eveningClasses = schedule.reduce(
    (total, daySchedule) => total + (daySchedule.evening?.length || 0),
    0
  );

  return [
    {
      label: 'Weekly Classes',
      value: String(allClasses.length),
      note: `${activeDays} active days`,
      tone: 'red'
    },
    {
      label: 'Active Days',
      value: String(activeDays),
      note: 'Published schedule',
      tone: 'green'
    },
    {
      label: 'Categories',
      value: String(categories.size),
      note: 'Class categories',
      tone: 'yellow'
    },
    {
      label: 'Evening Classes',
      value: String(eveningClasses),
      note: 'After work slots',
      tone: 'blue'
    }
  ];
}

export function filterVisibleClasses(classes, trainers, searchTerm) {
  const query = searchTerm.trim().toLowerCase();

  if (!query) {
    return classes;
  }

  return classes.filter((classItem, index) => {
    const trainerName = getTrainerName(
      trainers,
      classItem.trainerIndex ?? index
    );
    const searchableText = [
      classItem.name,
      classItem.time,
      classItem.duration,
      trainerName,
      classItem.category,
      classItem.period
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(query);
  });
}

export function getTrainerStats(trainers) {
  const activeTrainers = trainers.filter(
    (trainer) => trainer.active !== false
  ).length;
  const categories = new Set(
    trainers.map((trainer) => trainer.category).filter(Boolean)
  );
  const popularTrainers = trainers.filter((trainer) => trainer.badge).length;
  const oneOnOneCoaches = trainers.filter((trainer) =>
    (trainer.stats || []).some(([value]) => String(value).includes('1:1'))
  ).length;

  return [
    {
      label: 'Active Trainers',
      value: String(activeTrainers),
      note: 'Available in database',
      tone: 'red'
    },
    {
      label: 'Categories',
      value: String(categories.size),
      note: 'Training departments',
      tone: 'green'
    },
    {
      label: 'Featured',
      value: String(popularTrainers),
      note: 'With admin badge',
      tone: 'yellow'
    },
    {
      label: '1:1 Coaches',
      value: String(oneOnOneCoaches),
      note: 'Personal training ready',
      tone: 'blue'
    }
  ];
}

export function filterTrainers(trainers, searchTerm) {
  const query = searchTerm.trim().toLowerCase();

  if (!query) {
    return trainers;
  }

  return trainers.filter((trainer) => {
    const searchableText = [
      trainer.name,
      trainer.role,
      trainer.category,
      trainer.coach,
      trainer.expertise,
      ...(trainer.specialties || [])
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(query);
  });
}

export function getTrainerCategoryBreakdown(trainers) {
  return trainers.reduce((categories, trainer) => {
    const category = trainer.category || 'GENERAL';

    return {
      ...categories,
      [category]: (categories[category] || 0) + 1
    };
  }, {});
}

export function getPlanPriceValue(plan) {
  return Number(String(plan.price || '').replace(/[^\d.]/g, '')) || 0;
}

export function getPlanStats(plans) {
  const activePlans = plans.filter((plan) => plan.active !== false).length;
  const popularPlans = plans.filter((plan) => plan.popular).length;
  const averagePrice = plans.length
    ? Math.round(
        plans.reduce((total, plan) => total + getPlanPriceValue(plan), 0) /
          plans.length
      )
    : 0;

  return [
    {
      label: 'Active Plans',
      value: String(activePlans),
      note: 'Available to members',
      tone: 'red'
    },
    {
      label: 'Featured Plans',
      value: String(popularPlans),
      note: 'Marked popular',
      tone: 'green'
    },
    {
      label: 'Total Plans',
      value: String(plans.length),
      note: 'In database',
      tone: 'yellow'
    },
    {
      label: 'Avg. Price',
      value: `${averagePrice}฿`,
      note: 'Monthly estimate',
      tone: 'blue'
    }
  ];
}

export function filterPlans(plans, searchTerm) {
  const query = searchTerm.trim().toLowerCase();

  if (!query) {
    return plans;
  }

  return plans.filter((plan) => {
    const searchableText = [
      plan.name,
      plan.price,
      plan.desc,
      plan.popular ? 'MOST POPULAR' : '',
      plan.title,
      ...(plan.features || [])
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(query);
  });
}

export function getMemberStats(members) {
  const activeMembers = members.filter(
    (member) => member.status === 'Active'
  ).length;
  const newMembers = members.filter((member) => {
    if (!member.joined) {
      return false;
    }

    const joinedDate = new Date(member.joined);
    const now = new Date();
    const daysSinceJoined = (now - joinedDate) / (1000 * 60 * 60 * 24);

    return daysSinceJoined <= 30;
  }).length;
  const expiringSoon = members.filter((member) => {
    if (!member.renewal) {
      return false;
    }

    const renewalDate = new Date(member.renewal);
    const now = new Date();
    const daysUntilRenewal = (renewalDate - now) / (1000 * 60 * 60 * 24);

    return daysUntilRenewal >= 0 && daysUntilRenewal <= 14;
  }).length;
  const premiumMembers = members.filter(
    (member) => member.plan === 'Premium'
  ).length;

  return [
    {
      label: 'Active Members',
      value: String(activeMembers),
      note: 'Clerk users',
      tone: 'green'
    },
    {
      label: 'New Signups',
      value: String(newMembers),
      note: 'Last 30 days',
      tone: 'red'
    },
    {
      label: 'Expiring Soon',
      value: String(expiringSoon),
      note: 'Next 14 days',
      tone: 'yellow'
    },
    {
      label: 'Premium Plans',
      value: String(premiumMembers),
      note: 'Highest plan tier',
      tone: 'blue'
    }
  ];
}

export function filterMembers(members, searchTerm) {
  const query = searchTerm.trim().toLowerCase();

  if (!query) {
    return members;
  }

  return members.filter((member) => {
    const searchableText = [
      member.memberId,
      member.name,
      member.email,
      member.phone,
      member.plan,
      member.status,
      member.joined,
      member.renewal
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(query);
  });
}

export function filterMembersByStatus(members, statusFilter) {
  if (statusFilter === 'All') {
    return members;
  }

  if (statusFilter === 'Expiring') {
    return members.filter((member) => {
      if (!member.renewal) {
        return false;
      }

      const renewalDate = new Date(member.renewal);
      const now = new Date();
      const daysUntilRenewal = (renewalDate - now) / (1000 * 60 * 60 * 24);

      return daysUntilRenewal >= 0 && daysUntilRenewal <= 14;
    });
  }

  return members.filter((member) => member.status === statusFilter);
}

export function getMemberPlanBreakdown(members) {
  return Object.entries(
    members.reduce(
      (plans, member) => ({
        ...plans,
        [member.plan]: (plans[member.plan] || 0) + 1
      }),
      {}
    )
  ).map(([plan, count], index) => [
    plan,
    count,
    ['blue', 'red', 'yellow', 'green'][index % 4]
  ]);
}

export function getMemberActivity(members) {
  const totalVisits = members.reduce(
    (total, member) => total + (Number(member.visits) || 0),
    0
  );
  const todayAttendance = getTodayAttendanceCount(members);
  const paymentIssues = members.filter(
    (member) => member.status === 'Pending' || member.status === 'Expired'
  ).length;

  return [
    ['Total visits', String(totalVisits)],
    ['Today attendance', String(todayAttendance)],
    [
      'Active accounts',
      String(members.filter((member) => member.status === 'Active').length)
    ],
    ['Payment issues', String(paymentIssues)]
  ];
}

export function getTodayAttendanceCount(members) {
  const today = getTodayIsoDate();

  return members.filter(
    (member) =>
      member.attendanceDate === today && Number(member.todayVisits || 0) > 0
  ).length;
}

export function getTodayVisitTotal(members) {
  const today = getTodayIsoDate();

  return members.reduce(
    (total, member) =>
      member.attendanceDate === today
        ? total + Number(member.todayVisits || 0)
        : total,
    0
  );
}

export function getPaymentAmountValue(payment) {
  return Number(String(payment.amount || '').replace(/[^\d.]/g, '')) || 0;
}

export function formatPaymentAmount(payment) {
  const amount = getPaymentAmountValue(payment);

  if (!amount) {
    return payment.amount || '0฿';
  }

  return `${amount.toLocaleString()}฿`;
}

export function formatPaymentDate(date) {
  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).format(new Date(date));
}

export function getPaymentDetail(payment) {
  if (payment.paymentType === 'credit_card') {
    const brand = payment.card?.brand || 'Card';
    const last4 = payment.card?.last4 ? `•••• ${payment.card.last4}` : '';

    return [brand, last4].filter(Boolean).join(' ');
  }

  if (payment.paymentType === 'promptpay_qr') {
    return payment.promptPay?.qrReference || 'PromptPay QR';
  }

  return payment.method;
}

export function formatCompactBaht(amount) {
  if (amount >= 1000) {
    return `${Math.round(amount / 1000).toLocaleString()}k฿`;
  }

  return `${amount.toLocaleString()}฿`;
}

export function getRelativeDateLabel(dateValue) {
  if (!dateValue) {
    return 'Unknown';
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const daysAgo = Math.floor(
    (startOfToday - startOfDate) / (1000 * 60 * 60 * 24)
  );

  if (daysAgo <= 0) {
    return 'Today';
  }

  if (daysAgo === 1) {
    return '1 day ago';
  }

  return `${daysAgo} days ago`;
}

export function getOverviewKpis({
  members,
  schedule,
  trainers,
  stripeRevenue
}) {
  const allClasses = schedule.flatMap((daySchedule) => [
    ...(daySchedule.morning || []),
    ...(daySchedule.evening || [])
  ]);
  const todaySchedule = schedule.find(
    (daySchedule) => daySchedule.weekday === new Date().getDay()
  );
  const todayClassCount = getClassCount(todaySchedule);
  const newMembers = members.filter((member) => {
    if (!member.joined) {
      return false;
    }

    const joinedDate = new Date(member.joined);
    const now = new Date();
    const daysSinceJoined = (now - joinedDate) / (1000 * 60 * 60 * 24);

    return daysSinceJoined <= 30;
  }).length;
  const monthlyRevenue = Number(stripeRevenue.monthlyRevenue || 0);
  const paidInvoiceCount = Number(stripeRevenue.paidInvoiceCount || 0);

  return [
    {
      label: 'Total Members',
      value: members.length.toLocaleString(),
      note: `${newMembers} new this month`,
      tone: 'red'
    },
    {
      label: 'Classes / Week',
      value: String(allClasses.length),
      note: `${todayClassCount} active today`,
      tone: 'green'
    },
    {
      label: 'Trainers',
      value: String(trainers.length),
      note: `${trainers.filter((trainer) => trainer.active !== false).length} available now`,
      tone: 'yellow'
    },
    {
      label: 'Monthly Revenue',
      value: formatCompactBaht(monthlyRevenue),
      note: `${paidInvoiceCount} Stripe payments`,
      tone: 'blue'
    }
  ];
}

export function getOverviewRecentMembers(members) {
  return [...members]
    .sort(
      (left, right) => new Date(right.joined || 0) - new Date(left.joined || 0)
    )
    .slice(0, 4)
    .map((member, index) => ({
      name: member.name || 'Member',
      id:
        member.memberId ||
        member.email ||
        `${member.name || 'member'}-${index}`,
      email: member.email || 'No email',
      plan: member.plan || 'Unassigned',
      status: member.status || 'Unknown',
      joined: getRelativeDateLabel(member.joined),
      imageUrl: member.imageUrl || '',
      tone: member.tone || ['red', 'green', 'yellow', 'blue'][index % 4]
    }));
}

export function getOverviewTodayClasses(schedule) {
  const todaySchedule = schedule.find(
    (daySchedule) => daySchedule.weekday === new Date().getDay()
  );

  return getScheduleClassesForPeriod(todaySchedule, 'All').map(
    (classItem, index) => ({
      id: `${classItem.periodKey}-${classItem.periodIndex}-${classItem.name}-${index}`,
      name: classItem.name,
      time: classItem.time,
      duration: classItem.duration || 'Open',
      meta: [classItem.period, classItem.category].filter(Boolean).join(' / '),
      status: classItem.status || 'open'
    })
  );
}

export function getOverviewRevenueBars(stripeRevenue) {
  const serverBars = Array.isArray(stripeRevenue.revenueBars)
    ? stripeRevenue.revenueBars
    : [];
  const now = new Date();
  const months = Array.from(
    { length: 12 },
    (_, index) => new Date(now.getFullYear(), now.getMonth() - 11 + index, 1)
  );
  const totals = months.map((monthDate) => {
    const monthLabel = monthDate.toLocaleString('en-US', { month: 'short' });
    const matchingBar = serverBars.find((bar) => bar.month === monthLabel);

    return Number(matchingBar?.total || 0);
  });
  const maxTotal = Math.max(...totals, 1);

  return months.map((monthDate, index) => ({
    month: monthDate.toLocaleString('en-US', { month: 'short' }),
    height: Math.max(10, Math.round((totals[index] / maxTotal) * 92)),
    total: totals[index],
    label: formatCompactBaht(totals[index])
  }));
}

export function getOverviewRevenueSummary(stripeRevenue) {
  const revenueBars = Array.isArray(stripeRevenue.revenueBars)
    ? stripeRevenue.revenueBars
    : [];
  const twelveMonthTotal = revenueBars.reduce(
    (total, bar) => total + Number(bar.total || 0),
    0
  );

  return [
    [
      'This month',
      formatPaymentAmount({ amount: stripeRevenue.monthlyRevenue || 0 })
    ],
    ['12-month total', formatPaymentAmount({ amount: twelveMonthTotal })],
    ['Paid payments', String(stripeRevenue.paidInvoiceCount || 0)]
  ];
}

export function getReportTopClass(schedule) {
  const classCounts = schedule
    .flatMap((daySchedule) => getScheduleClassesForPeriod(daySchedule, 'All'))
    .reduce((counts, classItem) => {
      const label = classItem.category || classItem.name || 'Class';

      return {
        ...counts,
        [label]: (counts[label] || 0) + 1
      };
    }, {});
  const [topClass] =
    Object.entries(classCounts).sort((left, right) => right[1] - left[1])[0] ||
    [];

  return topClass || 'N/A';
}

export function getReportsKpis({ members, schedule, stripeRevenue }) {
  const todayAttendance = getTodayAttendanceCount(members);
  const todayVisitTotal = getTodayVisitTotal(members);
  const newMembers = members.filter((member) => {
    if (!member.joined) {
      return false;
    }

    const joinedDate = new Date(member.joined);
    const now = new Date();
    const daysSinceJoined = (now - joinedDate) / (1000 * 60 * 60 * 24);

    return daysSinceJoined <= 30;
  }).length;

  return [
    {
      label: 'Monthly Revenue',
      value: formatCompactBaht(Number(stripeRevenue.monthlyRevenue || 0)),
      tone: 'blue'
    },
    {
      label: 'Today Attendance',
      value: String(todayAttendance),
      note: `${todayVisitTotal} manual visits`,
      tone: 'green'
    },
    {
      label: 'Top Class',
      value: getReportTopClass(schedule),
      tone: 'red'
    },
    {
      label: 'New Members',
      value: String(newMembers),
      tone: 'yellow'
    }
  ];
}

export function getReportYearOptions(payments) {
  const currentYear = new Date().getFullYear();
  const years = new Set(
    Array.from({ length: 11 }, (_, index) => currentYear - 7 + index)
  );

  payments.forEach((payment) => {
    if (payment.date) {
      years.add(new Date(payment.date).getFullYear());
    }
  });

  return [...years]
    .filter((year) => Number.isFinite(year))
    .sort((left, right) => right - left);
}

export function getReportsYearRevenue({
  payments,
  stripeRevenue,
  selectedYear
}) {
  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Date(selectedYear, index, 1).toLocaleString('en-US', {
      month: 'short'
    })
  );
  const totals = Array(12).fill(0);

  payments.forEach((payment) => {
    if (payment.status !== 'Paid' || !payment.date) {
      return;
    }

    const paymentDate = new Date(payment.date);

    if (paymentDate.getFullYear() === Number(selectedYear)) {
      totals[paymentDate.getMonth()] += getPaymentAmountValue(payment);
    }
  });

  if (
    totals.every((total) => total === 0) &&
    Number(selectedYear) === new Date().getFullYear()
  ) {
    (stripeRevenue.revenueBars || []).forEach((bar) => {
      const monthIndex = monthNames.indexOf(bar.month);

      if (monthIndex >= 0) {
        totals[monthIndex] = Number(bar.total || 0);
      }
    });
  }

  const maxTotal = Math.max(...totals, 1);
  const yearlyTotal = totals.reduce((total, amount) => total + amount, 0);

  return {
    yearlyTotal,
    bars: monthNames.map((month, index) => ({
      month,
      total: totals[index],
      label: formatCompactBaht(totals[index]),
      height: Math.max(10, Math.round((totals[index] / maxTotal) * 180))
    }))
  };
}

export function getAdminSettingsRows(settings) {
  const openingHours =
    Array.isArray(settings.openingHours) && settings.openingHours.length
      ? settings.openingHours.join('\n')
      : '';

  return [
    {
      key: 'gymName',
      label: 'Gym Name',
      value: settings.brand?.name || '',
      displayValue: settings.brand?.name || 'Not set'
    },
    {
      key: 'adminEmail',
      label: 'Admin Email',
      value: settings.contact?.email || '',
      displayValue: settings.contact?.email || 'Not set',
      inputType: 'email'
    },
    {
      key: 'openingHours',
      label: 'Opening Hours',
      value: openingHours,
      displayValue: openingHours || 'Not set',
      multiline: true
    },
    {
      key: 'location',
      label: 'Location',
      value: settings.contact?.location || '',
      displayValue: settings.contact?.location || 'Not set'
    },
    {
      key: 'phone',
      label: 'Phone No.',
      value: settings.contact?.phone || '',
      displayValue: settings.contact?.phone || 'Not set',
      inputType: 'tel'
    }
  ];
}

export function applyAdminSettingsValue(settings, key, value) {
  const nextSettings = {
    ...settings,
    brand: {
      ...(settings.brand || {})
    },
    contact: {
      ...(settings.contact || {})
    }
  };

  if (key === 'gymName') {
    nextSettings.brand.name = value;
  }

  if (key === 'adminEmail') {
    nextSettings.contact.email = value;
  }

  if (key === 'openingHours') {
    nextSettings.openingHours = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (key === 'location') {
    nextSettings.contact.location = value;
  }

  if (key === 'phone') {
    nextSettings.contact.phone = value;
  }

  return nextSettings;
}

export function getPaymentStats(payments) {
  const paidPayments = payments.filter((payment) => payment.status === 'Paid');
  const pendingPayments = payments.filter(
    (payment) => payment.status === 'Pending'
  );
  const failedPayments = payments.filter(
    (payment) => payment.status === 'Failed'
  );
  const paidTotal = paidPayments.reduce(
    (total, payment) => total + getPaymentAmountValue(payment),
    0
  );

  return [
    {
      label: 'Paid Revenue',
      value: `${paidTotal.toLocaleString()}฿`,
      note: 'Collected invoices',
      tone: 'red'
    },
    {
      label: 'Paid Invoices',
      value: String(paidPayments.length),
      note: 'Completed payments',
      tone: 'green'
    },
    {
      label: 'Pending',
      value: String(pendingPayments.length),
      note: 'Awaiting payment',
      tone: 'yellow'
    },
    {
      label: 'Failed',
      value: String(failedPayments.length),
      note: 'Needs follow-up',
      tone: 'blue'
    }
  ];
}

export function filterPayments(payments, searchTerm) {
  const query = searchTerm.trim().toLowerCase();

  if (!query) {
    return payments;
  }

  return payments.filter((payment) => {
    const searchableText = [
      payment.invoice,
      payment.member,
      payment.plan,
      payment.amount,
      payment.method,
      payment.status,
      payment.date
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(query);
  });
}

export function filterPaymentsByMethod(payments, methodFilter) {
  if (methodFilter === 'All') {
    return payments;
  }

  return payments.filter((payment) => payment.method === methodFilter);
}
