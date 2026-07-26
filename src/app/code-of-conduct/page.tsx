export const metadata = {
  title: "Code of conduct",
  description: "The rules everyone at Open Research Tunisia agrees to.",
};

const SECTIONS: [string, string[]][] = [
  [
    "Everyone is here to learn",
    [
      "Assume the person asking a basic question is exactly who this initiative was built for.",
      "No condescension about someone's institution, degree, French, English, or background. None.",
      "If you know something, explain it. Gatekeeping is the problem we are trying to solve.",
    ],
  ],
  [
    "Be honest about the work",
    [
      "Report what the data actually shows, including null and inconvenient results.",
      "Never fabricate, selectively omit, or quietly reshape an analysis to reach a conclusion.",
      "Say when you are unsure. Uncertainty stated openly is worth more than false confidence.",
      "If you find an error in published work — yours or someone else's — raise it. Corrections are normal science.",
    ],
  ],
  [
    "Credit is not negotiable after the fact",
    [
      "Contributions are logged as they happen, against CRediT roles, visible to the whole team.",
      "Authorship discussions happen early and in the open, not the week before submission.",
      "Nobody is added as an author for their title alone, and nobody is dropped for lacking one.",
      "Data, code and text produced here are shared under the project's stated licence.",
    ],
  ],
  [
    "Respect people's time",
    [
      "If you commit to hours, keep them, or say early that you can't. Silence is the costly option.",
      "Project leads: review applications within two weeks. Leaving people waiting is a real harm.",
      "Meetings have notes. Decisions get written down. Nobody should have to attend to stay informed.",
    ],
  ],
  [
    "Research ethics",
    [
      "Any project involving human subjects, health data, or identifiable information declares its ethics status before recruiting.",
      "Never upload personal or identifiable data to a shared resource. Anonymise first, always.",
      "Respect the licence and terms of every dataset you bring in.",
    ],
  ],
  [
    "Harassment",
    [
      "Harassment, discrimination, and sexual attention where it isn't wanted end participation here. There is no version of this that is tolerated.",
      "This applies in project discussions, workshops, meetings, and anywhere people are here on behalf of the initiative.",
    ],
  ],
];

export default function CodeOfConductPage() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 sm:px-8 pb-24 pt-16">
      <div className="eyebrow mb-2.5" style={{ color: "#8a3325" }}>
        Community standards
      </div>
      <h1 className="font-serif text-[36px] font-medium leading-tight balance">Code of conduct</h1>
      <p className="mt-4 max-w-[60ch] text-[16px] leading-[1.7] text-ink-3 pretty">
        Short, and we mean all of it. Every member agrees to this at sign-up. Breaking it can mean
        removal from a project or from the initiative.
      </p>

      <div className="mt-11 flex flex-col gap-10">
        {SECTIONS.map(([title, rules]) => (
          <section key={title}>
            <h2 className="font-serif text-[23px] font-medium">{title}</h2>
            <ul className="mt-3.5 flex flex-col gap-2.5">
              {rules.map((r) => (
                <li key={r} className="flex gap-3.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-brick" />
                  <span className="text-[15px] leading-[1.65] text-ink-2 pretty">{r}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-line pt-7">
        <h2 className="font-serif text-[20px] font-medium">Reporting</h2>
        <p className="mt-2 max-w-[60ch] text-[14.5px] leading-[1.65] text-ink-3 pretty">
          Contact any administrator directly, or write to{" "}
          <a href="mailto:conduct@openresearch.tn">conduct@openresearch.tn</a>. Reports are handled
          confidentially. You will never be penalised for raising one in good faith, and you may
          report on someone else&apos;s behalf.
        </p>
      </div>
    </div>
  );
}
