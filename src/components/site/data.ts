// Centralized school information for Trail Gliders Academy

export const SCHOOL = {
  name: "Trail Gliders Academy",
  shortName: "TGA",
  tagline: "Excellence as You Glide Beyond Limits",
  motto: "Knowledge • Character • Service",
  founded: 2009,
  location: "Nsukka, Enugu State, Nigeria",
  address: "15 Gliders Avenue, University Town, Nsukka, Enugu State, Nigeria",
  phone: "+234 803 456 7890",
  phoneAlt: "+234 701 234 5678",
  email: "info@trailgliders.edu.ng",
  admissionsEmail: "admissions@trailgliders.edu.ng",
  hours: "Monday – Friday: 7:30 AM – 3:30 PM",
  crest: "/crest/school-crest.png",
} as const;

export const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Academics", href: "#academics" },
  { label: "Campus Life", href: "#campus-life" },
  { label: "Admissions", href: "#admissions" },
  { label: "News", href: "#news" },
  { label: "Contact", href: "#contact" },
] as const;

export const STATS = [
  { value: 16, suffix: "+", label: "Years of Excellence", description: "Nurturing young minds since 2009" },
  { value: 850, suffix: "+", label: "Happy Pupils", description: "From Nursery to Primary 6" },
  { value: 45, suffix: "", label: "Expert Educators", description: "Certified and passionate teachers" },
  { value: 98, suffix: "%", label: "Placement Rate", description: "Gain admission into top secondary schools" },
] as const;

export const VALUES = [
  {
    icon: "BookOpen",
    title: "Academic Excellence",
    description:
      "A rigorous, future-ready curriculum blending the Nigerian UBE syllabus with global best practices — delivered by certified, child-centered educators who ignite curiosity and a lifelong love of learning.",
  },
  {
    icon: "Heart",
    title: "Character Formation",
    description:
      "We shape honest, respectful, and confident Gliders through daily mentorship, value-based discipline, and a culture of kindness. Every child is known, seen, and celebrated for who they are becoming.",
  },
  {
    icon: "Sparkles",
    title: "Creative Expression",
    description:
      "From art studios to coding clubs, music suites to drama stages, we give every child the canvas to discover their unique voice and the courage to share it boldly with the world.",
  },
  {
    icon: "Globe",
    title: "Global Perspective",
    description:
      "Rooted in Nsukka, open to the world. Our pupils explore cultures, languages, and ideas that prepare them to lead with empathy in an interconnected global community.",
  },
] as const;

export const PROGRAMS = [
  {
    name: "Early Years (Nursery)",
    ages: "Ages 3 – 5",
    image: "/images/library.jpg",
    color: "orange",
    tagline: "Where wonder takes flight",
    description:
      "A play-based, Montessori-inspired foundation where little Gliders explore phonics, numeracy, sensory play, and social-emotional skills in a warm, safe, and joyful environment.",
    features: [
      "Montessori-inspired learning stations",
      "Daily phonics & early numeracy",
      "Creative arts, music & movement",
      "Quiet nap & healthy snack routines",
      "Caring, certified early-years teachers",
    ],
  },
  {
    name: "Lower Primary",
    ages: "Primary 1 – 3",
    image: "/images/computer-lab.jpg",
    color: "navy",
    tagline: "Building strong foundations",
    description:
      "Children transition into structured literacy, numeracy, and inquiry-based STEM while developing independent study habits, digital fluency, and a deep appreciation for reading.",
    features: [
      "English, Maths, Basic Science & Technology",
      "Coding & robotics introduction",
      "Guided reading library sessions",
      "Hands-on STEM discovery labs",
      "Citizenship & moral instruction",
    ],
  },
  {
    name: "Upper Primary",
    ages: "Primary 4 – 6",
    image: "/images/science.jpg",
    color: "gold",
    tagline: "Gliding beyond limits",
    description:
      "Pupils hone critical thinking, leadership, and exam readiness through project-based learning, national competition coaching, and secondary-school transition preparation.",
    features: [
      "Common Entrance examination coaching",
      "Leadership & public speaking program",
      "Advanced STEM, robotics & chess",
      "Entrepreneurship & financial literacy",
      "Mentorship & secondary school placement",
    ],
  },
] as const;

