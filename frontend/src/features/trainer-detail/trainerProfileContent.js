const expertise = [
  'Weight Loss',
  'Muscle Gain',
  'Muscle Conditioning',
  'Functional Training',
  'Athletic Performance',
  'General Fitness'
];

export const trainerProfileContent = {
  'sein-tun-tuck': {
    quote: 'Health brings happiness and confidence.',
    training: 'Class Training',
    role: 'Lead Trainer · Athletic Performance',
    paragraphs: [
      'Sein Tun Tuck discovered his passion for fitness as a volleyball athlete. That sporting background inspires his approach to building strength, improving movement, and helping people feel confident in their bodies.',
      'As a lead trainer, he is committed to helping FitZone members improve their health and physique through supportive coaching and purposeful training.'
    ],
    expertise
  },
  'may-myat-bhone-swe': {
    quote: 'First you start fitness to look good, then it becomes a lifestyle.',
    training: 'Private Training',
    role: 'Physique Trainer · Pilates & Mobility',
    paragraphs: [
      'May Myat Bhone Swe specializes in body shaping and Pilates. Her training combines strength and mobility to help members build a balanced, sustainable fitness routine.',
      'She helps people develop healthy habits and find greater balance in body and mind. Her sessions are challenging, enjoyable, and focused on steady progress.'
    ],
    expertise
  },
  'may-thet-htar-lwin': {
    quote: 'Fitness isn’t a seasonal hobby. Fitness is a lifestyle.',
    training: 'Private Training',
    role: 'Personal Trainer · Body Transformation',
    paragraphs: [
      'May Thet Htar Lwin specializes in body transformation through personalized weight management, strength training, and nutrition guidance.',
      'Passionate about women’s fitness, she creates training programs that build strength, confidence, and overall well-being. Her goal is to help you develop a healthier, happier lifestyle.'
    ],
    expertise
  },
  'moe-myint-cho': {
    quote: 'No pain, no gain.',
    training: 'Private Training',
    role: 'Personal Trainer · Strength & Healthy Habits',
    paragraphs: [
      'Coming from a corporate background and having experienced health challenges herself, Moe Myint Cho understands how a sedentary routine can affect everyday well-being. Her own fitness journey inspired her to help others make lasting changes.',
      'Her coaching is beginner-friendly, with training and nutrition guidance focused on sustainable habits. She is committed to helping members build confidence and transform their lives through consistent progress.'
    ],
    expertise
  }
};

export function getTrainerProfile(trainer) {
  if (!trainer.profileContentUpdated && trainerProfileContent[trainer.slug]) {
    return trainerProfileContent[trainer.slug];
  }
  return {
    role: trainer.role,
    training: trainer.coach,
    quote: trainer.quote || '',
    paragraphs: String(trainer.bio || '')
      .split(/\n\s*\n/)
      .filter(Boolean),
    expertise: String(trainer.expertise || '')
      .split(',')
      .map((item) => item.trim().replace(/\.$/, ''))
      .filter(Boolean)
  };
}
