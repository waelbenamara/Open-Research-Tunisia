import Link from "next/link";
import { dropEnrollmentAction, enrollAction } from "@/actions/workshops";
import { Card, Pill } from "@/components/ui";

export function EnrollPanel({
  workshopId,
  slug,
  startDate,
  status,
  signedIn,
  seatsLeft,
  certificateEnabled,
}: {
  workshopId: string;
  slug: string;
  startDate: string;
  status: string | null;
  signedIn: boolean;
  seatsLeft: number;
  certificateEnabled: boolean;
}) {
  const heading = "font-serif text-[19px] font-medium mb-1.5";
  const sub = "text-[13.5px] leading-[1.55] text-ink-4 mb-4";

  if (!signedIn) {
    return (
      <Card className="p-6">
        <div className={heading}>Enroll — it&apos;s free</div>
        <div className={sub}>
          Starts {startDate}. Live sessions, recorded for enrollees.
          {certificateEnabled ? " Certificate on completion." : ""}
        </div>
        <Link
          href={`/login?next=/workshops/${slug}`}
          className="block w-full bg-brick px-4 py-3 text-center text-[14px] font-semibold no-underline hover:bg-brick-dark hover:no-underline"
          style={{ color: "#faf8f3" }}
        >
          Sign in to enroll
        </Link>
      </Card>
    );
  }

  if (status === "ENROLLED" || status === "COMPLETED") {
    return (
      <Card className="p-6">
        <div className={heading}>
          {status === "COMPLETED" ? "You completed this workshop" : "You're enrolled ✓"}
        </div>
        <div className={sub}>
          {status === "COMPLETED"
            ? "Your certificate and attendance record are on your profile."
            : `Session links and recordings appear under Sessions. First session: ${startDate}.`}
        </div>
        <div className="flex items-center gap-3">
          <Pill bg="#e4ecdb" fg="#3e5730">
            {status === "COMPLETED" ? "Completed" : "Enrolled"}
          </Pill>
          {status === "ENROLLED" ? (
            <form action={dropEnrollmentAction}>
              <input type="hidden" name="workshopId" value={workshopId} />
              <button
                type="submit"
                className="cursor-pointer border-none bg-transparent p-0 text-[12.5px] text-muted hover:text-brick"
              >
                Drop out
              </button>
            </form>
          ) : null}
        </div>
      </Card>
    );
  }

  if (status === "WAITLIST") {
    return (
      <Card className="p-6">
        <div className={heading}>You&apos;re on the waitlist</div>
        <div className={sub}>
          The workshop is full. If someone drops, the first person on the waitlist is enrolled
          automatically — you&apos;ll get a notification.
        </div>
        <Pill bg="#f4ead2" fg="#7a5b16">
          Waitlisted
        </Pill>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className={heading}>{seatsLeft > 0 ? "Enroll — it's free" : "Join the waitlist"}</div>
      <div className={sub}>
        Starts {startDate}.{" "}
        {seatsLeft > 0
          ? `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left. Live sessions, recorded for enrollees.`
          : "All seats are taken, but waitlisted learners are enrolled automatically when someone drops."}
        {certificateEnabled ? " Certificate on completion." : ""}
      </div>
      <form action={enrollAction}>
        <input type="hidden" name="workshopId" value={workshopId} />
        <button
          type="submit"
          className="w-full cursor-pointer border-none bg-brick px-4 py-3 text-[14px] font-semibold hover:bg-brick-dark"
          style={{ color: "#faf8f3" }}
        >
          {seatsLeft > 0 ? "Enroll now" : "Join waitlist"}
        </button>
      </form>
    </Card>
  );
}