export const WHY_US = [
  {
    icon: "Award",
    title: "Top-Ranked in Nsukka",
    description:
      "Consistently recognized among the leading primary schools in Enugu State for academic distinction and holistic pupil development.",
  },
  {
    icon: "Users",
    title: "Small Class Sizes",
    description:
      "A 1:12 teacher-to-pupil ratio ensures every child receives personal attention, tailored feedback, and the space to thrive.",
  },
  {
    icon: "FlaskConical",
    title: "Modern STEM Labs",
    description:
      "Dedicated science, robotics, and ICT labs equip pupils with the digital and analytical skills of the 21st century.",
  },
  {
    icon: "ShieldCheck",
    title: "Safe & Secure Campus",
    description:
      "CCTV-monitored grounds, trained security personnel, and a caring pastoral team keep every Glider safe and supported.",
  },
  {
    icon: "Bus",
    title: "Door-to-Door Transport",
    description:
      "A fleet of GPS-tracked school buses serves Nsukka and surrounding towns with vetted drivers and chaperones.",
  },
  {
    icon: "Apple",
    title: "Healthy Meal Plans",
    description:
      "Nutritionist-designed hot lunches and snacks fuel growing minds — prepared fresh daily in our hygienic kitchen.",
  },
] as const;

export const CAMPUS_LIFE = [
  { image: "/images/sports.jpg", title: "Sports & Athletics", description: "Football, athletics, swimming, and table tennis" },
  { image: "/images/arts.jpg", title: "Creative Arts", description: "Painting, sculpture, drama, and choir" },
  { image: "/images/science.jpg", title: "STEM Club", description: "Robotics, coding, and science fairs" },
  { image: "/images/library.jpg", title: "Reading Corner", description: "A 6,000-book library to spark imagination" },
  { image: "/images/computer-lab.jpg", title: "Digital Lab", description: "Modern ICT suites with 1:1 devices" },
  { image: "/images/graduation.jpg", title: "Graduation Day", description: "Celebrating the next generation of leaders" },
] as const;

export const FACULTY = [
  {
    name: "Dr. Mrs. Adaeze Okonkwo",
    role: "Head of School",
    image: "/images/teacher-1.jpg",
    bio: "PhD in Early Childhood Education (University of Nigeria, Nsukka). 22 years shaping young minds with warmth and rigor.",
    quote: "Every child carries a spark. Our duty is to fan it into a flame.",
  },
  {
    name: "Mr. Chijioke Eze",
    role: "Head, Upper Primary",
    image: "/images/teacher-2.jpg",
    bio: "B.Ed Mathematics, Nsukka. National Common Entrance Coach of the Year, 2022 & 2024.",
    quote: "Mathematics is not a subject — it is a way of seeing the world.",
  },
  {
    name: "Mrs. Ngozi Ugwu",
    role: "Head, Lower Primary",
    image: "/images/teacher-3.jpg",
    bio: "Montessori-certified educator with 15 years guiding early readers into confident, curious learners.",
    quote: "When a child falls in love with reading, every door opens.",
  },
  {
    name: "Mr. Emeka Nwosu",
    role: "STEM & Robotics Lead",
    image: "/images/teacher-4.jpg",
    bio: "First-class B.Sc Computer Science. Coached two national robotics championship teams.",
    quote: "We don't teach children what to think — we teach them how to think.",
  },
] as const;

