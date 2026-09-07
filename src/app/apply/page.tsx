import { ApplicationForm } from "@/components/ApplicationForm";

export const metadata = {
  title: "Apply to join GOP",
  description:
    "Application for operators joining Growth Operating Partners as delivery consultants.",
};

// One container width shared by the header and the form body so the contents
// rail, the rules and the title all sit on the same left edge.
const SHELL = "mx-auto w-full max-w-[100rem] px-5 sm:px-8 lg:px-12 2xl:px-16";

export default function ApplyPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-hairline">
        <div className={`${SHELL} py-10 lg:py-16`}>
          {/* Title and intro share the top line on wide screens rather than
              stacking and leaving the right half of the header empty. */}
          <div className="lg:flex lg:items-end lg:justify-between lg:gap-20">
            <h1 className="max-w-[16ch] font-display text-[2.25rem] leading-[1.08] text-ink sm:text-[2.75rem] lg:text-5xl">
              Apply to join GOP
            </h1>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-muted lg:mt-0 lg:shrink-0">
              Eight sections covering your background, where you go deep, and the work you have
              actually shipped. It takes about twenty minutes and we read all of it.
            </p>
          </div>
        </div>
      </header>

      <div className={`${SHELL} pb-24 pt-8 lg:pt-14`}>
        <ApplicationForm />
      </div>
    </main>
  );
}
