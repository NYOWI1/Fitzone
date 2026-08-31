const baseMorningClasses = [
  {
    name: "HIIT X FUSION",
    time: "07:30am - 08:00am",
    duration: "30min",
    trainerIndex: 0,
    category: "HIIT",
    color: "green",
  },
  {
    name: "HyroFit",
    time: "08:15am - 09:00am",
    duration: "45min",
    trainerIndex: 1,
    category: "HIIT",
    color: "green",
  },
  {
    name: "GENTLE FLOW YOGA",
    time: "09:00am - 10:00am",
    duration: "60min",
    trainerIndex: 2,
    category: "YOGA",
    color: "gray",
  },
  {
    name: "BODYCOMBAT®",
    time: "10:00am - 11:00am",
    duration: "60min",
    trainerIndex: 3,
    category: "CORE",
    color: "red",
  },
  {
    name: "BODYPUMP®",
    time: "11:00am - 12:00pm",
    duration: "60min",
    trainerIndex: 0,
    category: "STR",
    color: "teal",
  },
  {
    name: "SUSPENSION EXERCISE",
    time: "11:00am - 11:30am",
    duration: "30min",
    trainerIndex: 1,
    category: "STR",
    color: "teal",
  },
  {
    name: "AERIAL FLOW YOGA L2",
    time: "12:00pm - 01:00pm",
    duration: "60min",
    trainerIndex: 2,
    category: "YOGA",
    color: "gray",
  },
  {
    name: "SUSPENSION EXERCISE",
    time: "03:00pm - 03:30pm",
    duration: "30min",
    trainerIndex: 3,
    category: "STR",
    color: "teal",
  },
];

const baseEveningClasses = [
  {
    name: "BODYCOMBAT®",
    time: "04:30pm - 05:30pm",
    duration: "60min",
    trainerIndex: 0,
    category: "CORE",
    color: "red",
  },
  {
    name: "Obstacle",
    time: "05:30pm - 06:15pm",
    duration: "45min",
    trainerIndex: 1,
    category: "HIIT",
    color: "green",
  },
  {
    name: "Bike Tour",
    time: "05:30pm - 06:15pm",
    duration: "45min",
    trainerIndex: 2,
    category: "BIKE",
    color: "yellow",
  },
  {
    name: "Combolo",
    time: "05:30pm - 06:30pm",
    duration: "60min",
    trainerIndex: 3,
    category: "CORE",
    color: "red",
  },
  {
    name: "Gym Ball",
    time: "06:15pm - 07:00pm",
    duration: "45min",
    trainerIndex: 0,
    category: "STR",
    color: "teal",
  },
  {
    name: "BODYPUMP®",
    time: "06:35pm - 07:35pm",
    duration: "60min",
    trainerIndex: 1,
    category: "STR",
    color: "teal",
  },
  {
    name: "HIIT X FUSION",
    time: "07:00pm - 07:30pm",
    duration: "30min",
    trainerIndex: 2,
    category: "HIIT",
    color: "green",
  },
  {
    name: "BODYSTEP®",
    time: "07:40pm - 08:40pm",
    duration: "60min",
    trainerIndex: 3,
    category: "CORE",
    color: "red",
  },
];

const weeklyClassIndexes = [
  [1, 2, 3, 4, 6, 7],
  [0, 1, 2, 3, 4, 5],
  [1, 2, 4, 5, 6, 7],
  [0, 2, 3, 5, 6, 7],
  [1, 3, 4, 5, 6, 7],
  [0, 1, 2, 3, 4, 6],
  [0, 2, 4, 5, 6, 7],
];

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const defaultClassSchedule = dayNames.map((dayName, weekday) => ({
  dayName,
  weekday,
  active: true,
  morning: weeklyClassIndexes[weekday].map(
    (classIndex) => baseMorningClasses[classIndex],
  ),
  evening: weeklyClassIndexes[weekday].map(
    (classIndex) => baseEveningClasses[classIndex],
  ),
}));

module.exports = defaultClassSchedule;