export const TESTIMONIALS = [
  {
    name: "Mr. & Mrs. Obiora",
    relation: "Parents of Zara (P4) & Tobe (P2)",
    quote:
      "Trail Gliders has been a second family for our children. The teachers genuinely care, and our kids have grown not just academically but in confidence and character. We could not have asked for more.",
    rating: 5,
  },
  {
    name: "Barr. Chinwe Anike",
    relation: "Parent of Chidinma (P6 graduate)",
    quote:
      "My daughter gained admission into three top federal colleges. The preparation here is exceptional — but what I value most is the moral foundation she received. She is a Glider for life.",
    rating: 5,
  },
  {
    name: "Engr. Ifeanyi Okeke",
    relation: "Parent of Kamsi (P3)",
    quote:
      "The robotics and coding program is on another level. My son built his first app at age 8 and presented it at the school science fair. Trail Gliders sees the future and prepares our kids for it.",
    rating: 5,
  },
  {
    name: "Dr. Amara Eze",
    relation: "Parent of Adaeze (Nursery 2)",
    quote:
      "The early years team is magical. My daughter literally runs into school every morning. She comes home singing, full of stories, and already reading simple words at age 4.",
    rating: 5,
  },
] as const;

export const ADMISSION_STEPS = [
  {
    step: "01",
    title: "Enquiry & Tour",
    description:
      "Visit our campus or book a virtual tour. Meet the Head of School, walk the classrooms, and feel the Glider spirit in action.",
  },
  {
    step: "02",
    title: "Application Form",
    description:
      "Complete the application form online or in person. Submit the pupil's birth certificate, two recent passports, and last school report (where applicable).",
  },
  {
    step: "03",
    title: "Assessment & Interview",
    description:
      "A friendly, age-appropriate readiness assessment helps us place your child well. Parents meet with our admissions team for a warm conversation.",
  },
  {
    step: "04",
    title: "Offer & Enrollment",
    description:
      "Receive your admission offer within 5 working days. Complete enrollment, pick up the Glider welcome pack, and join the family!",
  },
] as const;

export const NEWS_EVENTS = [
  {
    date: "2026-06-21",
    category: "Event",
    title: "Trail Gliders Annual Sports Day 2026",
    excerpt:
      "Four houses. One spirit. Join us at the Nsukka Township Stadium for a day of athletics, music, and family fun.",
    image: "/images/sports.jpg",
    tag: "Sports",
  },
  {
    date: "2026-07-04",
    category: "News",
    title: "Our Robotics Team Qualifies for Nationals",
    excerpt:
      "The GliderBots placed second at the South-East regional FTC qualifier and now head to Lagos for the national championship.",
    image: "/images/computer-lab.jpg",
    tag: "STEM",
  },
  {
    date: "2026-07-18",
    category: "Event",
    title: "Open Day & Campus Tour",
    excerpt:
      "Prospective families are invited to walk our halls, meet our teachers, and discover what makes a Glider education different.",
    image: "/images/campus.jpg",
    tag: "Admissions",
  },
] as const;

export const FAQS = [
  {
    q: "What are the school's operating hours?",
    a: "The school day runs from 7:30 AM to 3:30 PM, Monday through Friday. After-school clubs run until 4:30 PM. The early years program offers a half-day option ending at 12:30 PM.",
  },
  {
    q: "Do you offer school transport?",
    a: "Yes. Our fleet of GPS-tracked school buses serves Nsukka town, the University of Nigeria campus, and surrounding towns including Enugu-Ezike, Opi, and Obukpa. Routes are reviewed annually.",
  },
  {
    q: "What curriculum do you follow?",
    a: "We follow the Nigerian Universal Basic Education (UBE) curriculum, enriched with Cambridge Primary content for English, Maths, and Science, plus coding, robotics, and creative arts.",
  },
  {
    q: "What is the fee structure?",
    a: "Our fees are competitive and transparent. A detailed fee schedule is shared during the admissions interview. We offer sibling discounts and flexible payment plans for families.",
  },
  {
    q: "When does admission open?",
    a: "Admissions for the new academic session open every January. Mid-year transfers are considered subject to availability. We recommend applying early as classes fill quickly.",
  },
] as const;
