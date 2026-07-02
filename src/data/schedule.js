const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });

export function getScheduleDays() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const isToday = date.toDateString() === today.toDateString();

    return [
      isToday ? "Today" : dayFormatter.format(date),
      `${date.getDate()}/${date.getMonth() + 1}`,
    ];
  });
}

export const scheduleDays = getScheduleDays();

export const filters = ["All Classes", "Strength", "HIIT", "Yoga", "Cycling"];

const filterCategories = {
  "All Classes": null,
  Strength: "STR",
  HIIT: "HIIT",
  Yoga: "YOGA",
  Cycling: "BIKE",
};

export function makeScheduleTrainerLabels(trainers) {
  if (!trainers.length) {
    return ["Cbn - Trainer", "Cbn - Trainer", "Cbn - Trainer", "Cbn - Trainer"];
  }

  return trainers.map((trainer) => `Cbn - ${trainer.name}`);
}

function getScheduleTrainer(labels, index) {
  return labels[index % labels.length];
}

export function filterClassesByType(classes, filter) {
  const category = filterCategories[filter];

  if (!category) {
    return classes;
  }

  return classes.filter((classItem) => classItem[4] === category);
}

export function buildScheduleDays(weeklySchedule, scheduleTrainerLabels, days = getScheduleDays()) {
  return days.map((day, dayIndex) => ({
    dayKey: day[0],
    morning: getClassesForWeekday(weeklySchedule, dayIndex, "morning", scheduleTrainerLabels),
    evening: getClassesForWeekday(weeklySchedule, dayIndex, "evening", scheduleTrainerLabels),
  }));
}

function getClassesForWeekday(weeklySchedule, dayIndex, period, scheduleTrainerLabels) {
  const date = new Date();
  date.setDate(date.getDate() - date.getDay() + dayIndex);
  const weekday = date.getDay();
  const daySchedule = weeklySchedule.find((item) => item.weekday === weekday);

  if (!daySchedule) {
    return [];
  }

  return (daySchedule[period] || []).map((classItem, index) => [
    classItem.name,
    classItem.time,
    classItem.duration,
    getScheduleTrainer(scheduleTrainerLabels, classItem.trainerIndex ?? index),
    classItem.category,
    classItem.color,
  ]);
}
