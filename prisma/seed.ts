/**
 * Seeds the initiative with the scenario from the Claude Design source,
 * expanded to exercise every part of the model.
 *
 *   npm run db:seed        (or npm run db:reset to wipe first)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const PASSWORD = "password123";

const AVATARS = ["#8a3325", "#4d6b3c", "#4f4370", "#7a5b16", "#3d5a6b", "#6b3d5a"];
function avatarColor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return AVATARS[h % AVATARS.length];
}

/** Dates relative to "now" so the seed never goes stale. */
const now = new Date();
const day = 864e5;
const d = (offsetDays: number, hour = 12) => {
  const t = new Date(now.getTime() + offsetDays * day);
  t.setUTCHours(hour, 0, 0, 0);
  return t;
};

async function main() {
  console.log("Clearing existing data…");
  // Order matters: children before parents.
  await db.$transaction([
    db.attendance.deleteMany(),
    db.submission.deleteMany(),
    db.assignment.deleteMany(),
    db.certificate.deleteMany(),
    db.enrollment.deleteMany(),
    db.workshopSession.deleteMany(),
    db.contribution.deleteMany(),
    db.task.deleteMany(),
    db.message.deleteMany(),
    db.meeting.deleteMany(),
    db.announcement.deleteMany(),
    db.resource.deleteMany(),
    db.output.deleteMany(),
    db.application.deleteMany(),
    db.opening.deleteMany(),
    db.projectMember.deleteMany(),
    db.bookmark.deleteMany(),
    db.notification.deleteMany(),
    db.auditLog.deleteMany(),
    db.postingRequest.deleteMany(),
    db.session.deleteMany(),
    db.project.deleteMany(),
    db.workshop.deleteMany(),
    db.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log("Creating people…");
  const people = [
    {
      key: "fares",
      email: "admin@ort.tn",
      name: "Fares Haddad",
      role: "ADMIN",
      canPostProjects: true,
      headline: "Founder",
      affiliation: "Open Research Tunisia",
      city: "Tunis",
      bio: "Started ORT after too many conversations with brilliant students who had no way in.",
      skills: ["Community", "Open science", "Policy"],
      languages: ["Arabic", "French", "English"],
      createdAt: d(-200),
    },
    {
      key: "amine",
      email: "amine@ort.tn",
      name: "Dr. Amine Ncib",
      role: "LEAD",
      canPostProjects: true,
      headline: "Hydrologist",
      affiliation: "Agronomy institute, Tunis",
      city: "Tunis",
      bio: "Works on water resources in North Africa. Convinced that forecasts nobody can read are not forecasts.",
      skills: ["Hydrology", "Remote sensing", "R", "Python"],
      languages: ["Arabic", "French", "English"],
      createdAt: d(-195),
    },
    {
      key: "rim",
      email: "rim@ort.tn",
      name: "Rim Toumi",
      role: "LEAD",
      canPostProjects: true,
      headline: "NLP engineer",
      affiliation: "Computer science school, Manouba",
      city: "Manouba",
      bio: "Building language technology that works for how Tunisians actually write.",
      skills: ["NLP", "Python", "pandas", "Annotation design"],
      languages: ["Arabic", "Derja", "French", "English"],
      github: "https://github.com/",
      createdAt: d(-193),
    },
    {
      key: "sami",
      email: "sami@ort.tn",
      name: "Dr. Sami Kefi",
      role: "LEAD",
      canPostProjects: true,
      headline: "Epidemiologist",
      affiliation: "Medical faculty, Tunis",
      city: "Tunis",
      bio: "Public health researcher. Teaches the academic writing workshop because nobody taught him.",
      skills: ["Epidemiology", "Statistics", "Scientific writing"],
      languages: ["Arabic", "French", "English"],
      createdAt: d(-170),
    },
    {
      key: "khaled",
      email: "khaled@ort.tn",
      name: "Khaled Karoui",
      role: "LEAD",
      canPostProjects: true,
      headline: "Energy engineer",
      affiliation: "Engineering school, Tunis",
      city: "Tunis",
      skills: ["Energy systems", "Feasibility studies", "Data engineering"],
      languages: ["Arabic", "French", "English"],
      createdAt: d(-160),
    },
    {
      key: "yasmine",
      email: "yasmine@ort.tn",
      name: "Yasmine Gharsalli",
      role: "MEMBER",
      headline: "Statistics undergraduate",
      affiliation: "Public university, Tunis",
      city: "Tunis",
      bio: "Third-year statistics student. Joined to find out what research actually looks like day to day.",
      skills: ["Python", "Statistics", "Data cleaning", "R"],
      languages: ["Arabic", "French", "English"],
      createdAt: d(-140),
    },
    {
      key: "mariem",
      email: "mariem@ort.tn",
      name: "Mariem Aouadi",
      role: "MEMBER",
      headline: "Annotation coordinator",
      affiliation: "Humanities faculty, Tunis",
      city: "Tunis",
      skills: ["Linguistics", "Annotation", "Derja", "Quality control"],
      languages: ["Arabic", "Derja", "French"],
      createdAt: d(-120),
    },
    {
      key: "oussama",
      email: "oussama@ort.tn",
      name: "Oussama Jendoubi",
      role: "MEMBER",
      headline: "Geography graduate",
      affiliation: "Humanities faculty, Tunis",
      city: "Sfax",
      skills: ["Literature review", "GIS", "QGIS", "Academic English"],
      languages: ["Arabic", "French", "English"],
      createdAt: d(-115),
    },
    {
      key: "nour",
      email: "nour@ort.tn",
      name: "Nour Landolsi",
      role: "MEMBER",
      headline: "Science writer",
      city: "Sousse",
      skills: ["Science writing", "Editing", "Public communication"],
      languages: ["Arabic", "French", "English"],
      createdAt: d(-110),
    },
    {
      key: "oumaima",
      email: "oumaima@ort.tn",
      name: "Oumaima Nasri",
      role: "MEMBER",
      headline: "CS student",
      affiliation: "Computing institute, Ariana",
      city: "Ariana",
      skills: ["Python", "pandas", "Machine learning"],
      languages: ["Arabic", "French", "English"],
      createdAt: d(-40),
    },
    {
      key: "hamza",
      email: "hamza@ort.tn",
      name: "Hamza Guesmi",
      role: "MEMBER",
      headline: "Medical student",
      affiliation: "Medical faculty, Sousse",
      city: "Sousse",
      skills: ["Academic English", "Literature search", "Clinical reasoning"],
      languages: ["Arabic", "French", "English"],
      createdAt: d(-35),
    },
    {
      key: "ines",
      email: "ines@ort.tn",
      name: "Ines Rekik",
      role: "MEMBER",
      headline: "Linguistics graduate",
      city: "Bizerte",
      skills: ["Linguistics", "Derja", "Transcription"],
      languages: ["Arabic", "Derja", "French"],
      createdAt: d(-30),
    },
    {
      key: "seif",
      email: "seif@ort.tn",
      name: "Seif Ayed",
      role: "MEMBER",
      headline: "Science blogger",
      city: "Tunis",
      skills: ["Science writing", "Public health", "Editing"],
      languages: ["Arabic", "French", "English"],
      createdAt: d(-60),
    },
    {
      key: "leila",
      email: "leila@ort.tn",
      name: "Dr. Leila Mejri",
      role: "MEMBER",
      headline: "Microbiologist",
      affiliation: "Microbiology institute, Tunis",
      city: "Tunis",
      skills: ["Microbiology", "Surveillance", "Epidemiology"],
      languages: ["Arabic", "French", "English"],
      createdAt: d(-20),
    },
    {
      key: "mehdi",
      email: "mehdi@ort.tn",
      name: "Mehdi Khelifi",
      role: "MEMBER",
      headline: "Independent engineer",
      affiliation: "Independent, Sfax",
      city: "Sfax",
      skills: ["IoT", "Sensors", "Air quality", "Electronics"],
      languages: ["Arabic", "French", "English"],
      createdAt: d(-18),
    },
  ] as const;

  const U: Record<string, string> = {};
  for (const p of people) {
    const user = await db.user.create({
      data: {
        email: p.email,
        passwordHash,
        name: p.name,
        role: p.role,
        canPostProjects: "canPostProjects" in p ? !!p.canPostProjects : false,
        headline: p.headline ?? null,
        affiliation: "affiliation" in p ? (p.affiliation ?? null) : null,
        city: p.city ?? null,
        bio: "bio" in p ? (p.bio ?? null) : null,
        skills: JSON.stringify(p.skills ?? []),
        languages: JSON.stringify(p.languages ?? []),
        orcid: null,
        github: "github" in p ? (p.github ?? null) : null,
        avatarColor: avatarColor(p.name),
        cocAcceptedAt: p.createdAt,
        createdAt: p.createdAt,
        emailVerified: true,
      },
    });
    U[p.key] = user.id;
  }

  console.log("Creating workshops…");

  const w1 = await db.workshop.create({
    data: {
      slug: "how-to-read-a-research-paper",
      title: "How to Read a Research Paper",
      summary:
        "A gentle, practical introduction: how papers are structured, how to read them in passes, and how to take notes you'll actually reuse.",
      about:
        "Most people bounce off their first paper because nobody told them papers are not meant to be read front to back. This workshop fixes that in two sessions.\n\nBring any paper you've been meaning to read. We'll dissect one together, live, including the parts the authors would rather you skipped.",
      level: "Beginner",
      outcomes: JSON.stringify([
        "Read a paper in three passes instead of drowning in page one",
        "Tell apart claims, evidence, and speculation",
        "Write literature notes that feed directly into a review",
        "Know when to stop reading a paper",
      ]),
      prerequisites: "None. Curiosity and an hour a week.",
      facilitatorId: U.amine,
      startDate: d(17, 18),
      seats: 40,
      format: "ONLINE",
      language: "English",
      attendanceThreshold: 50,
      status: "OPEN",
      createdAt: d(-30),
      sessions: {
        create: [
          {
            index: 1,
            title: "Anatomy of a paper & the three-pass method",
            description: "Structure, abstract-reading, and how to triage a reading list.",
            scheduledAt: d(17, 18),
            durationMin: 90,
          },
          {
            index: 2,
            title: "Live read-along: we dissect a real paper together",
            description: "A drought-index paper from the Medjerda project, start to finish.",
            scheduledAt: d(24, 18),
            durationMin: 90,
          },
        ],
      },
    },
    include: { sessions: true },
  });

  const w2 = await db.workshop.create({
    data: {
      slug: "python-for-data-analysis-zero-to-pandas",
      title: "Python for Data Analysis: Zero to Pandas",
      summary:
        "Four hands-on sessions taking you from no code to cleaning and exploring a real dataset — the same rainfall data used in the Medjerda project.",
      about:
        "No prior programming required. We install everything together in session one so nobody gets stuck alone at 11pm with a broken PATH.\n\nBy session four you are working on the actual Medjerda rainfall data, and you can join that project's data pod if you want to.",
      level: "Beginner",
      outcomes: JSON.stringify([
        "Set up Python and Jupyter without pain",
        "Load, clean, and reshape tabular data with pandas",
        "Make honest exploratory charts",
        "Contribute to a real project's data pod",
      ]),
      prerequisites: "A laptop you can install software on. That's it.",
      facilitatorId: U.rim,
      startDate: d(11, 18),
      seats: 30,
      format: "ONLINE",
      language: "English",
      attendanceThreshold: 75,
      status: "OPEN",
      createdAt: d(-45),
      sessions: {
        create: [
          {
            index: 1,
            title: "Setup, notebooks, and Python basics",
            scheduledAt: d(11, 18),
            durationMin: 120,
          },
          { index: 2, title: "DataFrames: loading and cleaning", scheduledAt: d(13, 18), durationMin: 120 },
          { index: 3, title: "Grouping, joining, reshaping", scheduledAt: d(18, 18), durationMin: 120 },
          {
            index: 4,
            title: "Project session: the Medjerda rainfall data",
            scheduledAt: d(20, 18),
            durationMin: 120,
          },
        ],
      },
    },
    include: { sessions: true },
  });

  const w3 = await db.workshop.create({
    data: {
      slug: "academic-writing-and-publishing-101",
      title: "Academic Writing & Publishing 101",
      summary:
        "From blank page to submitted manuscript: structure, style, co-authorship norms, and how peer review actually works.",
      level: "Intermediate",
      outcomes: JSON.stringify([
        "Structure a paper around one clear claim",
        "Handle co-authorship and credit conversations early",
        "Navigate journal selection and peer review",
        "Write a public-facing summary of your research",
      ]),
      prerequisites: "You should have some results, or be close to having them.",
      facilitatorId: U.sami,
      startDate: d(45, 18),
      seats: 25,
      format: "HYBRID",
      location: "Faculté de Médecine de Tunis + online",
      language: "English",
      attendanceThreshold: 75,
      status: "OPEN",
      createdAt: d(-20),
      sessions: {
        create: [
          { index: 1, title: "Structure: the shape of a paper", scheduledAt: d(45, 18) },
          { index: 2, title: "Style, clarity, and revision", scheduledAt: d(52, 18) },
          { index: 3, title: "Publishing: journals, review, preprints", scheduledAt: d(59, 18) },
        ],
      },
    },
    include: { sessions: true },
  });

  // A workshop that already ran — so certificates and completed enrolments exist.
  const w0 = await db.workshop.create({
    data: {
      slug: "research-ethics-fundamentals",
      title: "Research Ethics Fundamentals",
      summary:
        "Consent, anonymisation, data protection and authorship ethics — the things that go wrong quietly and expensively.",
      level: "Beginner",
      outcomes: JSON.stringify([
        "Recognise when a project needs ethics review",
        "Anonymise a dataset properly, not superficially",
        "Handle authorship disputes before they become disputes",
      ]),
      facilitatorId: U.sami,
      startDate: d(-40, 18),
      seats: 50,
      format: "ONLINE",
      attendanceThreshold: 50,
      status: "COMPLETED",
      createdAt: d(-70),
      sessions: {
        create: [
          { index: 1, title: "Consent and anonymisation", scheduledAt: d(-40, 18) },
          { index: 2, title: "Authorship, credit, and conflicts", scheduledAt: d(-33, 18) },
        ],
      },
    },
    include: { sessions: true },
  });

  console.log("Creating projects…");

  const p1 = await db.project.create({
    data: {
      slug: "forecasting-water-stress-in-the-medjerda-basin",
      title: "Forecasting Water Stress in the Medjerda Basin",
      summary:
        "Building an open, reproducible model that forecasts seasonal water stress across the Medjerda river basin using satellite and rainfall data.",
      about:
        "The Medjerda basin supplies most of northern Tunisia's irrigation and drinking water, yet seasonal forecasts remain closed or coarse. We are assembling open rainfall, reservoir, and satellite datasets, then training interpretable models that farmers' unions and municipalities can actually use.\n\nContributors work in small pods: data collection, modelling, and literature. No prior research experience is needed for the literature and data pods — the linked Python workshop covers the tooling.",
      area: "Environmental data science",
      stage: "Recruiting",
      tags: JSON.stringify(["Climate", "Machine learning", "GIS"]),
      language: "English",
      commitment: "4–6 hours / week",
      license: "CC-BY-4.0",
      ethicsStatus: "NOT_REQUIRED",
      dataStatement:
        "Rainfall data from the national meteorology office under an open licence; open satellite products. No personal data is collected.",
      leadId: U.amine,
      startedAt: d(-70),
      createdAt: d(-70),
      linkedWorkshopId: w2.id,
      openings: {
        create: [
          { role: "Data analyst", skills: "Python, pandas — workshop available", pod: "Data pod", seats: 2 },
          { role: "GIS contributor", skills: "QGIS or willingness to learn", pod: "GIS pod" },
          {
            role: "Literature reviewer",
            skills: "English reading, note-taking",
            pod: "Literature pod",
            commitment: "2–4 hours / week",
          },
        ],
      },
      members: {
        create: [
          {
            userId: U.amine,
            projectRole: "LEAD",
            roleTitle: "Project lead",
            creditRoles: JSON.stringify([
              "Conceptualization",
              "Methodology",
              "Supervision",
              "Project administration",
            ]),
            authorOrder: 1,
            joinedAt: d(-70),
          },
          {
            userId: U.rim,
            projectRole: "MAINTAINER",
            roleTitle: "Modelling pod",
            pod: "Modelling pod",
            creditRoles: JSON.stringify(["Software", "Formal analysis", "Validation"]),
            authorOrder: 2,
            joinedAt: d(-64),
          },
          {
            userId: U.oussama,
            projectRole: "CONTRIBUTOR",
            roleTitle: "Literature pod",
            pod: "Literature pod",
            creditRoles: JSON.stringify(["Investigation", "Writing – review & editing"]),
            authorOrder: 3,
            joinedAt: d(-50),
          },
          {
            userId: U.yasmine,
            projectRole: "CONTRIBUTOR",
            roleTitle: "Data pod",
            pod: "Data pod",
            creditRoles: JSON.stringify(["Data curation"]),
            authorOrder: 4,
            joinedAt: d(-42),
          },
        ],
      },
    },
    include: { members: true, openings: true },
  });

  const p2 = await db.project.create({
    data: {
      slug: "derja-corpus-open-data-for-tunisian-arabic-nlp",
      title: "Derja Corpus: Open Data for Tunisian Arabic NLP",
      summary:
        "Crowdsourcing and annotating the first large open corpus of written Tunisian Derja, so language technology finally works for how Tunisians actually write.",
      about:
        "Tunisian Arabic is spoken by 12 million people but nearly invisible to language technology. We are collecting public, consented text, building annotation guidelines, and releasing everything under an open licence.\n\nAnnotation is the heart of this project — native speakers with no technical background are our most valuable contributors.",
      area: "Computational linguistics",
      stage: "Active",
      tags: JSON.stringify(["NLP", "Linguistics", "Open data"]),
      commitment: "3–5 hours / week",
      license: "CC-BY-SA-4.0",
      ethicsStatus: "APPROVED",
      ethicsNote: "University research ethics committee, ref. 2026-014",
      dataStatement:
        "Only publicly posted text with an open licence or explicit consent. Usernames and identifiers are stripped before annotation.",
      leadId: U.rim,
      startedAt: d(-160),
      createdAt: d(-160),
      linkedWorkshopId: w1.id,
      openings: {
        create: [
          {
            role: "Annotator (native speaker)",
            skills: "Fluent Derja, attention to detail",
            seats: 5,
            commitment: "2–4 hours / week",
          },
          { role: "Annotation guideline editor", skills: "Writing, linguistics interest" },
        ],
      },
      members: {
        create: [
          {
            userId: U.rim,
            projectRole: "LEAD",
            roleTitle: "Project lead",
            creditRoles: JSON.stringify([
              "Conceptualization",
              "Methodology",
              "Software",
              "Project administration",
            ]),
            authorOrder: 1,
            joinedAt: d(-160),
          },
          {
            userId: U.khaled,
            projectRole: "MAINTAINER",
            roleTitle: "Data engineering",
            creditRoles: JSON.stringify(["Software", "Data curation"]),
            authorOrder: 3,
            joinedAt: d(-150),
          },
          {
            userId: U.mariem,
            projectRole: "MAINTAINER",
            roleTitle: "Annotation coordinator",
            creditRoles: JSON.stringify(["Data curation", "Validation", "Investigation"]),
            authorOrder: 2,
            joinedAt: d(-140),
          },
        ],
      },
    },
    include: { members: true, openings: true },
  });

  const p3 = await db.project.create({
    data: {
      slug: "mapping-type-2-diabetes-prevalence-across-governorates",
      title: "Mapping Type-2 Diabetes Prevalence Across Governorates",
      summary:
        "A governorate-level analysis of diabetes prevalence and care access, aimed at an open-access publication and a public policy brief.",
      about:
        "We combined national health survey microdata with pharmacy density and clinic access indicators to map where diabetes burden and care access diverge. The analysis is done; we are now in the writing phase.\n\nThis is a good project for contributors who want to experience the publishing process end to end: drafting, internal review, journal submission, and a public-facing policy brief.",
      area: "Public health",
      stage: "Writing",
      tags: JSON.stringify(["Epidemiology", "Statistics", "Policy"]),
      commitment: "3–5 hours / week",
      license: "CC-BY-4.0",
      ethicsStatus: "APPROVED",
      ethicsNote: "FMT ethics committee, ref. 2025-221 — secondary analysis of anonymised microdata",
      dataStatement:
        "National health survey microdata used under a data-sharing agreement; only aggregate figures are published.",
      leadId: U.sami,
      startedAt: d(-250),
      createdAt: d(-250),
      linkedWorkshopId: w3.id,
      openings: {
        create: [
          {
            role: "Writing contributor",
            skills: "Clear English prose, science writing interest",
            commitment: "2–4 hours / week",
          },
        ],
      },
      members: {
        create: [
          {
            userId: U.sami,
            projectRole: "LEAD",
            roleTitle: "Project lead",
            creditRoles: JSON.stringify([
              "Conceptualization",
              "Methodology",
              "Supervision",
              "Writing – original draft",
            ]),
            authorOrder: 1,
            joinedAt: d(-250),
          },
          {
            userId: U.nour,
            projectRole: "CONTRIBUTOR",
            roleTitle: "Writing",
            creditRoles: JSON.stringify(["Writing – original draft", "Writing – review & editing"]),
            authorOrder: 2,
            joinedAt: d(-120),
          },
          {
            userId: U.yasmine,
            projectRole: "CONTRIBUTOR",
            roleTitle: "Statistics",
            creditRoles: JSON.stringify(["Formal analysis"]),
            authorOrder: 3,
            joinedAt: d(-90),
          },
        ],
      },
    },
    include: { members: true, openings: true },
  });

  const p4 = await db.project.create({
    data: {
      slug: "low-cost-solar-microgrids-for-rural-schools",
      title: "Low-Cost Solar Microgrids for Rural Schools",
      summary:
        "Scoping a feasibility study for solar microgrids at off-grid rural schools — currently shaping the research question and forming the founding team.",
      about:
        "Early stage: we are defining scope, mapping candidate schools, and reviewing prior feasibility work from Morocco and Jordan. Joining now means shaping the research question itself.",
      area: "Energy engineering",
      stage: "Proposal",
      tags: JSON.stringify(["Energy", "Field study", "Feasibility"]),
      commitment: "Flexible",
      license: "CC-BY-4.0",
      ethicsStatus: "PENDING",
      ethicsNote: "Site visits to schools will require regional education office approval.",
      leadId: U.khaled,
      startedAt: d(-12),
      createdAt: d(-12),
      linkedWorkshopId: w1.id,
      openings: {
        create: [
          {
            role: "Founding contributor",
            skills: "Any background — energy, economics, or fieldwork interest",
            seats: 4,
          },
        ],
      },
      members: {
        create: [
          {
            userId: U.khaled,
            projectRole: "LEAD",
            roleTitle: "Project lead",
            creditRoles: JSON.stringify(["Conceptualization", "Project administration"]),
            authorOrder: 1,
            joinedAt: d(-12),
          },
        ],
      },
    },
    include: { members: true, openings: true },
  });

  console.log("Adding resources, meetings, announcements…");

  await db.resource.createMany({
    data: [
      // p1
      { projectId: p1.id, title: "Literature review — living document", kind: "DOC", version: "v6", description: "maintained by literature pod", url: "https://example.org/medjerda-litreview", visibility: "MEMBERS", uploadedById: U.oussama, createdAt: d(-5) },
      { projectId: p1.id, title: "Drought indices for North Africa (2023) — annotated review", kind: "PDF", version: "v1", description: "annotated", url: "https://example.org/aloui-2023.pdf", visibility: "PUBLIC", uploadedById: U.amine, createdAt: d(-30) },
      { projectId: p1.id, title: "Rainfall dataset 1990–2025 (national met office, cleaned)", kind: "DATA", version: "v3", description: "CSV, 42 MB", url: "https://example.org/rainfall-v3.csv", visibility: "MEMBERS", uploadedById: U.yasmine, createdAt: d(-11) },
      { projectId: p1.id, title: "Kickoff recording — project scope & pods", kind: "VIDEO", version: "v1", description: "48 min", url: "https://example.org/kickoff", visibility: "PUBLIC", uploadedById: U.amine, createdAt: d(-68) },
      { projectId: p1.id, title: "Modelling notebook — baseline SARIMA", kind: "CODE", version: "v2", description: "Colab · modelling pod", url: "https://example.org/notebook", visibility: "TEAM", uploadedById: U.rim, createdAt: d(-9) },
      // p2
      { projectId: p2.id, title: "Annotation guidelines v2.1", kind: "DOC", version: "v2.1", url: "https://example.org/guidelines", visibility: "PUBLIC", uploadedById: U.mariem, createdAt: d(-8) },
      { projectId: p2.id, title: "Corpus snapshot — 84k sentences", kind: "DATA", version: "v4", description: "JSONL, 96 MB", url: "https://example.org/corpus", visibility: "MEMBERS", uploadedById: U.khaled, createdAt: d(-14) },
      { projectId: p2.id, title: "Onboarding video for new annotators", kind: "VIDEO", version: "v1", description: "22 min", url: "https://example.org/onboarding", visibility: "PUBLIC", uploadedById: U.mariem, createdAt: d(-60) },
      // p3
      { projectId: p3.id, title: "Draft manuscript v4 — results section open for comments", kind: "DOC", version: "v4", url: "https://example.org/manuscript", visibility: "TEAM", uploadedById: U.sami, createdAt: d(-4) },
      { projectId: p3.id, title: "Prevalence maps — figures package", kind: "DATA", version: "v2", description: "PNG + GeoJSON", url: "https://example.org/figures", visibility: "MEMBERS", uploadedById: U.yasmine, createdAt: d(-20) },
      { projectId: p3.id, title: "Observational-study reporting checklist", kind: "PDF", version: "v1", description: "Reporting standards", url: "https://example.org/strobe.pdf", visibility: "PUBLIC", uploadedById: U.sami, createdAt: d(-40) },
      // p4
      { projectId: p4.id, title: "Scoping notes — living document", kind: "DOC", version: "v1", url: "https://example.org/scoping", visibility: "PUBLIC", uploadedById: U.khaled, createdAt: d(-11) },
      { projectId: p4.id, title: "Rural electrification — background report", kind: "PDF", version: "v1", description: "Background reading", url: "https://example.org/irena.pdf", visibility: "PUBLIC", uploadedById: U.khaled, createdAt: d(-10) },
      // workshops
      { workshopId: w1.id, title: "How to Read a Paper — a three-pass guide", kind: "PDF", url: "https://example.org/keshav.pdf", visibility: "PUBLIC", uploadedById: U.amine, createdAt: d(-25) },
      { workshopId: w1.id, title: "Note-taking template", kind: "DOC", url: "https://example.org/template", visibility: "MEMBERS", uploadedById: U.amine, createdAt: d(-25) },
      { workshopId: w2.id, title: "Session 1 slides", kind: "SLIDES", url: "https://example.org/slides1", visibility: "MEMBERS", uploadedById: U.rim, createdAt: d(-20) },
      { workshopId: w2.id, title: "Practice dataset — rainfall sample", kind: "DATA", url: "https://example.org/sample.csv", visibility: "MEMBERS", uploadedById: U.rim, createdAt: d(-20) },
      { workshopId: w2.id, title: "Setup guide (Windows / Mac / Linux)", kind: "DOC", url: "https://example.org/setup", visibility: "PUBLIC", uploadedById: U.rim, createdAt: d(-22) },
      { workshopId: w3.id, title: "Writing checklist", kind: "DOC", url: "https://example.org/checklist", visibility: "PUBLIC", uploadedById: U.sami, createdAt: d(-15) },
      { workshopId: w3.id, title: "Anonymized peer-review examples", kind: "PDF", url: "https://example.org/reviews.pdf", visibility: "MEMBERS", uploadedById: U.sami, createdAt: d(-15) },
    ],
  });

  await db.meeting.createMany({
    data: [
      {
        projectId: p1.id,
        title: "Weekly sync #9",
        heldAt: d(-6),
        attendeesCount: 7,
        authorId: U.oussama,
        notes:
          "Baseline model beats climatology by 12%. Decided to add reservoir levels as a feature. GIS pod blocked on shapefile licensing — Amine escalating to the met-office contact.",
        decisions:
          "Add reservoir levels as a model feature\nAmine to resolve shapefile licensing with the met office by next sync\nLiterature pod to summarise 2 more SPI papers",
      },
      {
        projectId: p1.id,
        title: "Weekly sync #8",
        heldAt: d(-13),
        attendeesCount: 6,
        authorId: U.rim,
        notes:
          "Reviewed cleaned rainfall v3. Agreed on train/test split by year. Literature pod to summarize 4 drought-index papers by next week.",
        decisions: "Train/test split by year, not random\nAdopt rainfall v3 as the working dataset",
      },
      {
        projectId: p1.id,
        title: "Data pod working session",
        heldAt: d(-18),
        attendeesCount: 4,
        authorId: U.yasmine,
        notes:
          "Merged station metadata; flagged 11 stations with >20% missing values. Imputation strategy to be decided with the modelling pod.",
        decisions: "Flag and exclude stations above 20% missingness pending a decision",
      },
      {
        projectId: p2.id,
        title: "Annotation quality review",
        heldAt: d(-9),
        attendeesCount: 9,
        authorId: U.mariem,
        notes:
          "Inter-annotator agreement up to 0.81 after the guideline revision. Code-switching cases remain hardest; added 12 new examples to the guidelines.",
        decisions:
          "Guidelines v2.1 is now the reference\nAll annotators redo the calibration set",
      },
      {
        projectId: p3.id,
        title: "Manuscript review round 2",
        heldAt: d(-7),
        attendeesCount: 5,
        authorId: U.nour,
        notes:
          "Discussion section restructured around the access-burden gap. Target journal shortlist narrowed to two open-access options.",
        decisions: "Freeze the results section\nInternal review closes in two weeks",
      },
      {
        projectId: p4.id,
        title: "Scoping call #1",
        heldAt: d(-12),
        attendeesCount: 3,
        authorId: U.khaled,
        notes:
          "Agreed to focus on primary schools in Kasserine and Sidi Bouzid. Next step: contact the regional education office for site data.",
        decisions: "Scope to Kasserine and Sidi Bouzid primary schools",
      },
    ],
  });

  await db.announcement.createMany({
    data: [
      { projectId: p1.id, authorId: U.amine, body: "We're recruiting again! Three roles open — see the panel on the right. Share with anyone curious about climate data.", createdAt: d(-3) },
      { projectId: p1.id, authorId: U.amine, body: "Milestone: baseline forecast model complete. Writeup of methods starts next month — first-time writers welcome to shadow.", createdAt: d(-11) },
      { projectId: p2.id, authorId: U.rim, body: "Corpus passed 84,000 sentences. Thank you to all 23 annotators — next milestone is 100k before the September release.", createdAt: d(-7) },
      { projectId: p3.id, authorId: U.sami, body: "Results section frozen. Internal review closes in two weeks — comments welcome from all members until then.", createdAt: d(-5) },
      { projectId: p4.id, authorId: U.khaled, body: "Project proposal published — founding contributors wanted. Everything is open to discussion at this stage.", createdAt: d(-12) },
    ],
  });

  await db.message.createMany({
    data: [
      { projectId: p1.id, authorId: U.oussama, body: "Uploaded summaries for the two SPI papers to the living doc. The 2023 one has a great methods section we could adapt.", createdAt: d(-2, 18) },
      { projectId: p1.id, authorId: U.amine, body: "Excellent. Modelling pod — let's discuss adopting SPI-3 as a target variable in Friday's sync.", createdAt: d(-2, 20) },
      { projectId: p1.id, authorId: U.rim, body: "Agreed. I'll prep a comparison of SPI-3 vs raw rainfall targets before then.", createdAt: d(-1, 9) },
      { projectId: p1.id, authorId: U.yasmine, body: "Question — for the stations we flagged, do we want to impute or drop them entirely? Happy to write both up.", createdAt: d(-1, 14) },
      { projectId: p2.id, authorId: U.mariem, body: "New annotators: please redo the calibration set after reading guidelines v2.1 — the code-switching rules changed.", createdAt: d(-8, 14) },
      { projectId: p3.id, authorId: U.nour, body: "Figure 3 legend updated per Sami's comments. Anyone else find the governorate labels hard to read at print size?", createdAt: d(-5, 11) },
    ],
  });

  console.log("Adding tasks…");
  await db.task.createMany({
    data: [
      { projectId: p1.id, title: "Summarize the 4 drought-index papers", description: "One paragraph each into the living lit review doc.", pod: "Literature pod", status: "IN_PROGRESS", assigneeId: U.oussama, dueDate: d(5), effort: "M", creditRole: "Investigation", createdById: U.amine, createdAt: d(-13) },
      { projectId: p1.id, title: "Decide imputation strategy for flagged stations", pod: "Data pod", status: "IN_REVIEW", assigneeId: U.yasmine, effort: "M", creditRole: "Data curation", createdById: U.amine, createdAt: d(-16) },
      { projectId: p1.id, title: "Add reservoir levels as a model feature", pod: "Modelling pod", status: "IN_PROGRESS", assigneeId: U.rim, dueDate: d(8), effort: "L", creditRole: "Software", createdById: U.amine, createdAt: d(-6) },
      { projectId: p1.id, title: "Tidy the station metadata table", description: "Consistent column names, documented units. Good way to see how the dataset is put together.", pod: "Data pod", status: "OPEN", goodFirstTask: true, effort: "S", creditRole: "Data curation", createdById: U.amine, createdAt: d(-4) },
      { projectId: p1.id, title: "Write plain-language summaries of 3 figures", description: "Two sentences each, for the eventual policy brief.", pod: "Literature pod", status: "OPEN", goodFirstTask: true, effort: "S", creditRole: "Writing – original draft", createdById: U.amine, createdAt: d(-3) },
      { projectId: p1.id, title: "Clean rainfall dataset to v3", pod: "Data pod", status: "DONE", assigneeId: U.yasmine, effort: "L", creditRole: "Data curation", createdById: U.amine, createdAt: d(-30), completedAt: d(-11) },
      { projectId: p2.id, title: "Redo the calibration set against guidelines v2.1", status: "OPEN", goodFirstTask: true, effort: "S", creditRole: "Validation", createdById: U.mariem, createdAt: d(-8) },
      { projectId: p2.id, title: "Add 12 code-switching examples to the guidelines", status: "DONE", assigneeId: U.mariem, effort: "M", creditRole: "Data curation", createdById: U.rim, createdAt: d(-20), completedAt: d(-9) },
      { projectId: p2.id, title: "Deduplicate the corpus snapshot", status: "IN_PROGRESS", assigneeId: U.khaled, dueDate: d(12), effort: "M", creditRole: "Software", createdById: U.rim, createdAt: d(-10) },
      { projectId: p3.id, title: "Revise the discussion section around the access-burden gap", status: "IN_PROGRESS", assigneeId: U.nour, dueDate: d(6), effort: "L", creditRole: "Writing – original draft", createdById: U.sami, createdAt: d(-7) },
      { projectId: p3.id, title: "Check every figure legend at print size", status: "OPEN", goodFirstTask: true, effort: "S", creditRole: "Visualization", createdById: U.sami, createdAt: d(-5) },
      { projectId: p4.id, title: "Contact the regional education office for site data", status: "OPEN", assigneeId: U.khaled, dueDate: d(4), effort: "M", createdById: U.khaled, createdAt: d(-12) },
      { projectId: p4.id, title: "Summarise the Morocco and Jordan feasibility studies", status: "OPEN", goodFirstTask: true, effort: "M", creditRole: "Investigation", createdById: U.khaled, createdAt: d(-11) },
    ],
  });

  console.log("Adding applications…");
  await db.application.createMany({
    data: [
      { projectId: p1.id, userId: U.oumaima, roleApplied: "Data analyst", motivation: "I'm a 3rd-year CS student and I finished the Python workshop last cohort. I want to work on something where the data is messy and real, not a Kaggle set. I can do 5–8 hours a week.", skills: "Python, pandas, scikit-learn", availability: "5–8 hours", status: "PENDING", createdAt: d(-4) },
      { projectId: p1.id, userId: U.hamza, roleApplied: "Literature reviewer", motivation: "Medical student with strong academic English. I want research exposure before residency applications, and reading widely is the part I'm already good at.", skills: "Academic English, literature search, PubMed", availability: "2–4 hours", cvUrl: "https://example.org/hamza-cv", status: "PENDING", createdAt: d(-2) },
      { projectId: p2.id, userId: U.ines, roleApplied: "Annotator (native speaker)", motivation: "Linguistics graduate and native Derja speaker from Bizerte. I've done transcription work before and I'm genuinely detail-obsessed about orthography variants.", skills: "Linguistics, Derja, transcription", availability: "5–8 hours", status: "PENDING", createdAt: d(-6) },
      { projectId: p3.id, userId: U.seif, roleApplied: "Writing contributor", motivation: "Science blogger — I've published two popular articles on public health. I want to learn how the academic version of the same work is written.", skills: "Science writing, editing", availability: "2–4 hours", status: "ACCEPTED", decidedById: U.sami, decidedAt: d(-25), decisionNote: "Welcome — start with the reporting-checklist walkthrough in Resources.", createdAt: d(-30) },
    ],
  });
  // Seif was accepted, so he is on the team.
  await db.projectMember.create({
    data: {
      projectId: p3.id,
      userId: U.seif,
      projectRole: "CONTRIBUTOR",
      roleTitle: "Writing contributor",
      creditRoles: JSON.stringify(["Writing – review & editing"]),
      authorOrder: 4,
      joinedAt: d(-25),
    },
  });

  console.log("Adding posting-rights requests…");
  await db.postingRequest.createMany({
    data: [
      { userId: U.leila, proposal: "Antibiotic resistance surveillance in community pharmacies", motivation: "I run a microbiology group at a public research institute. We have a surveillance protocol but no capacity to do the data collection at scale — this is exactly the kind of work motivated students can do well with supervision.", status: "PENDING", createdAt: d(-6) },
      { userId: U.mehdi, proposal: "Open air-quality sensor network for Sfax", motivation: "Independent engineer. I've built and deployed 8 low-cost PM2.5 sensors around Sfax at my own expense. I'd like to turn it into an open dataset with a proper methodology and more people building units.", status: "PENDING", createdAt: d(-3) },
    ],
  });

  console.log("Adding enrolments, attendance, certificates…");

  // The completed ethics workshop — everyone attended, certificates issued.
  const ethicsLearners = [U.yasmine, U.oussama, U.nour, U.mariem, U.seif];
  for (const userId of ethicsLearners) {
    await db.enrollment.create({
      data: { workshopId: w0.id, userId, status: "COMPLETED", enrolledAt: d(-60), completedAt: d(-33) },
    });
    for (const s of w0.sessions) {
      await db.attendance.create({ data: { sessionId: s.id, userId, present: true, markedAt: s.scheduledAt } });
    }
    await db.certificate.create({
      data: {
        code: `ORT-${Math.random().toString(36).slice(2, 7).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        userId,
        workshopId: w0.id,
        title: w0.title,
        issuedAt: d(-32),
      },
    });
  }

  // Upcoming workshops — a mix of enrolled and waitlisted.
  const w2Learners = [U.yasmine, U.oumaima, U.oussama, U.hamza, U.ines, U.seif, U.nour];
  for (const [i, userId] of w2Learners.entries()) {
    await db.enrollment.create({
      data: {
        workshopId: w2.id,
        userId,
        status: "ENROLLED",
        motivation: i === 0 ? "I want to join the Medjerda data pod." : "",
        enrolledAt: d(-20 + i),
      },
    });
  }
  for (const userId of [U.hamza, U.ines, U.nour]) {
    await db.enrollment.create({ data: { workshopId: w1.id, userId, status: "ENROLLED", enrolledAt: d(-10) } });
  }
  for (const userId of [U.nour, U.seif, U.yasmine]) {
    await db.enrollment.create({ data: { workshopId: w3.id, userId, status: "ENROLLED", enrolledAt: d(-8) } });
  }

  console.log("Adding assignments…");
  const a1 = await db.assignment.create({
    data: {
      workshopId: w2.id,
      sessionId: w2.sessions[1].id,
      title: "Load and clean the rainfall sample",
      description:
        "Load the practice dataset, drop the duplicate station rows, convert the date column, and report how many rows you lost and why. Paste your notebook link.",
      dueDate: d(15),
      maxPoints: 100,
    },
  });
  await db.assignment.create({
    data: {
      workshopId: w2.id,
      sessionId: w2.sessions[2].id,
      title: "Monthly means by station",
      description: "Group by station and month, compute the mean, and plot one station of your choice.",
      dueDate: d(19),
      maxPoints: 100,
    },
  });
  await db.submission.create({
    data: {
      assignmentId: a1.id,
      userId: U.yasmine,
      body: "Lost 214 rows: 190 exact duplicates and 24 rows with an unparseable date (they used DD/MM/YY without a century).",
      url: "https://example.org/yasmine-notebook",
      submittedAt: d(-1),
      grade: 92,
      feedback: "Good catch on the century-ambiguous dates — most people silently coerce those. Next time state what you did with them.",
      gradedById: U.rim,
      gradedAt: d(0),
    },
  });
  await db.submission.create({
    data: {
      assignmentId: a1.id,
      userId: U.oumaima,
      body: "Dropped 190 duplicates. Date parsing worked with dayfirst=True.",
      url: "https://example.org/oumaima-notebook",
      submittedAt: d(0),
    },
  });

  console.log("Adding contributions & outputs…");
  await db.contribution.createMany({
    data: [
      { userId: U.yasmine, projectId: p1.id, text: "Wrote meeting notes for the data pod working session", type: "NOTES", creditRole: "Project administration", occurredAt: d(-18) },
      { userId: U.yasmine, projectId: p1.id, text: "Cleaned station metadata and flagged missing-value issues (rainfall v3)", type: "DATA", creditRole: "Data curation", occurredAt: d(-11) },
      { userId: U.yasmine, projectId: p3.id, text: "Reviewed two literature summaries for the diabetes mapping project", type: "REVIEW", creditRole: "Validation", occurredAt: d(-21) },
      { userId: U.yasmine, workshopId: w0.id, text: "Completed “Research Ethics Fundamentals” — certificate earned", type: "WORKSHOP", occurredAt: d(-32) },
      { userId: U.yasmine, projectId: p3.id, text: "Merged the governorate-level pharmacy density table", type: "DATA", creditRole: "Formal analysis", occurredAt: d(-33) },
      { userId: U.oussama, projectId: p1.id, text: "Summarised two SPI drought-index papers into the living review", type: "REVIEW", creditRole: "Investigation", occurredAt: d(-2) },
      { userId: U.oussama, projectId: p1.id, text: "Wrote meeting notes for weekly sync #9", type: "NOTES", creditRole: "Project administration", occurredAt: d(-6) },
      { userId: U.rim, projectId: p1.id, text: "Built the baseline SARIMA model and evaluation harness", type: "CODE", creditRole: "Software", occurredAt: d(-15) },
      { userId: U.mariem, projectId: p2.id, text: "Revised annotation guidelines to v2.1 with code-switching rules", type: "DATA", creditRole: "Data curation", occurredAt: d(-9) },
      { userId: U.mariem, projectId: p2.id, text: "Ran the inter-annotator agreement review (0.81)", type: "REVIEW", creditRole: "Validation", occurredAt: d(-9) },
      { userId: U.khaled, projectId: p2.id, text: "Built the corpus ingestion and anonymisation pipeline", type: "CODE", creditRole: "Software", occurredAt: d(-40) },
      { userId: U.nour, projectId: p3.id, text: "Restructured the discussion section around the access-burden gap", type: "WRITING", creditRole: "Writing – original draft", occurredAt: d(-7) },
      { userId: U.seif, projectId: p3.id, text: "Copy-edited the introduction and methods sections", type: "WRITING", creditRole: "Writing – review & editing", occurredAt: d(-14) },
      { userId: U.amine, projectId: p1.id, text: "Negotiated open access to the met office’s rainfall records", type: "ADMIN", creditRole: "Resources", occurredAt: d(-55) },
      { userId: U.sami, projectId: p3.id, text: "Drafted the full first version of the manuscript", type: "WRITING", creditRole: "Writing – original draft", occurredAt: d(-60) },
    ],
  });

  await db.output.createMany({
    data: [
      {
        projectId: p2.id,
        title: "The Derja Corpus: an open dataset of written Tunisian Arabic",
        type: "DATASET",
        status: "PUBLISHED",
        url: "https://example.org/derja-corpus",
        doi: "10.5281/zenodo.0000001",
        license: "CC-BY-SA-4.0",
        venue: "Zenodo",
        authorsLine: "Rim Toumi, Mariem Aouadi, Khaled Karoui",
        publishedAt: d(-45),
        createdAt: d(-50),
      },
      {
        projectId: p2.id,
        title: "Annotation guidelines for written Tunisian Derja, v2.1",
        type: "REPORT",
        status: "PUBLISHED",
        url: "https://example.org/derja-guidelines",
        license: "CC-BY-4.0",
        authorsLine: "Mariem Aouadi, Rim Toumi",
        publishedAt: d(-8),
        createdAt: d(-8),
      },
      {
        projectId: p3.id,
        title: "Governorate-level type-2 diabetes prevalence and care access in Tunisia",
        type: "PAPER",
        status: "UNDER_REVIEW",
        license: "CC-BY-4.0",
        venue: "PLOS Global Public Health",
        authorsLine: "Dr. Sami Kefi, Nour Landolsi, Yasmine Gharsalli, Seif Ayed",
        createdAt: d(-10),
      },
      {
        projectId: p3.id,
        title: "Where diabetes burden and care access diverge — a policy brief",
        type: "POLICY_BRIEF",
        status: "DRAFT",
        license: "CC-BY-4.0",
        authorsLine: "Nour Landolsi, Dr. Sami Kefi",
        createdAt: d(-6),
      },
      {
        projectId: p1.id,
        title: "Baseline seasonal water-stress forecasts for the Medjerda basin",
        type: "PREPRINT",
        status: "DRAFT",
        license: "CC-BY-4.0",
        authorsLine: "Dr. Amine Ncib, Rim Toumi, Oussama Jendoubi, Yasmine Gharsalli",
        createdAt: d(-3),
      },
    ],
  });

  console.log("Adding notifications…");
  await db.notification.createMany({
    data: [
      { userId: U.amine, type: "APPLICATION", title: "New application to Forecasting Water Stress in the Medjerda Basin", body: "Oumaima Nasri applied for Data analyst.", link: `/projects/${p1.slug}?tab=applications`, createdAt: d(-4) },
      { userId: U.amine, type: "APPLICATION", title: "New application to Forecasting Water Stress in the Medjerda Basin", body: "Hamza Guesmi applied for Literature reviewer.", link: `/projects/${p1.slug}?tab=applications`, createdAt: d(-2) },
      { userId: U.rim, type: "APPLICATION", title: "New application to Derja Corpus", body: "Ines Rekik applied for Annotator (native speaker).", link: `/projects/${p2.slug}?tab=applications`, createdAt: d(-6) },
      { userId: U.fares, type: "POSTING_REQUEST", title: "New posting-rights request", body: "Dr. Leila Mejri would like to post: “Antibiotic resistance surveillance in community pharmacies”", link: "/admin?tab=posters", createdAt: d(-6) },
      { userId: U.fares, type: "POSTING_REQUEST", title: "New posting-rights request", body: "Mehdi Khelifi would like to post: “Open air-quality sensor network for Sfax”", link: "/admin?tab=posters", createdAt: d(-3) },
      { userId: U.yasmine, type: "GRADE", title: "Feedback on Load and clean the rainfall sample", body: "Rim Toumi reviewed your submission.", link: `/workshops/${w2.slug}?tab=assignments`, read: false, createdAt: d(0) },
      { userId: U.yasmine, type: "ANNOUNCEMENT", title: "Announcement — Forecasting Water Stress in the Medjerda Basin", body: "We're recruiting again! Three roles open.", link: `/projects/${p1.slug}`, read: true, createdAt: d(-3) },
      { userId: U.oumaima, type: "ENROLLMENT", title: "You're enrolled: Python for Data Analysis", body: "Session links and materials appear on the workshop page.", link: `/workshops/${w2.slug}`, read: true, createdAt: d(-19) },
    ],
  });

  await db.auditLog.createMany({
    data: [
      { actorId: U.fares, action: "USER_ROLE", targetType: "User", targetId: U.amine, meta: "LEAD", createdAt: d(-195) },
      { actorId: U.fares, action: "USER_ROLE", targetType: "User", targetId: U.rim, meta: "LEAD", createdAt: d(-193) },
      { actorId: U.amine, action: "PROJECT_CREATE", targetType: "Project", targetId: p1.id, meta: p1.title, createdAt: d(-70) },
      { actorId: U.rim, action: "PROJECT_CREATE", targetType: "Project", targetId: p2.id, meta: p2.title, createdAt: d(-160) },
      { actorId: U.sami, action: "APPLICATION_ACCEPTED", targetType: "Application", targetId: "seed", meta: "Seif Ayed", createdAt: d(-25) },
      { actorId: U.sami, action: "CERTIFICATES_ISSUED", targetType: "Workshop", targetId: w0.id, meta: "5", createdAt: d(-32) },
      { actorId: U.khaled, action: "PROJECT_CREATE", targetType: "Project", targetId: p4.id, meta: p4.title, createdAt: d(-12) },
    ],
  });

  await db.bookmark.createMany({
    data: [
      { userId: U.yasmine, projectId: p4.id },
      { userId: U.yasmine, workshopId: w3.id },
    ],
  });

  const counts = {
    users: await db.user.count(),
    projects: await db.project.count(),
    workshops: await db.workshop.count(),
    tasks: await db.task.count(),
    contributions: await db.contribution.count(),
  };

  console.log("\n✓ Seed complete:", counts);
  console.log(`\n  Sign in with any of these — password: ${PASSWORD}`);
  console.log("    admin@ort.tn      Fares Haddad        (admin)");
  console.log("    amine@ort.tn      Dr. Amine Ncib  (project lead, 2 pending applications)");
  console.log("    rim@ort.tn        Rim Toumi         (lead + workshop facilitator)");
  console.log("    yasmine@ort.tn    Yasmine Gharsalli  (contributor, has a certificate)");
  console.log("    oumaima@ort.tn    Oumaima Nasri     (applicant awaiting a decision)\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
