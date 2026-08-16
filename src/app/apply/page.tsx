import { ApplicationForm } from "@/components/ApplicationForm";

export default function ApplyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div className="mb-10">
          <p className="font-sans text-sm font-medium tracking-wide text-navy uppercase mb-3">
            GOP &mdash; Consultant Application
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-ink">
            Apply to join GOP
          </h1>
          <p className="font-sans text-muted mt-3 max-w-xl">
            Tell us about your background, your functional strengths, and
            where you can deliver. Every field below is required unless
            marked optional.
          </p>
        </div>
        <ApplicationForm />
      </div>
    </main>
  );
}
